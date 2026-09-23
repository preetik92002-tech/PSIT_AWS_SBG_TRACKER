-- ==============================================================================
-- Migration: 20260923000002_fix_rls_recursion_and_privacy.sql
-- Description: Fix RLS recursion, harden admin privilege checks, and protect email privacy
-- Project: AWS BUILDER HUB (Level 2 Security Checkpoint)
-- ==============================================================================

-- 1. Create secure helper function for admin verification
-- SECURITY DEFINER executes with owner privileges to bypass RLS, eliminating recursion.
-- STABLE allows PostgreSQL to cache the result within a single query/statement.
-- SET search_path = public prevents search-path hijacking attacks.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Secure, non-recursive verification of admin privilege for the authenticated session.';

-- 2. Drop legacy policies with recursion / privacy issues
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- 3. Replace with hardened, non-recursive RLS policies

-- SELECT: Restrict full profile table access (including emails) to authenticated community members.
-- Anonymous/unauthenticated internet users cannot harvest builder email addresses.
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE (Self): Users can update their own profile fields.
-- Anti-escalation: Members cannot set their role to 'admin' (role must remain 'member' unless current user is admin).
-- Completely eliminates subquery on profiles table, preventing RLS recursion.
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND (
      role = 'member' OR public.is_admin()
    )
  );

-- UPDATE (Admin): Admins can update any profile and assign roles.
-- Uses public.is_admin() which runs without triggering RLS recursion.
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Public View for Unauthenticated Community Showcase (Zero Email Leakage)
-- Exposes builder showcase info while strictly omitting private email addresses.
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT
    id,
    full_name,
    avatar_url,
    role,
    aws_builder_alias,
    aws_builder_profile_url,
    bio,
    joined_at,
    created_at
  FROM public.profiles;

COMMENT ON VIEW public.public_profiles IS 'Public community view hiding sensitive member account data (e.g. emails).';

-- Grant read access on the public view to anonymous visitors and authenticated users
GRANT SELECT ON public.public_profiles TO anon, authenticated;
