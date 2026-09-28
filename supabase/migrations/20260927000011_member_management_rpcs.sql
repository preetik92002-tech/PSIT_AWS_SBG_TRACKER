-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000011
-- MEMBER MANAGEMENT RPCS: PROMOTE, DEMOTE, REMOVE
-- ==============================================================================

-- 1. Promote member to manager
CREATE OR REPLACE FUNCTION public.promote_community_member(
  p_community_id UUID,
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_mgr BOOLEAN;
  v_target_name TEXT;
  v_caller_name TEXT;
BEGIN
  -- Verify caller authority
  SELECT (public.is_community_manager(p_community_id) OR public.is_admin()) INTO v_is_mgr;
  IF NOT v_is_mgr THEN
    RAISE EXCEPTION 'Unauthorized: Only community managers can promote members';
  END IF;

  -- Ensure target is not caller themselves (prevent self-elevation if not manager)
  IF auth.uid() = p_target_user_id THEN
    -- A manager promoting themselves is redundant
    NULL;
  END IF;

  -- Check if target user is in the community
  IF NOT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id AND user_id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'Target user is not a member of this community';
  END IF;

  -- Update role to manager
  UPDATE public.community_members
  SET role = 'manager', updated_at = now()
  WHERE community_id = p_community_id AND user_id = p_target_user_id;

  -- Fetch target and caller names for audit log
  SELECT COALESCE(full_name, email, 'Community Member') INTO v_target_name
  FROM public.profiles WHERE id = p_target_user_id;

  SELECT COALESCE(full_name, email, 'Community Manager') INTO v_caller_name
  FROM public.profiles WHERE id = auth.uid();

  -- Write activity/audit event
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    p_community_id,
    auth.uid(),
    'role changed',
    format('%s promoted %s to Community Manager', v_caller_name, v_target_name),
    jsonb_build_object(
      'action', 'promote',
      'target_user_id', p_target_user_id,
      'new_role', 'manager',
      'changed_by', auth.uid()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'community_id', p_community_id,
    'user_id', p_target_user_id,
    'new_role', 'manager'
  );
END;
$$;

-- 2. Demote manager to member
CREATE OR REPLACE FUNCTION public.demote_community_member(
  p_community_id UUID,
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_mgr BOOLEAN;
  v_target_name TEXT;
  v_caller_name TEXT;
  v_creator_id UUID;
BEGIN
  -- Verify caller authority
  SELECT (public.is_community_manager(p_community_id) OR public.is_admin()) INTO v_is_mgr;
  IF NOT v_is_mgr THEN
    RAISE EXCEPTION 'Unauthorized: Only community managers can demote managers';
  END IF;

  -- Protect original creator from demotion
  SELECT manager_id INTO v_creator_id
  FROM public.communities
  WHERE id = p_community_id;

  IF v_creator_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot demote the primary chapter founder';
  END IF;

  -- Update role to member
  UPDATE public.community_members
  SET role = 'member', updated_at = now()
  WHERE community_id = p_community_id AND user_id = p_target_user_id;

  -- Fetch names
  SELECT COALESCE(full_name, email, 'Community Member') INTO v_target_name
  FROM public.profiles WHERE id = p_target_user_id;

  SELECT COALESCE(full_name, email, 'Community Manager') INTO v_caller_name
  FROM public.profiles WHERE id = auth.uid();

  -- Write activity/audit event
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    p_community_id,
    auth.uid(),
    'role changed',
    format('%s demoted %s to Community Member', v_caller_name, v_target_name),
    jsonb_build_object(
      'action', 'demote',
      'target_user_id', p_target_user_id,
      'new_role', 'member',
      'changed_by', auth.uid()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'community_id', p_community_id,
    'user_id', p_target_user_id,
    'new_role', 'member'
  );
END;
$$;

-- 3. Remove member from community (does NOT delete user auth account)
CREATE OR REPLACE FUNCTION public.remove_community_member(
  p_community_id UUID,
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_mgr BOOLEAN;
  v_target_name TEXT;
  v_caller_name TEXT;
  v_creator_id UUID;
BEGIN
  -- Verify caller authority
  SELECT (public.is_community_manager(p_community_id) OR public.is_admin()) INTO v_is_mgr;
  IF NOT v_is_mgr THEN
    RAISE EXCEPTION 'Unauthorized: Only community managers can remove members';
  END IF;

  -- Protect founder
  SELECT manager_id INTO v_creator_id
  FROM public.communities
  WHERE id = p_community_id;

  IF v_creator_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot remove the primary chapter founder';
  END IF;

  -- Fetch names before deleting membership
  SELECT COALESCE(full_name, email, 'Community Member') INTO v_target_name
  FROM public.profiles WHERE id = p_target_user_id;

  SELECT COALESCE(full_name, email, 'Community Manager') INTO v_caller_name
  FROM public.profiles WHERE id = auth.uid();

  -- Delete membership only (Leaves Supabase Auth user and profiles intact!)
  DELETE FROM public.community_members
  WHERE community_id = p_community_id AND user_id = p_target_user_id;

  -- Write activity/audit event
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    p_community_id,
    auth.uid(),
    'member removed',
    format('%s removed %s from this community', v_caller_name, v_target_name),
    jsonb_build_object(
      'action', 'remove',
      'removed_user_id', p_target_user_id,
      'removed_by', auth.uid()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'community_id', p_community_id,
    'removed_user_id', p_target_user_id
  );
END;
$$;
