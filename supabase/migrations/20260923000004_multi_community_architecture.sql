-- ==============================================================================
-- Migration: 20260923000004_multi_community_architecture.sql
-- Description: Transition AWS Journey Tracker to Multi-Community Architecture.
--              Decouples platform account from community membership.
--              Enables any authenticated user to create/manage chapters.
--              Implements scoped RLS and community membership isolation.
-- ==============================================================================

-- 1. Enhance public.communities table
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS institution_name TEXT;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Backfill institution_name from legacy institution column
UPDATE public.communities 
SET institution_name = institution 
WHERE institution_name IS NULL AND institution IS NOT NULL;

-- Backfill created_by from legacy manager_id column
UPDATE public.communities 
SET created_by = manager_id 
WHERE created_by IS NULL AND manager_id IS NOT NULL;

-- 2. Enhance public.community_members table
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 3. Enhance public.community_codes table
ALTER TABLE public.community_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.community_codes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.community_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Sync legacy active column to is_active
UPDATE public.community_codes 
SET is_active = active 
WHERE is_active IS NULL AND active IS NOT NULL;

-- 4. Additional Indexes for Multi-Community Performance
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON public.communities(created_by);
CREATE INDEX IF NOT EXISTS idx_communities_is_active ON public.communities(is_active);
CREATE INDEX IF NOT EXISTS idx_community_members_status ON public.community_members(status);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON public.community_members(role);
CREATE INDEX IF NOT EXISTS idx_community_codes_is_active ON public.community_codes(code) WHERE is_active = true;

-- 5. Updated Security Check Functions (Eliminates recursive RLS and strictly checks community membership role)
CREATE OR REPLACE FUNCTION public.is_community_manager(p_community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id 
      AND user_id = auth.uid() 
      AND role = 'manager'
      AND status = 'active'
  ) OR public.is_admin();
$$;

COMMENT ON FUNCTION public.is_community_manager IS 'Verifies if auth.uid() is an active manager of the specified community or a platform admin.';

CREATE OR REPLACE FUNCTION public.is_community_member(p_community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id 
      AND user_id = auth.uid()
      AND status = 'active'
  ) OR public.is_admin();
$$;

COMMENT ON FUNCTION public.is_community_member IS 'Verifies if auth.uid() is an active member or manager of the specified community.';

-- 6. Trigger for Community Creation Lifecycle
CREATE OR REPLACE FUNCTION public.handle_community_created()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
  v_clean_code TEXT;
BEGIN
  -- Determine creator profile ID
  v_creator_id := COALESCE(NEW.created_by, NEW.manager_id, auth.uid());

  -- Ensure created_by and manager_id are synchronized
  NEW.created_by := v_creator_id;
  NEW.manager_id := v_creator_id;

  -- 1. Automatically enroll creator as MANAGER in community_members (NOT platform admin!)
  INSERT INTO public.community_members (community_id, user_id, role, status, joined_at)
  VALUES (NEW.id, v_creator_id, 'manager', 'active', timezone('utc'::text, now()))
  ON CONFLICT (community_id, user_id) DO UPDATE
  SET role = 'manager', status = 'active';

  -- 2. Auto-generate initial active invite code (e.g., PSIT-4821)
  v_clean_code := UPPER(REGEXP_REPLACE(NEW.short_name, '[^A-Za-z0-9]', '', 'g'));
  IF LENGTH(v_clean_code) < 3 THEN
    v_clean_code := 'AWSB';
  END IF;
  v_clean_code := SUBSTRING(v_clean_code FROM 1 FOR 6) || '-' || LPAD(FLOOR(1000 + RANDOM() * 8999)::TEXT, 4, '0');

  INSERT INTO public.community_codes (community_id, code, is_active, active, created_by, created_at)
  VALUES (NEW.id, v_clean_code, true, true, v_creator_id, timezone('utc'::text, now()))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_community_created ON public.communities;
CREATE TRIGGER on_community_created
  AFTER INSERT ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_community_created();

