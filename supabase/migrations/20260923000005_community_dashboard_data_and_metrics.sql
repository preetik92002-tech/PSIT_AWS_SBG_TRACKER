-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000005
-- COMMUNITY MANAGER DASHBOARD TABLES, RLS, AND METRICS
-- ==============================================================================

-- 1. Community Events Table
CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  event_type TEXT DEFAULT 'meetup' NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_events_comm_date
  ON public.community_events(community_id, event_date);

-- 2. Community Projects Table
CREATE TABLE IF NOT EXISTS public.community_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'in_progress' NOT NULL,
  github_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_projects_comm_status
  ON public.community_projects(community_id, status);

-- 3. Community Tasks Table
CREATE TABLE IF NOT EXISTS public.community_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 50 NOT NULL,
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_tasks_comm_due
  ON public.community_tasks(community_id, due_date);

-- 4. Community Task Assignments Table
CREATE TABLE IF NOT EXISTS public.community_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.community_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'submitted', 'completed', 'overdue'
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comm_task_assign_comm_user
  ON public.community_task_assignments(community_id, user_id, status);

-- 5. Community Activities Table
CREATE TABLE IF NOT EXISTS public.community_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- 'completed task', 'joined event', 'earned badge', 'submitted project', 'joined community', 'published event', 'created project'
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_activities_comm_created
  ON public.community_activities(community_id, created_at DESC);

-- Enable RLS on all new tables
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_activities ENABLE ROW LEVEL SECURITY;

-- 6. Row Level Security Policies

-- Events
DROP POLICY IF EXISTS "Members can view community events" ON public.community_events;
CREATE POLICY "Members can view community events"
  ON public.community_events
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Managers can manage community events" ON public.community_events;
CREATE POLICY "Managers can manage community events"
  ON public.community_events
  FOR ALL
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

-- Projects
DROP POLICY IF EXISTS "Members can view community projects" ON public.community_projects;
CREATE POLICY "Members can view community projects"
  ON public.community_projects
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Managers can manage community projects" ON public.community_projects;
CREATE POLICY "Managers can manage community projects"
  ON public.community_projects
  FOR ALL
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

-- Tasks
DROP POLICY IF EXISTS "Members can view community tasks" ON public.community_tasks;
CREATE POLICY "Members can view community tasks"
  ON public.community_tasks
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Managers can manage community tasks" ON public.community_tasks;
CREATE POLICY "Managers can manage community tasks"
  ON public.community_tasks
  FOR ALL
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

-- Task Assignments
DROP POLICY IF EXISTS "Members can view community task assignments" ON public.community_task_assignments;
CREATE POLICY "Members can view community task assignments"
  ON public.community_task_assignments
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Managers can manage task assignments" ON public.community_task_assignments;
CREATE POLICY "Managers can manage task assignments"
  ON public.community_task_assignments
  FOR ALL
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

DROP POLICY IF EXISTS "Members can update their own task assignments" ON public.community_task_assignments;
CREATE POLICY "Members can update their own task assignments"
  ON public.community_task_assignments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.is_community_member(community_id))
  WITH CHECK (user_id = auth.uid() AND public.is_community_member(community_id));

-- Activities
DROP POLICY IF EXISTS "Members can view community activities" ON public.community_activities;
CREATE POLICY "Members can view community activities"
  ON public.community_activities
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Members can record activities" ON public.community_activities;
CREATE POLICY "Members can record activities"
  ON public.community_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_community_member(community_id));

