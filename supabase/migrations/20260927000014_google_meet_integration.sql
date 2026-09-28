-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000014
-- REAL GOOGLE MEET INTEGRATION: CREDENTIALS, SPACES, CONFERENCES & ATTENDANCE
-- ==============================================================================

-- 1. GOOGLE CONNECTIONS (SERVER-SIDE SECURE TOKEN STORAGE)
-- Stores OAuth tokens securely. Access to tokens is locked to service_role / security definer functions.
CREATE TABLE IF NOT EXISTS public.google_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  google_user_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] DEFAULT '{}'::text[] NOT NULL,
  status TEXT DEFAULT 'connected' NOT NULL, -- 'connected', 'revoked', 'expired', 'error'
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(community_id)
);

CREATE INDEX IF NOT EXISTS idx_google_connections_comm
  ON public.google_connections(community_id, status);

ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;

-- CRITICAL SECURITY: Never expose raw access_token or refresh_token to frontend!
-- Normal SELECT is disabled on google_connections for authenticated clients.
-- Clients must use the security definer function get_community_google_connection.
DROP POLICY IF EXISTS "Service role has full access to google_connections" ON public.google_connections;
CREATE POLICY "Service role has full access to google_connections"
  ON public.google_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. GOOGLE OAUTH STATES (REPLAY & TAMPER RESISTANT SHORT-LIVED STATE)
CREATE TABLE IF NOT EXISTS public.google_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token TEXT NOT NULL UNIQUE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  redirect_path TEXT DEFAULT '/events' NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_google_oauth_states_lookup
  ON public.google_oauth_states(state_token, used, expires_at);

ALTER TABLE public.google_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to google_oauth_states" ON public.google_oauth_states;
CREATE POLICY "Service role has full access to google_oauth_states"
  ON public.google_oauth_states
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. GOOGLE MEET SPACES
-- Conceptual model: id, community_id, event_id, created_by, google_space_name, meeting_uri, meeting_code, status, scheduled_start, scheduled_end, created_at, updated_at
CREATE TABLE IF NOT EXISTS public.google_meet_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.community_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'Community Meeting' NOT NULL,
  google_space_name TEXT NOT NULL, -- e.g. "spaces/123-abc"
  meeting_uri TEXT NOT NULL,        -- e.g. "https://meet.google.com/abc-defg-hij"
  meeting_code TEXT NOT NULL,       -- e.g. "abc-defg-hij"
  status TEXT DEFAULT 'SCHEDULED' NOT NULL, -- 'NOT_CONNECTED', 'CONNECTED', 'SCHEDULED', 'LIVE', 'ENDED', 'FAILED'
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::jsonb NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_google_meet_spaces_comm
  ON public.google_meet_spaces(community_id, status);

CREATE INDEX IF NOT EXISTS idx_google_meet_spaces_event
  ON public.google_meet_spaces(event_id);

ALTER TABLE public.google_meet_spaces ENABLE ROW LEVEL SECURITY;

-- RLS: Chapter members can view spaces
DROP POLICY IF EXISTS "Members can view google_meet_spaces" ON public.google_meet_spaces;
CREATE POLICY "Members can view google_meet_spaces"
  ON public.google_meet_spaces
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

-- RLS: Chapter managers can manage spaces
DROP POLICY IF EXISTS "Managers can manage google_meet_spaces" ON public.google_meet_spaces;
CREATE POLICY "Managers can manage google_meet_spaces"
  ON public.google_meet_spaces
  FOR ALL
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

-- 4. GOOGLE MEET CONFERENCES
-- Conference records retrieved via Meet API when a call takes place
CREATE TABLE IF NOT EXISTS public.google_meet_conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.google_meet_spaces(id) ON DELETE CASCADE,
  google_conference_record_name TEXT NOT NULL UNIQUE, -- e.g. "conferenceRecords/abc-123"
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'ACTIVE' NOT NULL, -- 'ACTIVE', 'ENDED'
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_google_meet_conf_space
  ON public.google_meet_conferences(space_id, status);

ALTER TABLE public.google_meet_conferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view google_meet_conferences" ON public.google_meet_conferences;
CREATE POLICY "Members can view google_meet_conferences"
  ON public.google_meet_conferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.google_meet_spaces s
      WHERE s.id = space_id AND public.is_community_member(s.community_id)
    )
  );

