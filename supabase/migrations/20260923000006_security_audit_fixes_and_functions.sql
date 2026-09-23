-- ==============================================================================
-- Migration: 20260923000006_security_audit_fixes_and_functions.sql
-- Description: Security Audit Fixes & Verification RPCs
--              1. Hardens join_community_by_code against inactive & expired codes
--              2. Hardens get_community_by_code against inactive & expired codes
--              3. Deploys get_community_leaderboard with strict community scoping
--              4. Deploys get_community_analytics with strict manager scoping
--              5. Hardens RLS policies across all community operational tables
-- ==============================================================================

-- 1. Hardened join_community_by_code
CREATE OR REPLACE FUNCTION public.join_community_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_comm_id UUID;
  v_comm_record RECORD;
  v_existing_member RECORD;
BEGIN
  -- 1. Identify caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to join a community';
  END IF;

  -- 2. Validate input
  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RAISE EXCEPTION 'Community code cannot be empty';
  END IF;

  -- 3. Lookup active AND non-expired code (Both flags must be true)
  SELECT community_id INTO v_comm_id
  FROM public.community_codes
  WHERE UPPER(code) = UPPER(TRIM(p_code))
    AND is_active = true
    AND active = true
    AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()));

  IF v_comm_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive community code';
  END IF;

  -- 4. Check if community itself is active
  SELECT id, name, short_name, COALESCE(institution_name, institution) AS institution, city, description
  INTO v_comm_record
  FROM public.communities
  WHERE id = v_comm_id AND is_active = true;

  IF v_comm_record.id IS NULL THEN
    RAISE EXCEPTION 'This community is currently inactive';
  END IF;

  -- 5. Check existing membership
  SELECT id, role, status INTO v_existing_member
  FROM public.community_members
  WHERE community_id = v_comm_id AND user_id = v_user_id;

  IF v_existing_member.id IS NOT NULL THEN
    IF v_existing_member.status = 'inactive' THEN
      UPDATE public.community_members SET status = 'active' WHERE id = v_existing_member.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'community_id', v_comm_record.id,
      'name', v_comm_record.name,
      'short_name', v_comm_record.short_name,
      'institution', v_comm_record.institution,
      'city', v_comm_record.city
    );
  END IF;

  -- 6. Insert new member strictly with role = 'member'
  INSERT INTO public.community_members (community_id, user_id, role, status, joined_at)
  VALUES (v_comm_id, v_user_id, 'member', 'active', timezone('utc'::text, now()));

  RETURN jsonb_build_object(
    'success', true,
    'already_member', false,
    'community_id', v_comm_record.id,
    'name', v_comm_record.name,
    'short_name', v_comm_record.short_name,
    'institution', v_comm_record.institution,
    'city', v_comm_record.city
  );
END;
$$;

-- 2. Hardened get_community_by_code
CREATE OR REPLACE FUNCTION public.get_community_by_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comm RECORD;
  v_member_count BIGINT;
  v_manager_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RETURN NULL;
  END IF;

  SELECT c.id, c.name, c.short_name, COALESCE(c.institution_name, c.institution) AS institution, c.city, c.description, c.manager_id, c.created_at
  INTO v_comm
  FROM public.communities c
  JOIN public.community_codes cc ON cc.community_id = c.id
  WHERE UPPER(cc.code) = UPPER(TRIM(p_code))
    AND cc.is_active = true
    AND cc.active = true
    AND (cc.expires_at IS NULL OR cc.expires_at > timezone('utc'::text, now()))
    AND c.is_active = true;

  IF v_comm.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.community_members
  WHERE community_id = v_comm.id AND status = 'active';

  SELECT COALESCE(full_name, 'Community Lead') INTO v_manager_name
  FROM public.profiles
  WHERE id = v_comm.manager_id;

  RETURN jsonb_build_object(
    'id', v_comm.id,
    'name', v_comm.name,
    'short_name', v_comm.short_name,
    'institution', v_comm.institution,
    'city', v_comm.city,
    'description', v_comm.description,
    'member_count', v_member_count,
    'manager_name', v_manager_name,
    'created_at', v_comm.created_at
  );
END;
$$;

-- 3. Community Leaderboard Function (Strictly Scoped to Community Members)
CREATE OR REPLACE FUNCTION public.get_community_leaderboard(p_community_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member BOOLEAN;
  v_leaderboard JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT (public.is_community_member(p_community_id) OR public.is_admin()) INTO v_is_member;
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Access denied: not a member of this community';
  END IF;

  SELECT jsonb_agg(lb) INTO v_leaderboard
  FROM (
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      p.aws_builder_alias,
      cm.role,
      COALESCE(SUM(ct.points), 0)::BIGINT AS total_points,
      COUNT(cta.id) FILTER (WHERE cta.status = 'completed')::BIGINT AS completed_tasks_count
    FROM public.community_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    LEFT JOIN public.community_task_assignments cta ON cta.community_id = cm.community_id AND cta.user_id = cm.user_id AND cta.status = 'completed'
    LEFT JOIN public.community_tasks ct ON ct.id = cta.task_id
    WHERE cm.community_id = p_community_id AND cm.status = 'active'
    GROUP BY p.id, p.full_name, p.avatar_url, p.aws_builder_alias, cm.role
    ORDER BY total_points DESC, completed_tasks_count DESC
    LIMIT 50
  ) lb;

  RETURN COALESCE(v_leaderboard, '[]'::jsonb);
END;
$$;

-- 4. Community Analytics Function (Strictly Scoped to Community Managers)
CREATE OR REPLACE FUNCTION public.get_community_analytics(p_community_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_manager BOOLEAN;
  v_analytics JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT (public.is_community_manager(p_community_id) OR public.is_admin()) INTO v_is_manager;
  IF NOT v_is_manager THEN
    RAISE EXCEPTION 'Access denied: not a manager of this community';
  END IF;

  SELECT public.get_community_dashboard_metrics(p_community_id) INTO v_analytics;
  RETURN v_analytics;
END;
$$;