-- 7. Trigger to automatically log activity when member joins community
CREATE OR REPLACE FUNCTION public.handle_member_joined_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_member_name TEXT;
BEGIN
  SELECT COALESCE(full_name, 'New Builder') INTO v_member_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description
  )
  VALUES (
    NEW.community_id,
    NEW.user_id,
    'joined community',
    v_member_name || ' joined the community'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_member_joined_activity ON public.community_members;
CREATE TRIGGER on_member_joined_activity
  AFTER INSERT ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_member_joined_activity();

-- 8. Stored Procedure: Get Scoped Community Manager Dashboard Metrics
CREATE OR REPLACE FUNCTION public.get_community_dashboard_metrics(p_community_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
  v_total_members BIGINT;
  v_active_members BIGINT;
  v_inactive_members BIGINT;
  v_needs_attention_count BIGINT;
  v_events_count BIGINT;
  v_projects_count BIGINT;
  v_total_assignments BIGINT;
  v_completed_assignments BIGINT;
  v_avg_completion_pct NUMERIC;
  v_assigned_this_week BIGINT;
  v_completed_this_week BIGINT;
  v_pending_this_week BIGINT;
  v_weekly_completion_pct NUMERIC;
  v_needs_attention JSONB;
  v_recent_activities JSONB;
  v_upcoming_events JSONB;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_week_start TIMESTAMPTZ := v_now - interval '7 days';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Security check: Must be member or manager of this community (or platform admin)
  SELECT (public.is_community_member(p_community_id) OR public.is_admin()) INTO v_is_member;
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Access denied: not a member of this community';
  END IF;

  -- 1. Total Members
  SELECT COUNT(*) INTO v_total_members
  FROM public.community_members
  WHERE community_id = p_community_id AND status = 'active';

  -- 2. Inactive members
  SELECT COUNT(*) INTO v_inactive_members
  FROM public.community_members
  WHERE community_id = p_community_id AND status = 'inactive';

  -- 3. Events count
  SELECT COUNT(*) INTO v_events_count
  FROM public.community_events
  WHERE community_id = p_community_id;

  -- 4. Projects count
  SELECT COUNT(*) INTO v_projects_count
  FROM public.community_projects
  WHERE community_id = p_community_id;

  -- 5. Total & completed task assignments
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_assignments, v_completed_assignments
  FROM public.community_task_assignments
  WHERE community_id = p_community_id;

  IF v_total_assignments > 0 THEN
    v_avg_completion_pct := ROUND((v_completed_assignments::NUMERIC / v_total_assignments::NUMERIC) * 100, 1);
  ELSE
    v_avg_completion_pct := 0;
  END IF;

  -- 6. This Week's Progress
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'pending' OR status = 'submitted')
  INTO v_assigned_this_week, v_completed_this_week, v_pending_this_week
  FROM public.community_task_assignments
  WHERE community_id = p_community_id
    AND created_at >= v_week_start;

  IF v_assigned_this_week > 0 THEN
    v_weekly_completion_pct := ROUND((v_completed_this_week::NUMERIC / v_assigned_this_week::NUMERIC) * 100, 1);
  ELSE
    v_weekly_completion_pct := 0;
  END IF;

  -- 7. Needs attention members: members with overdue tasks or 0 tasks completed
  SELECT jsonb_agg(item) INTO v_needs_attention
  FROM (
    SELECT
      p.id AS user_id,
      COALESCE(p.full_name, 'Community Member') AS full_name,
      p.avatar_url,
      p.email,
      cm.role,
      COUNT(cta.id) FILTER (WHERE cta.status = 'overdue' OR (cta.status = 'pending' AND ct.due_date < v_now)) AS overdue_tasks,
      COUNT(cta.id) AS total_tasks,
      COUNT(cta.id) FILTER (WHERE cta.status = 'completed') AS completed_tasks,
      CASE
        WHEN COUNT(cta.id) FILTER (WHERE cta.status = 'overdue' OR (cta.status = 'pending' AND ct.due_date < v_now)) > 0
          THEN 'Overdue tasks pending'
        WHEN COUNT(cta.id) > 0 AND COUNT(cta.id) FILTER (WHERE cta.status = 'completed') = 0
          THEN 'Low completion rate'
        ELSE 'Low recent activity'
      END AS reason
    FROM public.community_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    LEFT JOIN public.community_task_assignments cta ON cta.community_id = p_community_id AND cta.user_id = cm.user_id
    LEFT JOIN public.community_tasks ct ON ct.id = cta.task_id
    WHERE cm.community_id = p_community_id
      AND cm.status = 'active'
      AND cm.role = 'member'
    GROUP BY p.id, p.full_name, p.avatar_url, p.email, cm.role
    HAVING COUNT(cta.id) FILTER (WHERE cta.status = 'overdue' OR (cta.status = 'pending' AND ct.due_date < v_now)) > 0
       OR (COUNT(cta.id) > 0 AND (COUNT(cta.id) FILTER (WHERE cta.status = 'completed')::NUMERIC / COUNT(cta.id)::NUMERIC) < 0.5)
    ORDER BY overdue_tasks DESC
    LIMIT 5
  ) item;

  IF v_needs_attention IS NULL THEN
    v_needs_attention := '[]'::jsonb;
    v_needs_attention_count := 0;
  ELSE
    v_needs_attention_count := jsonb_array_length(v_needs_attention);
  END IF;

  -- Active members count: total members minus needs attention and inactive
  v_active_members := GREATEST(0, v_total_members - v_needs_attention_count);

  -- 8. Recent Activities (limit 10)
  SELECT jsonb_agg(act) INTO v_recent_activities
  FROM (
    SELECT
      ca.id,
      ca.activity_type,
      ca.description,
      ca.created_at,
      p.full_name AS user_name,
      p.avatar_url AS user_avatar
    FROM public.community_activities ca
    LEFT JOIN public.profiles p ON p.id = ca.user_id
    WHERE ca.community_id = p_community_id
    ORDER BY ca.created_at DESC
    LIMIT 10
  ) act;

  IF v_recent_activities IS NULL THEN
    v_recent_activities := '[]'::jsonb;
  END IF;

  -- 9. Upcoming Events (limit 5)
  SELECT jsonb_agg(ev) INTO v_upcoming_events
  FROM (
    SELECT
      ce.id,
      ce.title,
      ce.description,
      ce.event_date,
      ce.location,
      ce.event_type
    FROM public.community_events ce
    WHERE ce.community_id = p_community_id
      AND ce.event_date >= (v_now - interval '1 day')
    ORDER BY ce.event_date ASC
    LIMIT 5
  ) ev;

  IF v_upcoming_events IS NULL THEN
    v_upcoming_events := '[]'::jsonb;
  END IF;

  -- Build composite dashboard response
  RETURN jsonb_build_object(
    'community_id', p_community_id,
    'total_members', v_total_members,
    'active_members', v_active_members,
    'members_needing_attention', v_needs_attention_count,
    'events_count', v_events_count,
    'projects_count', v_projects_count,
    'avg_task_completion', v_avg_completion_pct,
    'community_health', jsonb_build_object(
      'active', v_active_members,
      'needs_attention', v_needs_attention_count,
      'inactive', v_inactive_members
    ),
    'weekly_progress', jsonb_build_object(
      'assigned', v_assigned_this_week,
      'completed', v_completed_this_week,
      'pending', v_pending_this_week,
      'completion_percentage', v_weekly_completion_pct
    ),
    'needs_attention_list', v_needs_attention,
    'recent_activities', v_recent_activities,
    'upcoming_events', v_upcoming_events
  );
END;
$$;