DROP POLICY IF EXISTS "Managers can manage google_meet_conferences" ON public.google_meet_conferences;
CREATE POLICY "Managers can manage google_meet_conferences"
  ON public.google_meet_conferences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.google_meet_spaces s
      WHERE s.id = space_id AND public.is_community_manager(s.community_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.google_meet_spaces s
      WHERE s.id = space_id AND public.is_community_manager(s.community_id)
    )
  );

-- 5. GOOGLE MEET PARTICIPANTS
-- Real participant records synchronized from Meet API conferenceRecords/participants
CREATE TABLE IF NOT EXISTS public.google_meet_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.google_meet_conferences(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.google_meet_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  google_participant_name TEXT NOT NULL, -- e.g. "conferenceRecords/abc/participants/456"
  display_name TEXT,
  email TEXT,
  earliest_start_time TIMESTAMPTZ,
  latest_end_time TIMESTAMPTZ,
  attendance_duration_seconds INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(conference_id, google_participant_name)
);

CREATE INDEX IF NOT EXISTS idx_google_meet_part_conf
  ON public.google_meet_participants(conference_id);

CREATE INDEX IF NOT EXISTS idx_google_meet_part_space_user
  ON public.google_meet_participants(space_id, user_id);

ALTER TABLE public.google_meet_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view google_meet_participants" ON public.google_meet_participants;
CREATE POLICY "Members can view google_meet_participants"
  ON public.google_meet_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.google_meet_spaces s
      WHERE s.id = space_id AND public.is_community_member(s.community_id)
    )
  );

DROP POLICY IF EXISTS "Managers can manage google_meet_participants" ON public.google_meet_participants;
CREATE POLICY "Managers can manage google_meet_participants"
  ON public.google_meet_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.google_meet_spaces s
      WHERE s.id = space_id AND public.is_community_manager(s.community_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.google_meet_spaces s
      WHERE s.id = space_id AND public.is_community_manager(s.community_id)
    )
  );

-- 6. GOOGLE MEET ARTIFACTS
-- Stores references to recordings, transcripts without downloading massive binary blobs
CREATE TABLE IF NOT EXISTS public.google_meet_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.google_meet_conferences(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('recording', 'transcript')),
  google_artifact_name TEXT NOT NULL,
  export_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_google_meet_art_conf
  ON public.google_meet_artifacts(conference_id, artifact_type);

ALTER TABLE public.google_meet_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view google_meet_artifacts" ON public.google_meet_artifacts;
CREATE POLICY "Members can view google_meet_artifacts"
  ON public.google_meet_artifacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.google_meet_conferences c
      JOIN public.google_meet_spaces s ON s.id = c.space_id
      WHERE c.id = conference_id AND public.is_community_member(s.community_id)
    )
  );

-- 7. SECURITY DEFINER FUNCTIONS (SAFE FRONTEND ACCESS)

-- Safe function for frontend to check Google Connection status WITHOUT reading tokens
CREATE OR REPLACE FUNCTION public.get_community_google_connection(p_community_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_rec RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_community_manager(p_community_id) THEN
    RETURN jsonb_build_object(
      'is_connected', false,
      'google_email', null,
      'status', 'unauthorized'
    );
  END IF;

  SELECT google_email, status, token_expires_at, created_at, updated_at
  INTO v_rec
  FROM public.google_connections
  WHERE community_id = p_community_id AND status = 'connected';

  IF v_rec.google_email IS NULL THEN
    RETURN jsonb_build_object(
      'is_connected', false,
      'google_email', null,
      'status', 'NOT_CONNECTED'
    );
  END IF;

  RETURN jsonb_build_object(
    'is_connected', true,
    'google_email', v_rec.google_email,
    'status', v_rec.status,
    'expires_at', v_rec.token_expires_at,
    'updated_at', v_rec.updated_at
  );
END;
$$;

-- Safe function to disconnect Google integration
CREATE OR REPLACE FUNCTION public.disconnect_community_google(p_community_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_community_manager(p_community_id) THEN
    RAISE EXCEPTION 'Unauthorized: only community managers can disconnect Google integration';
  END IF;

  DELETE FROM public.google_connections
  WHERE community_id = p_community_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
