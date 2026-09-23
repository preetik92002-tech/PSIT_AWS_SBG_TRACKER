-- ==============================================================================
-- Migration: 20260923000003_add_profile_onboarding_and_communities.sql
-- Description: Extend profiles with onboarding attributes, add communities, members,
--              codes, atomic join function, and hardened RLS policies.
-- Project: AWS JOURNEY TRACKER (Phase 3.5 Authentication & Onboarding Redesign)
-- ==============================================================================

-- 1. Extend profiles table with onboarding fields (Non-destructive)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_address TEXT;

COMMENT ON COLUMN public.profiles.phone IS 'Optional contact phone number for community operations';
COMMENT ON COLUMN public.profiles.institution_name IS 'College, University or Organization name';
COMMENT ON COLUMN public.profiles.institution_address IS 'Location/Address of the educational or builder institution';

-- 2. Create communities table
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.communities IS 'Student builder chapters and institutional developer communities';
COMMENT ON COLUMN public.communities.manager_id IS 'Community Manager profile ID (must have admin privilege to create)';

-- Trigger for communities.updated_at
DROP TRIGGER IF EXISTS set_communities_updated_at ON public.communities;
CREATE TRIGGER set_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. Create community_members table
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_community_member UNIQUE (community_id, user_id)
);

COMMENT ON TABLE public.community_members IS 'Association between profiles and communities with chapter role';

-- 4. Create community_codes table
CREATE TABLE IF NOT EXISTS public.community_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.community_codes IS 'Shareable invite codes for joining a community';

-- 5. Indexes for performant lookups
CREATE INDEX IF NOT EXISTS idx_communities_manager ON public.communities(manager_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_comm ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_codes_code ON public.community_codes(code) WHERE active = true;

-- 6. Helper Security Functions (SECURITY DEFINER, SET search_path = public)
CREATE OR REPLACE FUNCTION public.is_community_manager(p_community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = p_community_id AND manager_id = auth.uid()
  ) OR public.is_admin();
$$;

COMMENT ON FUNCTION public.is_community_manager IS 'Verifies if auth.uid() is the manager of the given community or a platform admin.';

CREATE OR REPLACE FUNCTION public.is_community_member(p_community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id AND user_id = auth.uid()
  ) OR public.is_community_manager(p_community_id);
$$;

COMMENT ON FUNCTION public.is_community_member IS 'Verifies if auth.uid() is a member or manager of the given community.';

-- 7. Community creation lifecycle trigger (Auto-links manager & generates initial invite code)
CREATE OR REPLACE FUNCTION public.handle_community_created()
RETURNS TRIGGER AS $$
DECLARE
  v_clean_code TEXT;
BEGIN
  -- Insert creator as chapter manager
  INSERT INTO public.community_members (community_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.manager_id, 'manager', timezone('utc'::text, now()))
  ON CONFLICT (community_id, user_id) DO NOTHING;

  -- Generate default clean invite code e.g. "PSIT-4821"
  v_clean_code := UPPER(REGEXP_REPLACE(NEW.short_name, '[^A-Za-z0-9]', '', 'g'));
  IF LENGTH(v_clean_code) < 3 THEN
    v_clean_code := 'AWSB';
  END IF;
  v_clean_code := SUBSTRING(v_clean_code FROM 1 FOR 6) || '-' || LPAD(FLOOR(1000 + RANDOM() * 8999)::TEXT, 4, '0');

  INSERT INTO public.community_codes (community_id, code, active, created_at)
  VALUES (NEW.id, v_clean_code, true, timezone('utc'::text, now()))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_community_created ON public.communities;
CREATE TRIGGER on_community_created
  AFTER INSERT ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_community_created();

-- 8. Atomic Join by Community Code Function
-- SECURE: Never touches or alters global public.profiles.role
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

  -- 3. Lookup active code
  SELECT community_id INTO v_comm_id
  FROM public.community_codes
  WHERE UPPER(code) = UPPER(TRIM(p_code)) AND active = true;

  IF v_comm_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive community code';
  END IF;

  -- 4. Check existing membership
  SELECT id, role INTO v_existing_member
  FROM public.community_members
  WHERE community_id = v_comm_id AND user_id = v_user_id;

  SELECT id, name, short_name, institution, city, description
  INTO v_comm_record
  FROM public.communities
  WHERE id = v_comm_id;

  IF v_existing_member.id IS NOT NULL THEN
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

  -- 5. Insert new member with chapter role 'member'
  INSERT INTO public.community_members (community_id, user_id, role, joined_at)
  VALUES (v_comm_id, v_user_id, 'member', timezone('utc'::text, now()));

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

COMMENT ON FUNCTION public.join_community_by_code IS 'Atomically validates a community code and enrols auth.uid() as a member.';

-- 9. Preview Community By Code Function (Read-only safe lookup for preview card)
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

  SELECT c.id, c.name, c.short_name, c.institution, c.city, c.description, c.manager_id, c.created_at
  INTO v_comm
  FROM public.communities c
  JOIN public.community_codes cc ON cc.community_id = c.id
  WHERE UPPER(cc.code) = UPPER(TRIM(p_code)) AND cc.active = true;

  IF v_comm.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.community_members
  WHERE community_id = v_comm.id;

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

COMMENT ON FUNCTION public.get_community_by_code IS 'Returns public preview of a community for a valid active join code.';

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_codes ENABLE ROW LEVEL SECURITY;

-- 11. Hardened RLS Policies

-- Communities
DROP POLICY IF EXISTS "Communities are viewable by authenticated users" ON public.communities;
CREATE POLICY "Communities are viewable by authenticated users"
  ON public.communities
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert communities" ON public.communities;
CREATE POLICY "Only admins can insert communities"
  ON public.communities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() AND manager_id = auth.uid()
  );

DROP POLICY IF EXISTS "Managers can update their community" ON public.communities;
CREATE POLICY "Managers can update their community"
  ON public.communities
  FOR UPDATE
  TO authenticated
  USING (public.is_community_manager(id))
  WITH CHECK (public.is_community_manager(id));

DROP POLICY IF EXISTS "Admins can delete communities" ON public.communities;
CREATE POLICY "Admins can delete communities"
  ON public.communities
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Community Members
DROP POLICY IF EXISTS "Members can view members of their community" ON public.community_members;
CREATE POLICY "Members can view members of their community"
  ON public.community_members
  FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Managers can add members" ON public.community_members;
CREATE POLICY "Managers can add members"
  ON public.community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_community_manager(community_id));

DROP POLICY IF EXISTS "Managers can update members" ON public.community_members;
CREATE POLICY "Managers can update members"
  ON public.community_members
  FOR UPDATE
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));

DROP POLICY IF EXISTS "Users can leave or managers can remove" ON public.community_members;
CREATE POLICY "Users can leave or managers can remove"
  ON public.community_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_community_manager(community_id));

-- Community Codes
DROP POLICY IF EXISTS "Managers can view community codes" ON public.community_codes;
CREATE POLICY "Managers can view community codes"
  ON public.community_codes
  FOR SELECT
  TO authenticated
  USING (public.is_community_manager(community_id));

DROP POLICY IF EXISTS "Managers can manage community codes" ON public.community_codes;
CREATE POLICY "Managers can manage community codes"
  ON public.community_codes
  FOR ALL
  TO authenticated
  USING (public.is_community_manager(community_id))
  WITH CHECK (public.is_community_manager(community_id));
