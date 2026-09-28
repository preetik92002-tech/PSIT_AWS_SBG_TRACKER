-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000020
-- FEATURE 21: ADMIN AUDIT LOG & IMMUTABLE GOVERNANCE TRAIL
-- ==============================================================================

-- 1. Create public.audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for fast filtered queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_comm_created
  ON public.audit_logs(community_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs(community_id, action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs(community_id, actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs(community_id, entity_type, entity_id);

-- 3. Enable Row-Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES:
-- Manager-Only View Policy: Only authorized managers of this community or platform admins can view audit logs
DROP POLICY IF EXISTS "Only authorized managers can view community audit logs" ON public.audit_logs;
CREATE POLICY "Only authorized managers can view community audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.is_community_manager(community_id) OR
    public.is_admin()
  );

-- Insert Policy: Authorized managers or admins can insert audit logs
DROP POLICY IF EXISTS "Authorized actors can record audit logs" ON public.audit_logs;
CREATE POLICY "Authorized actors can record audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = actor_user_id) AND
    (public.is_community_manager(community_id) OR public.is_admin())
  );

-- NOTE: No UPDATE or DELETE policies are defined.
-- Audit logs are strictly immutable and append-only.

-- 5. Stored Procedure: record_audit_log (Sanitizes metadata to prevent secret leakage)
CREATE OR REPLACE FUNCTION public.record_audit_log(
  p_community_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_actor_id, auth.uid());
  v_log_id UUID;
  v_sanitized_metadata JSONB := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  IF v_actor IS NULL THEN
    -- Fallback to the community manager if system/service triggered
    SELECT manager_id INTO v_actor FROM public.communities WHERE id = p_community_id;
  END IF;

  -- Strictly strip any sensitive credentials or secrets
  v_sanitized_metadata := v_sanitized_metadata
    - 'password'
    - 'secret'
    - 'token'
    - 'access_token'
    - 'refresh_token'
    - 'api_key'
    - 'client_secret'
    - 'auth_header';

  INSERT INTO public.audit_logs (
    community_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_community_id,
    v_actor,
    p_action,
    p_entity_type,
    p_entity_id,
    v_sanitized_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- 6. RPC: get_community_audit_logs (Manager-gated paginated retrieval)
CREATE OR REPLACE FUNCTION public.get_community_audit_logs(
  p_community_id UUID,
  p_action TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  community_id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  actor_id UUID,
  actor_name TEXT,
  actor_email TEXT,
  actor_avatar_url TEXT,
  actor_alias TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is authorized manager or platform admin
  IF NOT (public.is_community_manager(p_community_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Access denied: Only authorized community managers can view audit logs';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.community_id,
    al.action,
    al.entity_type,
    al.entity_id,
    al.metadata,
    al.created_at,
    p.id AS actor_id,
    COALESCE(p.full_name, 'Unknown Manager') AS actor_name,
    COALESCE(p.email, '') AS actor_email,
    p.avatar_url AS actor_avatar_url,
    p.aws_builder_alias AS actor_alias
  FROM public.audit_logs al
  LEFT JOIN public.profiles p ON p.id = al.actor_user_id
  WHERE al.community_id = p_community_id
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_actor_id IS NULL OR al.actor_user_id = p_actor_id)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 7. Backfill initial historical audit events from community_activities if any exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_activities') THEN
    INSERT INTO public.audit_logs (
      community_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      metadata,
      created_at
    )
    SELECT
      ca.community_id,
      ca.user_id,
      CASE
        WHEN ca.activity_type LIKE '%meet%' THEN 'google_meet_created'
        WHEN ca.activity_type LIKE '%task%' THEN 'task_approved'
        WHEN ca.activity_type LIKE '%event%' THEN 'event_published'
        WHEN ca.activity_type LIKE '%setting%' THEN 'community_settings_changed'
        ELSE 'community_edited'
      END,
      CASE
        WHEN ca.activity_type LIKE '%meet%' THEN 'google_meet'
        WHEN ca.activity_type LIKE '%task%' THEN 'task'
        WHEN ca.activity_type LIKE '%event%' THEN 'event'
        WHEN ca.activity_type LIKE '%setting%' THEN 'settings'
        ELSE 'community'
      END,
      ca.id::text,
      jsonb_build_object('description', ca.description, 'historical', true),
      ca.created_at
    FROM public.community_activities ca
    WHERE ca.user_id IS NOT NULL
      AND ca.community_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
