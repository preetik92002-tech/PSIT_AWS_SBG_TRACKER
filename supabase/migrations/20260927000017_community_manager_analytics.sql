-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000017
-- FEATURE 16: COMMUNITY MANAGER ANALYTICS (REAL DATABASE AGGREGATES & METRICS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_community_manager_analytics(
  p_community_id UUID,
  p_days INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_authorized BOOLEAN := false;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_start_date TIMESTAMPTZ := NULL;

  -- Member metrics
  v_total_members BIGINT := 0;
  v_new_members BIGINT := 0;
  v_active_members BIGINT := 0;

  -- Task metrics
  v_tasks_created BIGINT := 0;
  v_tasks_completed BIGINT := 0;
  v_tasks_overdue BIGINT := 0;
  v_tasks_total_assignments BIGINT := 0;
  v_task_completion_rate NUMERIC := 0;

  -- Event metrics
  v_events_created BIGINT := 0;
  v_events_attendance BIGINT := 0;
  v_events_rsvp BIGINT := 0;
  v_event_participation_rate NUMERIC := 0;

  -- Project metrics
  v_projects_active BIGINT := 0;
  v_projects_completed BIGINT := 0;
  v_project_members_involved BIGINT := 0;

  -- Contribution metrics
  v_contributions_submitted BIGINT := 0;
  v_contributions_approved BIGINT := 0;
  v_contributions_rejected BIGINT := 0;

  -- Points metrics
  v_points_earned BIGINT := 0;
  v_points_distribution JSONB := '[]'::jsonb;
  v_points_activity JSONB := '[]'::jsonb;
  v_task_timeline JSONB := '[]'::jsonb;
  v_contribution_categories JSONB := '[]'::jsonb;

BEGIN
  -- Strict permission guard: Community managers & platform admins only
  SELECT (public.is_community_manager(p_community_id) OR public.is_admin())
  INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: Only community managers can view community analytics';
  END IF;

  -- Calculate start date filter if days are provided
  IF p_days IS NOT NULL AND p_days > 0 THEN
    v_start_date := v_now - (p_days || ' days')::INTERVAL;
  END IF;

  -- ============================================================================
  -- 1. MEMBERS METRICS
  -- ============================================================================
  -- Total active members
  SELECT COUNT(*) INTO v_total_members
  FROM public.community_members
  WHERE community_id = p_community_id
    AND status = 'active';

  -- New members joined in this timeframe
  SELECT COUNT(*) INTO v_new_members
  FROM public.community_members
  WHERE community_id = p_community_id
    AND status = 'active'
    AND (v_start_date IS NULL OR joined_at >= v_start_date);

  -- Active members (distinct members who performed an action or transaction in this window)
  SELECT COUNT(DISTINCT m.user_id) INTO v_active_members
  FROM public.community_members m
  WHERE m.community_id = p_community_id
    AND m.status = 'active'
    AND (
      -- Has points transaction
      EXISTS (
        SELECT 1 FROM public.points_transactions pt
        WHERE pt.community_id = p_community_id
          AND pt.user_id = m.user_id
          AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
      )
      -- Has task assignment activity
      OR EXISTS (
        SELECT 1 FROM public.community_task_assignments cta
        WHERE cta.community_id = p_community_id
          AND cta.user_id = m.user_id
          AND (v_start_date IS NULL OR cta.updated_at >= v_start_date)
      )
      -- Has event RSVP
      OR EXISTS (
        SELECT 1 FROM public.community_event_rsvps rsvp
        WHERE rsvp.community_id = p_community_id
          AND rsvp.user_id = m.user_id
          AND (v_start_date IS NULL OR rsvp.created_at >= v_start_date)
      )
      -- Has contribution
      OR EXISTS (
        SELECT 1 FROM public.community_contributions cc
        WHERE cc.community_id = p_community_id
          AND (cc.contributor_id = m.user_id OR cc.recipient_id = m.user_id)
          AND (v_start_date IS NULL OR cc.created_at >= v_start_date)
      )
    );

  -- ============================================================================
  -- 2. TASKS METRICS
  -- ============================================================================
  -- Tasks created
  SELECT COUNT(*) INTO v_tasks_created
  FROM public.community_tasks
  WHERE community_id = p_community_id
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Task assignments in period
  SELECT COUNT(*) INTO v_tasks_total_assignments
  FROM public.community_task_assignments
  WHERE community_id = p_community_id
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Task assignments completed
  SELECT COUNT(*) INTO v_tasks_completed
  FROM public.community_task_assignments
  WHERE community_id = p_community_id
    AND status = 'completed'
    AND (v_start_date IS NULL OR completed_at >= v_start_date OR (completed_at IS NULL AND updated_at >= v_start_date));

  -- Task assignments overdue
  SELECT COUNT(*) INTO v_tasks_overdue
  FROM public.community_task_assignments cta
  JOIN public.community_tasks ct ON ct.id = cta.task_id
  WHERE cta.community_id = p_community_id
    AND (
      cta.status = 'overdue'
      OR (cta.status IN ('pending', 'in_progress') AND ct.due_date IS NOT NULL AND ct.due_date < v_now)
    )
    AND (v_start_date IS NULL OR cta.created_at >= v_start_date);

  -- Completion rate percentage
  IF v_tasks_total_assignments > 0 THEN
    v_task_completion_rate := ROUND((v_tasks_completed::NUMERIC / v_tasks_total_assignments::NUMERIC) * 100, 1);
  ELSE
    v_task_completion_rate := 0;
  END IF;

  -- ============================================================================
  -- 3. EVENTS METRICS
  -- ============================================================================
  -- Events created
  SELECT COUNT(*) INTO v_events_created
  FROM public.community_events
  WHERE community_id = p_community_id
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Total RSVPs
  SELECT COUNT(*) INTO v_events_rsvp
  FROM public.community_event_rsvps
  WHERE community_id = p_community_id
    AND status = 'registered'
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Total attendance
  SELECT COUNT(*) INTO v_events_attendance
  FROM public.community_event_rsvps
  WHERE community_id = p_community_id
    AND attended = true
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Participation rate percentage
  IF v_events_rsvp > 0 THEN
    v_event_participation_rate := ROUND((v_events_attendance::NUMERIC / v_events_rsvp::NUMERIC) * 100, 1);
  ELSE
    v_event_participation_rate := 0;
  END IF;

  -- ============================================================================
  -- 4. PROJECTS METRICS
  -- ============================================================================
  -- Active / Planning projects
  SELECT COUNT(*) INTO v_projects_active
  FROM public.community_projects
  WHERE community_id = p_community_id
    AND status IN ('Active', 'Planning', 'active', 'in_progress')
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Completed projects
  SELECT COUNT(*) INTO v_projects_completed
  FROM public.community_projects
  WHERE community_id = p_community_id
    AND status IN ('Completed', 'completed')
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Members involved in projects
  SELECT COUNT(DISTINCT user_id) INTO v_project_members_involved
  FROM public.community_project_members
  WHERE community_id = p_community_id
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- ============================================================================
  -- 5. CONTRIBUTIONS METRICS
  -- ============================================================================
  -- Total submitted
  SELECT COUNT(*) INTO v_contributions_submitted
  FROM public.community_contributions
  WHERE community_id = p_community_id
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Approved
  SELECT COUNT(*) INTO v_contributions_approved
  FROM public.community_contributions
  WHERE community_id = p_community_id
    AND status = 'approved'
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Rejected
  SELECT COUNT(*) INTO v_contributions_rejected
  FROM public.community_contributions
  WHERE community_id = p_community_id
    AND status = 'rejected'
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Contribution categories breakdown
  SELECT COALESCE(jsonb_agg(cat_row), '[]'::jsonb) INTO v_contribution_categories
  FROM (
    SELECT
      category,
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE status = 'approved') AS approved_count
    FROM public.community_contributions
    WHERE community_id = p_community_id
      AND (v_start_date IS NULL OR created_at >= v_start_date)
    GROUP BY category
    ORDER BY total_count DESC
  ) cat_row;

  -- ============================================================================
  -- 6. POINTS METRICS & CHARTS DATA
  -- ============================================================================
  -- Total points earned
  SELECT COALESCE(SUM(points), 0) INTO v_points_earned
  FROM public.points_transactions
  WHERE community_id = p_community_id
    AND points > 0
    AND (v_start_date IS NULL OR created_at >= v_start_date);

  -- Points distribution by source/type
  SELECT COALESCE(jsonb_agg(dist_row), '[]'::jsonb) INTO v_points_distribution
  FROM (
    SELECT
      entity_type AS category,
      COALESCE(SUM(points), 0) AS total_points,
      COUNT(*) AS transaction_count
    FROM public.points_transactions
    WHERE community_id = p_community_id
      AND points > 0
      AND (v_start_date IS NULL OR created_at >= v_start_date)
    GROUP BY entity_type
    ORDER BY total_points DESC
  ) dist_row;

  -- Points activity velocity over time (grouped by day)
  SELECT COALESCE(jsonb_agg(act_row), '[]'::jsonb) INTO v_points_activity
  FROM (
    SELECT
      to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
      COALESCE(SUM(points), 0) AS points,
      COUNT(*) AS transactions
    FROM public.points_transactions
    WHERE community_id = p_community_id
      AND points > 0
      AND (v_start_date IS NULL OR created_at >= v_start_date)
    GROUP BY date_trunc('day', created_at)
    ORDER BY date_trunc('day', created_at) ASC
  ) act_row;

  -- Task completion timeline
  SELECT COALESCE(jsonb_agg(task_row), '[]'::jsonb) INTO v_task_timeline
  FROM (
    SELECT
      to_char(date_trunc('day', COALESCE(completed_at, updated_at)), 'YYYY-MM-DD') AS date,
      COUNT(*) AS completed
    FROM public.community_task_assignments
    WHERE community_id = p_community_id
      AND status = 'completed'
      AND (v_start_date IS NULL OR COALESCE(completed_at, updated_at) >= v_start_date)
    GROUP BY date_trunc('day', COALESCE(completed_at, updated_at))
    ORDER BY date_trunc('day', COALESCE(completed_at, updated_at)) ASC
  ) task_row;

  -- Return comprehensive structured analytics
  RETURN jsonb_build_object(
    'community_id', p_community_id,
    'time_window_days', p_days,
    'generated_at', v_now,
    'members', jsonb_build_object(
      'total', v_total_members,
      'new_members', v_new_members,
      'active_members', v_active_members
    ),
    'tasks', jsonb_build_object(
      'created', v_tasks_created,
      'completed', v_tasks_completed,
      'overdue', v_tasks_overdue,
      'completion_rate', v_task_completion_rate,
      'total_assignments', v_tasks_total_assignments
    ),
    'events', jsonb_build_object(
      'created', v_events_created,
      'attendance', v_events_attendance,
      'rsvp', v_events_rsvp,
      'participation_rate', v_event_participation_rate
    ),
    'projects', jsonb_build_object(
      'active', v_projects_active,
      'completed', v_projects_completed,
      'members_involved', v_project_members_involved
    ),
    'contributions', jsonb_build_object(
      'submitted', v_contributions_submitted,
      'approved', v_contributions_approved,
      'rejected', v_contributions_rejected,
      'categories', v_contribution_categories
    ),
    'points', jsonb_build_object(
      'earned', v_points_earned,
      'distribution', v_points_distribution,
      'activity', v_points_activity
    ),
    'task_timeline', v_task_timeline
  );
END;
$$;
