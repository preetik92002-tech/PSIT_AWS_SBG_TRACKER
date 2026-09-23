-- ==============================================================================
-- Migration: 20260923000007_community_suite_enhancements.sql
-- Description: Non-destructive enhancements for the complete Community Suite:
--              1. Tasks: Priority, checklist items, draft status, attachments
--              2. Events: Status (draft/published), timings, highlights, resources, photos
--              3. Projects: Cover image, live demo, tech tags, achievements, team members
--              4. Event RSVPs table with community-scoped RLS
--              5. Atomic assign_community_task function with independent community validation
--              6. Enhanced community leaderboard function
-- ==============================================================================

-- 1. Enhance community_tasks table
ALTER TABLE public.community_tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE public.community_tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.community_tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.community_tasks ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

-- 2. Enhance community_events table
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS highlights TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS achievements TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS project_link TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS github_link TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS slides_link TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS recording_link TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS supporting_files JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.community_events ADD COLUMN IF NOT EXISTS participant_count INTEGER NOT NULL DEFAULT 0;

-- Update RLS on community_events:
-- Drafts are visible only to Community Managers; published/completed events visible to all chapter members
DROP POLICY IF EXISTS "Members can view community events" ON public.community_events;
CREATE POLICY "Members can view community events"
  ON public.community_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_community_member(community_id) AND (
      status = 'published' OR status = 'completed' OR public.is_community_manager(community_id)
    )
  );

-- 3. Enhance community_projects table
ALTER TABLE public.community_projects ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.community_projects ADD COLUMN IF NOT EXISTS live_demo_url TEXT;
ALTER TABLE public.community_projects ADD COLUMN IF NOT EXISTS tech_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.community_projects ADD COLUMN IF NOT EXISTS achievement TEXT;
ALTER TABLE public.community_projects ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]'::jsonb;

-- 4. Create community_event_rsvps table
CREATE TABLE IF NOT EXISTS public.community_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_user
  ON public.community_event_rsvps(event_id, user_id);

ALTER TABLE public.community_event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view event rsvps" ON public.community_event_rsvps;
CREATE POLICY "Members can view event rsvps"
  ON public.community_event_rsvps
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Members can rsvp to events" ON public.community_event_rsvps;
CREATE POLICY "Members can rsvp to events"
  ON public.community_event_rsvps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND public.is_community_member(community_id)
  );

DROP POLICY IF EXISTS "Members can cancel their rsvp" ON public.community_event_rsvps;
CREATE POLICY "Members can cancel their rsvp"
  ON public.community_event_rsvps
  FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND public.is_community_member(community_id)) OR
    public.is_community_manager(community_id)
  );

-- Trigger to keep participant_count updated on community_events
CREATE OR REPLACE FUNCTION public.handle_event_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_events
    SET participant_count = (
      SELECT COUNT(*) FROM public.community_event_rsvps WHERE event_id = NEW.event_id
    )
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_events
    SET participant_count = (
      SELECT COUNT(*) FROM public.community_event_rsvps WHERE event_id = OLD.event_id
    )
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_event_rsvp_count ON public.community_event_rsvps;
CREATE TRIGGER trg_event_rsvp_count
  AFTER INSERT OR DELETE ON public.community_event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_rsvp_count();