-- 7. Join Community by Code (Atomic & Secure)
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

  -- 3. Lookup active and non-expired code
  SELECT community_id INTO v_comm_id
  FROM public.community_codes
  WHERE UPPER(code) = UPPER(TRIM(p_code))
    AND (is_active = true OR active = true)
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

  -- 6. Insert new member with role = 'member' (NEVER changes profiles.role!)
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

-- 8. Preview Community by Code
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
    AND (cc.is_active = true OR cc.active = true)
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

-- 9. Helper Function to Fetch All Communities for Current User
CREATE OR REPLACE FUNCTION public.get_user_communities()
RETURNS TABLE (
  id UUID,
  name TEXT,
  short_name TEXT,
  institution_name TEXT,
  city TEXT,
  state TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  role TEXT,
  member_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    c.short_name,
    COALESCE(c.institution_name, c.institution) AS institution_name,
    c.city,
    c.state,
    c.description,
    c.logo_url,
    c.banner_url,
    cm.role,
    (SELECT COUNT(*) FROM public.community_members m WHERE m.community_id = c.id AND m.status = 'active') AS member_count,
    c.created_at
  FROM public.communities c
  JOIN public.community_members cm ON cm.community_id = c.id
  WHERE cm.user_id = auth.uid()
    AND cm.status = 'active'
    AND c.is_active = true
  ORDER BY (cm.role = 'manager') DESC, cm.joined_at DESC;
$$;

-- 10. Update RLS Policies for Multi-Community Architecture

-- Communities Table
DROP POLICY IF EXISTS "Communities are viewable by authenticated users" ON public.communities;
CREATE POLICY "Communities are viewable by authenticated users"
  ON public.communities
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_community_manager(id));

-- ANY authenticated user can create their own community!
DROP POLICY IF EXISTS "Only admins can insert communities" ON public.communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;
CREATE POLICY "Authenticated users can create communities"
  ON public.communities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR manager_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can update their community" ON public.communities;
CREATE POLICY "Managers can update their community"
  ON public.communities
  FOR UPDATE
  TO authenticated
  USING (public.is_community_manager(id))
  WITH CHECK (public.is_community_manager(id));

DROP POLICY IF EXISTS "Admins can delete communities" ON public.communities;
CREATE POLICY "Managers and admins can delete communities"
  ON public.communities
  FOR DELETE
  TO authenticated
  USING (public.is_community_manager(id) OR public.is_admin());

-- Community Members Table
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

-- Community Codes Table
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

-- 11. Data Migration: Seed Initial Canonical "AWS SBG PSIT Kanpur" Chapter for Existing Admin
DO $$
DECLARE
  v_admin_id UUID;
  v_psit_comm_id UUID;
BEGIN
  -- Find existing admin account
  SELECT id INTO v_admin_id FROM public.profiles WHERE email = 'awsbuildertracker@gmail.com';

  IF v_admin_id IS NOT NULL THEN
    -- Check if PSIT chapter already exists
    SELECT id INTO v_psit_comm_id FROM public.communities WHERE short_name = 'PSIT-AWS';

    IF v_psit_comm_id IS NULL THEN
      INSERT INTO public.communities (
        name,
        short_name,
        institution_name,
        institution,
        city,
        state,
        description,
        created_by,
        manager_id,
        is_active
      )
      VALUES (
        'AWS Student Builder Group PSIT Kanpur',
        'PSIT-AWS',
        'Pranveer Singh Institute of Technology',
        'Pranveer Singh Institute of Technology',
        'Kanpur',
        'Uttar Pradesh',
        'Founding chapter for cloud architects, builders, and developers at PSIT Kanpur.',
        v_admin_id,
        v_admin_id,
        true
      )
      RETURNING id INTO v_psit_comm_id;

      -- Enroll admin as manager
      INSERT INTO public.community_members (community_id, user_id, role, status, joined_at)
      VALUES (v_psit_comm_id, v_admin_id, 'manager', 'active', timezone('utc'::text, now()))
      ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'manager';

      -- Create canonical invite code
      INSERT INTO public.community_codes (community_id, code, is_active, active, created_by, created_at)
      VALUES (v_psit_comm_id, 'PSIT-KNP-4821', true, true, v_admin_id, timezone('utc'::text, now()))
      ON CONFLICT (code) DO NOTHING;
    END IF;
  END IF;
END $$;
