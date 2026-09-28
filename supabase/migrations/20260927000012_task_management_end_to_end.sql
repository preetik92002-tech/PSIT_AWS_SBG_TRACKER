-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000012
-- TASK MANAGEMENT END-TO-END: SCHEMA EXPANSION, POINTS TRANSACTIONS, & RPCS
-- ==============================================================================

-- 1. EXPAND community_tasks TABLE
ALTER TABLE public.community_tasks 
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' NOT NULL,
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'General AWS',
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;

-- Priority constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_community_tasks_priority'
  ) THEN
    ALTER TABLE public.community_tasks
      ADD CONSTRAINT chk_community_tasks_priority
      CHECK (priority IN ('normal', 'important', 'urgent'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_tasks_comm_priority
  ON public.community_tasks(community_id, priority)
  WHERE is_archived = false;

-- 2. EXPAND community_task_assignments TABLE
ALTER TABLE public.community_task_assignments
  ADD COLUMN IF NOT EXISTS submission_comment TEXT,
  ADD COLUMN IF NOT EXISTS submission_url TEXT,
  ADD COLUMN IF NOT EXISTS evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_feedback TEXT,
  ADD COLUMN IF NOT EXISTS checklist_state JSONB DEFAULT '{}'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comm_task_assign_status_sub
  ON public.community_task_assignments(community_id, status, submitted_at);

-- 3. POINTS TRANSACTIONS TABLE (TRANSACTION / HISTORY MODEL)
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  entity_type TEXT DEFAULT 'task' NOT NULL, -- 'task', 'event', 'manual', 'badge'
  entity_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_points_transactions_comm_user
  ON public.points_transactions(community_id, user_id, created_at DESC);

ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view community points transactions" ON public.points_transactions;
CREATE POLICY "Members can view community points transactions"
  ON public.points_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Managers can insert points transactions" ON public.points_transactions;
CREATE POLICY "Managers can insert points transactions"
  ON public.points_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_community_manager(community_id) OR auth.uid() IS NOT NULL);

-- 4. RPC: APPROVE TASK SUBMISSION
-- Validates manager, updates status, creates points transaction, logs activity, generates notification
CREATE OR REPLACE FUNCTION public.approve_task_submission(
  p_assignment_id UUID,
  p_review_feedback TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_comm_id UUID;
  v_user_id UUID;
  v_task_id UUID;
  v_task_title TEXT;
  v_task_points INTEGER;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch assignment & task data
  SELECT 
    a.community_id, a.user_id, a.task_id, t.title, COALESCE(t.points, 50)
  INTO 
    v_comm_id, v_user_id, v_task_id, v_task_title, v_task_points
  FROM public.community_task_assignments a
  JOIN public.community_tasks t ON t.id = a.task_id
  WHERE a.id = p_assignment_id;

  IF v_comm_id IS NULL THEN
    RAISE EXCEPTION 'Task assignment not found';
  END IF;

  -- Ensure caller is a manager
  IF NOT public.is_community_manager(v_comm_id) THEN
    RAISE EXCEPTION 'Unauthorized: only community managers can approve task submissions';
  END IF;

  -- Update assignment status
  UPDATE public.community_task_assignments
  SET 
    status = 'approved',
    completed_at = timezone('utc'::text, now()),
    reviewed_by = v_caller_id,
    reviewed_at = timezone('utc'::text, now()),
    review_feedback = p_review_feedback,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_assignment_id;

  -- Create points transaction
  INSERT INTO public.points_transactions (
    community_id,
    user_id,
    points,
    reason,
    entity_type,
    entity_id,
    created_by
  )
  VALUES (
    v_comm_id,
    v_user_id,
    v_task_points,
    '+' || v_task_points || ' Task completed: ' || v_task_title,
    'task',
    v_task_id,
    v_caller_id
  );

  -- Record community activity
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description,
    metadata
  )
  VALUES (
    v_comm_id,
    v_user_id,
    'completed task',
    'Completed task "' || v_task_title || '" (+' || v_task_points || ' XP)',
    jsonb_build_object(
      'task_id', v_task_id,
      'assignment_id', p_assignment_id,
      'points', v_task_points,
      'approved_by', v_caller_id
    )
  );

  -- Generate notification for member
  INSERT INTO public.notifications (
    recipient_id,
    community_id,
    type,
    title,
    message,
    entity_type,
    entity_id
  )
  VALUES (
    v_user_id,
    v_comm_id,
    'task',
    'Task Approved! (+' || v_task_points || ' XP)',
    'Your submission for "' || v_task_title || '" has been approved. Great job!' || 
      CASE WHEN p_review_feedback IS NOT NULL AND length(trim(p_review_feedback)) > 0 
           THEN ' Feedback: ' || trim(p_review_feedback) 
           ELSE '' 
      END,
    'task',
    v_task_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', p_assignment_id,
    'task_id', v_task_id,
    'points', v_task_points,
    'status', 'approved'
  );
END;
$$;

-- 5. RPC: REJECT TASK SUBMISSION
-- Sets assignment status to rejected, updates feedback, generates notification
CREATE OR REPLACE FUNCTION public.reject_task_submission(
  p_assignment_id UUID,
  p_review_feedback TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_comm_id UUID;
  v_user_id UUID;
  v_task_id UUID;
  v_task_title TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT 
    a.community_id, a.user_id, a.task_id, t.title
  INTO 
    v_comm_id, v_user_id, v_task_id, v_task_title
  FROM public.community_task_assignments a
  JOIN public.community_tasks t ON t.id = a.task_id
  WHERE a.id = p_assignment_id;

  IF v_comm_id IS NULL THEN
    RAISE EXCEPTION 'Task assignment not found';
  END IF;

  IF NOT public.is_community_manager(v_comm_id) THEN
    RAISE EXCEPTION 'Unauthorized: only community managers can review task submissions';
  END IF;

  -- Update assignment status to rejected
  UPDATE public.community_task_assignments
  SET 
    status = 'rejected',
    reviewed_by = v_caller_id,
    reviewed_at = timezone('utc'::text, now()),
    review_feedback = p_review_feedback,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_assignment_id;

  -- Generate notification for member
  INSERT INTO public.notifications (
    recipient_id,
    community_id,
    type,
    title,
    message,
    entity_type,
    entity_id
  )
  VALUES (
    v_user_id,
    v_comm_id,
    'task',
    'Task Needs Revision',
    'Your submission for "' || v_task_title || '" needs revision: ' || COALESCE(p_review_feedback, 'Please review requirements and resubmit.'),
    'task',
    v_task_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', p_assignment_id,
    'status', 'rejected'
  );
END;
$$;

-- 6. RPC: AWARD MANUAL POINTS
-- Allows manager to award points to any member with custom reason
CREATE OR REPLACE FUNCTION public.award_manual_points(
  p_community_id UUID,
  p_target_user_id UUID,
  p_points INTEGER,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_recipient_name TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_community_manager(p_community_id) THEN
    RAISE EXCEPTION 'Unauthorized: only community managers can award points';
  END IF;

  IF p_points <= 0 THEN
    RAISE EXCEPTION 'Points must be positive';
  END IF;

  SELECT COALESCE(full_name, 'Builder') INTO v_recipient_name
  FROM public.profiles WHERE id = p_target_user_id;

  -- Insert points transaction
  INSERT INTO public.points_transactions (
    community_id,
    user_id,
    points,
    reason,
    entity_type,
    created_by
  )
  VALUES (
    p_community_id,
    p_target_user_id,
    p_points,
    '+' || p_points || ' ' || trim(p_reason),
    'manual',
    v_caller_id
  );

  -- Record community activity
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description,
    metadata
  )
  VALUES (
    p_community_id,
    p_target_user_id,
    'earned points',
    'Earned ' || p_points || ' XP: ' || trim(p_reason),
    jsonb_build_object('awarded_by', v_caller_id, 'points', p_points)
  );

  -- Generate notification
  INSERT INTO public.notifications (
    recipient_id,
    community_id,
    type,
    title,
    message
  )
  VALUES (
    p_target_user_id,
    p_community_id,
    'achievement',
    'Points Awarded! (+' || p_points || ' XP)',
    'You received +' || p_points || ' XP from your Community Manager: ' || trim(p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'points', p_points,
    'user_id', p_target_user_id
  );
END;
$$;