-- 5. Atomic assign_community_task Function with Independent Community Validation
CREATE OR REPLACE FUNCTION public.assign_community_task(
  p_community_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_assign_target TEXT, -- 'all', 'head', 'selected'
  p_selected_member_ids UUID[],
  p_due_date TIMESTAMPTZ,
  p_priority TEXT,
  p_checklist JSONB,
  p_attachment_url TEXT,
  p_is_draft BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_manager BOOLEAN;
  v_task_id UUID;
  v_target_user_ids UUID[];
  v_invalid_count INTEGER;
  v_inserted_count INTEGER := 0;
  v_points INTEGER := 50;
BEGIN
  -- 1. Identify and authenticate caller
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 2. Verify caller is manager of this community or platform admin
  SELECT (public.is_community_manager(p_community_id) OR public.is_admin()) INTO v_is_manager;
  IF NOT v_is_manager THEN
    RAISE EXCEPTION 'Access denied: caller is not a manager of this community';
  END IF;

  -- 3. Validate inputs
  IF p_title IS NULL OR TRIM(p_title) = '' THEN
    RAISE EXCEPTION 'Task title cannot be empty';
  END IF;

  IF p_priority NOT IN ('normal', 'important', 'urgent') THEN
    p_priority := 'normal';
  END IF;

  -- Set points based on priority
  IF p_priority = 'urgent' THEN
    v_points := 100;
  ELSIF p_priority = 'important' THEN
    v_points := 75;
  ELSE
    v_points := 50;
  END IF;

  -- 4. Insert community_tasks record
  INSERT INTO public.community_tasks (
    community_id,
    title,
    description,
    points,
    due_date,
    priority,
    checklist,
    attachment_url,
    is_draft,
    created_by
  ) VALUES (
    p_community_id,
    TRIM(p_title),
    TRIM(p_description),
    v_points,
    p_due_date,
    p_priority,
    COALESCE(p_checklist, '[]'::jsonb),
    p_attachment_url,
    COALESCE(p_is_draft, false),
    v_caller_id
  ) RETURNING id INTO v_task_id;

  -- If saving as draft, return immediately without creating assignment records
  IF p_is_draft = true THEN
    RETURN jsonb_build_object(
      'success', true,
      'task_id', v_task_id,
      'is_draft', true,
      'assignments_created', 0
    );
  END IF;

  -- 5. Determine and validate assignment recipients
  IF p_assign_target = 'all' THEN
    -- All active members of this community
    SELECT ARRAY_AGG(user_id) INTO v_target_user_ids
    FROM public.community_members
    WHERE community_id = p_community_id AND status = 'active';

  ELSIF p_assign_target = 'head' THEN
    -- Community Heads/Managers of this community
    SELECT ARRAY_AGG(user_id) INTO v_target_user_ids
    FROM public.community_members
    WHERE community_id = p_community_id AND role = 'manager' AND status = 'active';

  ELSIF p_assign_target = 'selected' THEN
    IF p_selected_member_ids IS NULL OR array_length(p_selected_member_ids, 1) = 0 THEN
      RAISE EXCEPTION 'No members selected for assignment';
    END IF;

    -- INDEPENDENT DATABASE VALIDATION: Verify every selected member belongs to this community
    SELECT COUNT(*) INTO v_invalid_count
    FROM UNNEST(p_selected_member_ids) AS mid
    WHERE mid NOT IN (
      SELECT user_id FROM public.community_members
      WHERE community_id = p_community_id AND status = 'active'
    );

    IF v_invalid_count > 0 THEN
      RAISE EXCEPTION 'Security error: One or more selected members do not belong to this community';
    END IF;

    v_target_user_ids := p_selected_member_ids;
  ELSE
    RAISE EXCEPTION 'Invalid assign_target: must be all, head, or selected';
  END IF;

  -- 6. Insert community_task_assignments records
  IF v_target_user_ids IS NOT NULL AND array_length(v_target_user_ids, 1) > 0 THEN
    INSERT INTO public.community_task_assignments (
      community_id,
      task_id,
      user_id,
      status
    )
    SELECT
      p_community_id,
      v_task_id,
      u_id,
      'pending'
    FROM UNNEST(v_target_user_ids) AS u_id
    ON CONFLICT (task_id, user_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  END IF;

  -- 7. Log activity
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description
  ) VALUES (
    p_community_id,
    v_caller_id,
    'assigned task',
    'Assigned task "' || p_title || '" to ' || v_inserted_count || ' builder(s)'
  );

  RETURN jsonb_build_object(
    'success', true,
    'task_id', v_task_id,
    'is_draft', false,
    'assignments_created', v_inserted_count
  );
END;
$$;

-- 6. Enhanced Community Leaderboard Function with Timeframes and Categories
CREATE OR REPLACE FUNCTION public.get_community_leaderboard_v2(
  p_community_id UUID,
  p_time_frame TEXT DEFAULT 'all', -- 'week', 'month', 'all'
  p_category TEXT DEFAULT 'overall' -- 'overall', 'badges', 'tasks', 'events', 'projects'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member BOOLEAN;
  v_leaderboard JSONB;
  v_start_time TIMESTAMPTZ := NULL;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT (public.is_community_member(p_community_id) OR public.is_admin()) INTO v_is_member;
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Access denied: not a member of this community';
  END IF;

  IF p_time_frame = 'week' THEN
    v_start_time := timezone('utc'::text, now()) - interval '7 days';
  ELSIF p_time_frame = 'month' THEN
    v_start_time := timezone('utc'::text, now()) - interval '30 days';
  END IF;

  SELECT jsonb_agg(lb) INTO v_leaderboard
  FROM (
    SELECT
      p.id AS user_id,
      COALESCE(p.full_name, split_part(p.email, '@', 1)) AS full_name,
      p.avatar_url,
      p.aws_builder_alias,
      cm.role,
      cm.status,
      -- Tasks completed in timeframe
      COUNT(DISTINCT cta.id) FILTER (
        WHERE cta.status = 'completed' AND (v_start_time IS NULL OR cta.completed_at >= v_start_time)
      )::BIGINT AS completed_tasks_count,
      -- Events attended in timeframe
      COUNT(DISTINCT rsvp.id) FILTER (
        WHERE v_start_time IS NULL OR rsvp.created_at >= v_start_time
      )::BIGINT AS attended_events_count,
      -- Projects contributed to
      (
        SELECT COUNT(*) FROM public.community_projects cp
        WHERE cp.community_id = p_community_id
          AND (cp.created_by = p.id OR cp.team_members @> jsonb_build_array(jsonb_build_object('id', p.id::text)))
      )::BIGINT AS projects_count,
      -- Calculated badges count
      (
        CASE
          WHEN COUNT(DISTINCT cta.id) FILTER (WHERE cta.status = 'completed') >= 10 THEN 4
          WHEN COUNT(DISTINCT cta.id) FILTER (WHERE cta.status = 'completed') >= 5 THEN 3
          WHEN COUNT(DISTINCT cta.id) FILTER (WHERE cta.status = 'completed') >= 2 THEN 2
          WHEN COUNT(DISTINCT cta.id) FILTER (WHERE cta.status = 'completed') >= 1 THEN 1
          ELSE 0
        END
      )::BIGINT AS badges_count,
      -- Total Points derived from completed tasks and event attendance
      (
        COALESCE(SUM(ct.points) FILTER (
          WHERE cta.status = 'completed' AND (v_start_time IS NULL OR cta.completed_at >= v_start_time)
        ), 0) +
        (COUNT(DISTINCT rsvp.id) FILTER (
          WHERE v_start_time IS NULL OR rsvp.created_at >= v_start_time
        ) * 25)
      )::BIGINT AS total_points
    FROM public.community_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    LEFT JOIN public.community_task_assignments cta ON cta.community_id = cm.community_id AND cta.user_id = cm.user_id
    LEFT JOIN public.community_tasks ct ON ct.id = cta.task_id
    LEFT JOIN public.community_event_rsvps rsvp ON rsvp.community_id = cm.community_id AND rsvp.user_id = cm.user_id
    WHERE cm.community_id = p_community_id AND cm.status = 'active'
    GROUP BY p.id, p.full_name, p.email, p.avatar_url, p.aws_builder_alias, cm.role, cm.status
    ORDER BY
      CASE
        WHEN p_category = 'tasks' THEN COUNT(DISTINCT cta.id) FILTER (WHERE cta.status = 'completed')
        WHEN p_category = 'events' THEN COUNT(DISTINCT rsvp.id)
        ELSE (
          COALESCE(SUM(ct.points) FILTER (
            WHERE cta.status = 'completed' AND (v_start_time IS NULL OR cta.completed_at >= v_start_time)
          ), 0) +
          (COUNT(DISTINCT rsvp.id) * 25)
        )
      END DESC,
      completed_tasks_count DESC,
      full_name ASC
    LIMIT 100
  ) lb;

  RETURN COALESCE(v_leaderboard, '[]'::jsonb);
END;
$$;
