-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000013
-- EVENT MANAGEMENT END-TO-END: SCHEMA EXPANSION, ATTENDANCE & RPCS
-- ==============================================================================

-- 1. EXPAND community_events TABLE
ALTER TABLE public.community_events
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' NOT NULL,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS registration_required BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS highlights TEXT,
  ADD COLUMN IF NOT EXISTS achievements TEXT,
  ADD COLUMN IF NOT EXISTS project_link TEXT,
  ADD COLUMN IF NOT EXISTS github_link TEXT,
  ADD COLUMN IF NOT EXISTS slides_link TEXT,
  ADD COLUMN IF NOT EXISTS recording_link TEXT,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0 NOT NULL;

-- Status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_community_events_status'
  ) THEN
    ALTER TABLE public.community_events
      ADD CONSTRAINT chk_community_events_status
      CHECK (status IN ('draft', 'published', 'live', 'completed', 'archived', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_events_comm_status
  ON public.community_events(community_id, status);

-- 2. CREATE / EXPAND community_event_rsvps TABLE
CREATE TABLE IF NOT EXISTS public.community_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT false NOT NULL,
  attended_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.community_event_rsvps
  ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feedback TEXT;

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_user
  ON public.community_event_rsvps(event_id, user_id);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_comm_user
  ON public.community_event_rsvps(community_id, user_id);

ALTER TABLE public.community_event_rsvps ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES FOR EVENTS & RSVPS
DROP POLICY IF EXISTS "Members can view community events" ON public.community_events;
CREATE POLICY "Members can view community events"
  ON public.community_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_community_member(community_id) AND (
      status != 'draft' OR public.is_community_manager(community_id)
    )
  );

DROP POLICY IF EXISTS "Managers can manage community events" ON public.community_events;
CREATE POLICY "Managers can manage community events"
  ON public.community_events
  FOR ALL
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

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

DROP POLICY IF EXISTS "Managers can update rsvp attendance" ON public.community_event_rsvps;
CREATE POLICY "Managers can update rsvp attendance"
  ON public.community_event_rsvps
  FOR UPDATE
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

-- 4. RPC: MARK EVENT ATTENDANCE
-- Manager marks a registered builder as attended or absent, awards +25 XP if attended
CREATE OR REPLACE FUNCTION public.mark_event_attendance(
  p_event_id UUID,
  p_target_user_id UUID,
  p_attended BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_comm_id UUID;
  v_event_title TEXT;
  v_points INTEGER := 25;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT community_id, title INTO v_comm_id, v_event_title
  FROM public.community_events WHERE id = p_event_id;

  IF v_comm_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF NOT public.is_community_manager(v_comm_id) THEN
    RAISE EXCEPTION 'Unauthorized: only community managers can mark attendance';
  END IF;

  -- Update attendance in RSVP record
  UPDATE public.community_event_rsvps
  SET 
    attended = p_attended,
    attended_at = CASE WHEN p_attended THEN timezone('utc'::text, now()) ELSE NULL END
  WHERE event_id = p_event_id AND user_id = p_target_user_id;

  IF p_attended THEN
    -- Insert points transaction (+25 XP for event attendance)
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
      p_target_user_id,
      v_points,
      '+' || v_points || ' Event attended: ' || v_event_title,
      'event',
      p_event_id,
      v_caller_id
    );

    -- Log activity
    INSERT INTO public.community_activities (
      community_id,
      user_id,
      activity_type,
      description,
      metadata
    )
    VALUES (
      v_comm_id,
      p_target_user_id,
      'joined event',
      'Attended event "' || v_event_title || '" (+' || v_points || ' XP)',
      jsonb_build_object('event_id', p_event_id, 'points', v_points)
    );

    -- Send notification
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
      p_target_user_id,
      v_comm_id,
      'event',
      'Attendance Verified (+25 XP)',
      'Your attendance for "' || v_event_title || '" has been verified by your community manager.',
      'event',
      p_event_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'user_id', p_target_user_id,
    'attended', p_attended
  );
END;
$$;
