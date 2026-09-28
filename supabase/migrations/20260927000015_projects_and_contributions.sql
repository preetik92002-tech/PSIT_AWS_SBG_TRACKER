-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000015
-- FEATURE 9: PROJECT MANAGEMENT (ROBUST TEAMS, LIFECYCLE, REAL PERSISTENCE)
-- FEATURE 10: CONTRIBUTIONS + COMMUNITY POINTS (PEER HELP, REVIEW & LEDGER)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENHANCE COMMUNITY PROJECTS (STATUSES, TIMELINES, MEDIA)
-- ------------------------------------------------------------------------------
ALTER TABLE public.community_projects
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS live_demo_url TEXT,
  ADD COLUMN IF NOT EXISTS tech_tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Migrate legacy status formats to standard: Planning, Active, Completed, Archived
UPDATE public.community_projects
SET status = 'Active'
WHERE status IN ('in_progress', 'active');

UPDATE public.community_projects
SET status = 'Completed'
WHERE status IN ('completed');

UPDATE public.community_projects
SET status = 'Planning'
WHERE status NOT IN ('Planning', 'Active', 'Completed', 'Archived');

-- ------------------------------------------------------------------------------
-- 2. PROJECT MEMBERS JUNCTION TABLE (AUTHORIZED TEAM ROSTER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.community_projects(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'collaborator' NOT NULL CHECK (role IN ('lead', 'collaborator', 'contributor')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_proj
  ON public.community_project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user
  ON public.community_project_members(user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_comm
  ON public.community_project_members(community_id);

ALTER TABLE public.community_project_members ENABLE ROW LEVEL SECURITY;

-- RLS: Community members can view project teams
DROP POLICY IF EXISTS "Members can view project members" ON public.community_project_members;
CREATE POLICY "Members can view project members"
  ON public.community_project_members
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

-- RLS: Managers can insert/update/delete project members
DROP POLICY IF EXISTS "Managers can manage project members" ON public.community_project_members;
CREATE POLICY "Managers can manage project members"
  ON public.community_project_members
  FOR ALL
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

-- Backfill project creator as lead in community_project_members if not present
INSERT INTO public.community_project_members (project_id, community_id, user_id, role)
SELECT p.id, p.community_id, p.created_by, 'lead'
FROM public.community_projects p
WHERE p.created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. COMMUNITY CONTRIBUTIONS TABLE (PEER-TO-PEER HELP & COMMUNITY IMPACT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'Mentorship',
      'Debugging & Troubleshooting',
      'Code Review',
      'AWS Deployment',
      'Workshop Support',
      'Architecture Guidance',
      'Documentation',
      'General Assistance'
    )
  ),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_url TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  points_awarded INTEGER DEFAULT 0 NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_contributions_comm_status
  ON public.community_contributions(community_id, status);

CREATE INDEX IF NOT EXISTS idx_community_contributions_contributor
  ON public.community_contributions(contributor_id);

CREATE INDEX IF NOT EXISTS idx_community_contributions_recipient
  ON public.community_contributions(recipient_id);

ALTER TABLE public.community_contributions ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view approved contributions or their own submissions
DROP POLICY IF EXISTS "Members can view community contributions" ON public.community_contributions;
CREATE POLICY "Members can view community contributions"
  ON public.community_contributions
  FOR SELECT
  TO authenticated
  USING (
    public.is_community_manager(community_id)
    OR status = 'approved'
    OR contributor_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- RLS: Authenticated members can submit contributions
DROP POLICY IF EXISTS "Members can submit contributions" ON public.community_contributions;
CREATE POLICY "Members can submit contributions"
  ON public.community_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    contributor_id = auth.uid()
    AND public.is_community_member(community_id)
  );

-- RLS: Managers can update contributions (approve/reject/award points)
DROP POLICY IF EXISTS "Managers can update contributions" ON public.community_contributions;
CREATE POLICY "Managers can update contributions"
  ON public.community_contributions
  FOR UPDATE
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

-- RLS: Contributors can delete their own pending contributions; managers can delete any
DROP POLICY IF EXISTS "Members can delete pending contributions" ON public.community_contributions;
CREATE POLICY "Members can delete pending contributions"
  ON public.community_contributions
  FOR DELETE
  TO authenticated
  USING (
    (contributor_id = auth.uid() AND status = 'pending')
    OR public.is_community_manager(community_id)
  );

-- ------------------------------------------------------------------------------
-- 4. RPC: APPROVE CONTRIBUTION (CREATES POINTS TRANSACTION & ACTIVITY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_community_contribution(
  p_contribution_id UUID,
  p_points INTEGER DEFAULT 25,
  p_feedback TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_contrib RECORD;
  v_contributor_name TEXT;
  v_recipient_name TEXT;
  v_activity_desc TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_contrib
  FROM public.community_contributions
  WHERE id = p_contribution_id;

  IF v_contrib.id IS NULL THEN
    RAISE EXCEPTION 'Contribution not found';
  END IF;

  IF NOT public.is_community_manager(v_contrib.community_id) THEN
    RAISE EXCEPTION 'Only community managers can approve contributions';
  END IF;

  IF v_contrib.status != 'pending' THEN
    RAISE EXCEPTION 'Contribution is not in pending status (currently %)', v_contrib.status;
  END IF;

  -- 1. Update contribution record
  UPDATE public.community_contributions
  SET
    status = 'approved',
    points_awarded = GREATEST(0, p_points),
    reviewer_id = v_caller_id,
    reviewer_feedback = p_feedback,
    reviewed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_contribution_id;

  -- 2. Retrieve names for public activity log
  SELECT COALESCE(full_name, split_part(email, '@', 1), 'Builder')
  INTO v_contributor_name
  FROM public.profiles
  WHERE id = v_contrib.contributor_id;

  IF v_contrib.recipient_id IS NOT NULL THEN
    SELECT COALESCE(full_name, split_part(email, '@', 1), 'peer')
    INTO v_recipient_name
    FROM public.profiles
    WHERE id = v_contrib.recipient_id;

    v_activity_desc := v_contributor_name || ' helped ' || v_recipient_name || ' with ' || v_contrib.title;
  ELSE
    v_activity_desc := v_contributor_name || ' contributed to community: ' || v_contrib.title;
  END IF;

  -- 3. Record verified points transaction in points_transactions
  IF p_points > 0 THEN
    INSERT INTO public.points_transactions (
      community_id,
      user_id,
      points,
      reason,
      entity_type,
      entity_id,
      created_by
    ) VALUES (
      v_contrib.community_id,
      v_contrib.contributor_id,
      p_points,
      'Approved contribution: ' || v_contrib.title,
      'contribution',
      v_contrib.id,
      v_caller_id
    );
  END IF;

  -- 4. Publish community activity feed entry
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    v_contrib.community_id,
    v_contrib.contributor_id,
    'Contribution approved',
    v_activity_desc,
    jsonb_build_object(
      'contribution_id', v_contrib.id,
      'points', p_points,
      'recipient_id', v_contrib.recipient_id,
      'category', v_contrib.category
    )
  );

  -- 5. Send in-app notification to contributor
  INSERT INTO public.notifications (
    recipient_id,
    community_id,
    type,
    title,
    message,
    entity_type,
    entity_id
  ) VALUES (
    v_contrib.contributor_id,
    v_contrib.community_id,
    'achievement',
    'Contribution Approved! (+' || p_points || ' pts)',
    'Your contribution "' || v_contrib.title || '" was approved by chapter leads.',
    'contribution',
    v_contrib.id
  );

  -- Also notify recipient if specified
  IF v_contrib.recipient_id IS NOT NULL AND v_contrib.recipient_id != v_contrib.contributor_id THEN
    INSERT INTO public.notifications (
      recipient_id,
      community_id,
      type,
      title,
      message,
      entity_type,
      entity_id
    ) VALUES (
      v_contrib.recipient_id,
      v_contrib.community_id,
      'community',
      'Contribution Verified',
      v_contributor_name || ' recorded assistance provided to you: "' || v_contrib.title || '"',
      'contribution',
      v_contrib.id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'contribution_id', v_contrib.id,
    'points_awarded', p_points,
    'activity_description', v_activity_desc
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: REJECT CONTRIBUTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_community_contribution(
  p_contribution_id UUID,
  p_feedback TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_contrib RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_contrib
  FROM public.community_contributions
  WHERE id = p_contribution_id;

  IF v_contrib.id IS NULL THEN
    RAISE EXCEPTION 'Contribution not found';
  END IF;

  IF NOT public.is_community_manager(v_contrib.community_id) THEN
    RAISE EXCEPTION 'Only community managers can review contributions';
  END IF;

  IF v_contrib.status != 'pending' THEN
    RAISE EXCEPTION 'Contribution is not in pending status';
  END IF;

  UPDATE public.community_contributions
  SET
    status = 'rejected',
    reviewer_id = v_caller_id,
    reviewer_feedback = p_feedback,
    reviewed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_contribution_id;

  -- Notify contributor with feedback
  INSERT INTO public.notifications (
    recipient_id,
    community_id,
    type,
    title,
    message,
    entity_type,
    entity_id
  ) VALUES (
    v_contrib.contributor_id,
    v_contrib.community_id,
    'community',
    'Contribution Review Update',
    'Your contribution "' || v_contrib.title || '" was reviewed: ' || COALESCE(p_feedback, 'Not approved at this time.'),
    'contribution',
    v_contrib.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'contribution_id', v_contrib.id,
    'status', 'rejected'
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC: ADD PROJECT MEMBER (VALIDATING COMMUNITY MEMBERSHIP)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_project_member(
  p_project_id UUID,
  p_user_id UUID,
  p_role TEXT DEFAULT 'collaborator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj RECORD;
  v_is_active_member BOOLEAN;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_proj
  FROM public.community_projects
  WHERE id = p_project_id;

  IF v_proj.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Must be manager OR project lead
  IF NOT (
    public.is_community_manager(v_proj.community_id)
    OR EXISTS (
      SELECT 1 FROM public.community_project_members
      WHERE project_id = p_project_id AND user_id = v_caller_id AND role = 'lead'
    )
    OR v_proj.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized to manage team members for this project';
  END IF;

  -- Only members of the community can be added
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = v_proj.community_id
      AND user_id = p_user_id
      AND status = 'active'
  ) INTO v_is_active_member;

  IF NOT v_is_active_member THEN
    RAISE EXCEPTION 'Only active members of this community can be assigned to the project';
  END IF;

  INSERT INTO public.community_project_members (
    project_id,
    community_id,
    user_id,
    role
  ) VALUES (
    p_project_id,
    v_proj.community_id,
    p_user_id,
    p_role
  )
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET role = EXCLUDED.role;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. RPC: REMOVE PROJECT MEMBER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_project_member(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_proj RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_proj
  FROM public.community_projects
  WHERE id = p_project_id;

  IF v_proj.id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF NOT (
    public.is_community_manager(v_proj.community_id)
    OR EXISTS (
      SELECT 1 FROM public.community_project_members
      WHERE project_id = p_project_id AND user_id = v_caller_id AND role = 'lead'
    )
    OR v_proj.created_by = v_caller_id
    OR v_caller_id = p_user_id -- Can remove self
  ) THEN
    RAISE EXCEPTION 'Unauthorized to remove team members from this project';
  END IF;

  DELETE FROM public.community_project_members
  WHERE project_id = p_project_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
