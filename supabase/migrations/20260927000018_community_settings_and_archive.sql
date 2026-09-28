-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000018
-- FEATURE 18: COMMUNITY SETTINGS & ARCHIVE LIFECYCLE (SERVER-ENFORCED SECURITY)
-- ==============================================================================

-- 1. Add settings JSONB column to public.communities
ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
    "membership_rules": {
      "auto_approve": true,
      "allow_code_join": true,
      "require_institutional_email": false,
      "allowed_email_domain": ""
    },
    "points_rules": {
      "task_completion": 50,
      "event_attendance": 25,
      "peer_contribution": 30,
      "project_collaboration": 100
    },
    "events_defaults": {
      "default_duration_minutes": 60,
      "registration_required": true,
      "default_capacity": 100,
      "auto_create_meet": true
    },
    "notifications": {
      "broadcast_announcements": true,
      "task_alerts": true,
      "event_reminders": true,
      "peer_contributions": true
    },
    "analytics_tracking": true
  }'::jsonb NOT NULL;

-- 2. Stored Procedure: Update Community Settings (Server-enforced manager guard)
CREATE OR REPLACE FUNCTION public.update_community_settings(
  p_community_id UUID,
  p_identity JSONB DEFAULT NULL,
  p_settings JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_comm RECORD;
  v_current_settings JSONB;
  v_merged_settings JSONB;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify community exists
  SELECT * INTO v_comm
  FROM public.communities
  WHERE id = p_community_id;

  IF v_comm.id IS NULL THEN
    RAISE EXCEPTION 'Community not found';
  END IF;

  -- Server-side security check: Community Manager or Platform Admin only
  IF NOT (public.is_community_manager(p_community_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Access denied: Only authorized community managers can update settings';
  END IF;

  -- Update identity fields if provided
  IF p_identity IS NOT NULL THEN
    UPDATE public.communities
    SET
      name = COALESCE(p_identity->>'name', name),
      short_name = COALESCE(p_identity->>'short_name', short_name),
      institution = COALESCE(p_identity->>'institution', institution),
      institution_name = COALESCE(p_identity->>'institution', p_identity->>'institution_name', institution_name),
      city = COALESCE(p_identity->>'city', city),
      description = COALESCE(p_identity->>'description', description),
      logo_url = CASE
        WHEN p_identity ? 'logo_url' THEN p_identity->>'logo_url'
        ELSE logo_url
      END,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_community_id;
  END IF;

  -- Update settings JSONB if provided
  IF p_settings IS NOT NULL THEN
    SELECT COALESCE(settings, '{}'::jsonb) INTO v_current_settings
    FROM public.communities
    WHERE id = p_community_id;

    v_merged_settings := v_current_settings || p_settings;

    UPDATE public.communities
    SET
      settings = v_merged_settings,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_community_id;
  END IF;

  -- Log manager activity
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description
  ) VALUES (
    p_community_id,
    v_caller_id,
    'community_settings_updated',
    'Community manager updated chapter configuration and rules.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'community_id', p_community_id,
    'message', 'Community settings updated successfully'
  );
END;
$$;

-- 3. Stored Procedure: Rotate / Generate Community Join Code (Server-enforced)
CREATE OR REPLACE FUNCTION public.rotate_community_join_code(
  p_community_id UUID,
  p_custom_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_comm RECORD;
  v_new_code TEXT;
  v_random_num INTEGER;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_comm
  FROM public.communities
  WHERE id = p_community_id;

  IF v_comm.id IS NULL THEN
    RAISE EXCEPTION 'Community not found';
  END IF;

  IF NOT (public.is_community_manager(p_community_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Access denied: Only authorized community managers can rotate join codes';
  END IF;

  -- Generate clean new code if not provided
  IF p_custom_code IS NOT NULL AND length(trim(p_custom_code)) >= 4 THEN
    v_new_code := upper(trim(p_custom_code));
  ELSE
    v_random_num := floor(1000 + random() * 9000)::INTEGER;
    v_new_code := upper(COALESCE(v_comm.short_name, 'AWS')) || '-AWS-' || v_random_num;
  END IF;

  -- Deactivate previous codes
  UPDATE public.community_codes
  SET
    is_active = false,
    active = false
  WHERE community_id = p_community_id;

  -- Insert new active code
  INSERT INTO public.community_codes (
    community_id,
    code,
    is_active,
    active,
    created_by
  ) VALUES (
    p_community_id,
    v_new_code,
    true,
    true,
    v_caller_id
  );

  -- Log activity
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description
  ) VALUES (
    p_community_id,
    v_caller_id,
    'join_code_rotated',
    'Community manager generated a new join code: ' || v_new_code
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', v_new_code,
    'message', 'Join code successfully rotated and activated'
  );
END;
$$;

-- 4. Stored Procedure: Archive Community (Safe deactivation, NO physical deletion)
CREATE OR REPLACE FUNCTION public.archive_community(
  p_community_id UUID,
  p_confirm_short_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_comm RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_comm
  FROM public.communities
  WHERE id = p_community_id;

  IF v_comm.id IS NULL THEN
    RAISE EXCEPTION 'Community not found';
  END IF;

  -- Strict server-side permission check
  IF NOT (public.is_community_manager(p_community_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Access denied: Only authorized community managers can archive this community';
  END IF;

  -- Require explicit confirmation by matching short_name or name
  IF lower(trim(p_confirm_short_name)) != lower(trim(v_comm.short_name))
     AND lower(trim(p_confirm_short_name)) != lower(trim(v_comm.name)) THEN
    RAISE EXCEPTION 'Confirmation mismatch. You must enter the exact chapter short name to confirm archiving.';
  END IF;

  -- Soft archive: update is_active to false (DO NOT physically delete data)
  UPDATE public.communities
  SET
    is_active = false,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_community_id;

  -- Deactivate active join codes so no new members can enter
  UPDATE public.community_codes
  SET
    is_active = false,
    active = false
  WHERE community_id = p_community_id;

  -- Log critical security action
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description
  ) VALUES (
    p_community_id,
    v_caller_id,
    'community_archived',
    'Community was securely archived by community manager.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'community_id', p_community_id,
    'is_active', false,
    'message', 'Community has been securely archived. All historical records have been preserved.'
  );
END;
$$;
