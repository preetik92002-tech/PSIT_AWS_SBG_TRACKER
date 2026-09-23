-- ==============================================================================
-- Migration: 20260923000001_create_profiles_and_trigger.sql
-- Description: Create public.profiles table and automatic user creation trigger
-- Project: AWS BUILDER HUB (Level 2 Database Foundation)
-- ==============================================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  aws_builder_alias TEXT,
  aws_builder_profile_url TEXT,
  bio TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comments for PostgreSQL documentation and schema inspectors
COMMENT ON TABLE public.profiles IS 'Community member and administrator profiles for AWS Builder Hub';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users(id). Primary key and foreign key for all future modules';
COMMENT ON COLUMN public.profiles.role IS 'Platform access tier: admin or member. Defaults strictly to member';
COMMENT ON COLUMN public.profiles.aws_builder_alias IS 'Unique AWS Community Builder alias handle';

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_aws_builder_alias 
  ON public.profiles(aws_builder_alias) 
  WHERE aws_builder_alias IS NOT NULL;

-- 3. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Secure Automatic Profile Creation Function on Signup
-- SECURITY DEFINER ensures function runs with elevated database privileges
-- SET search_path = public prevents search-path manipulation vulnerabilities
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    role,
    aws_builder_alias,
    aws_builder_profile_url,
    bio,
    joined_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    'member', -- SECURE: Always default to member. Client cannot specify admin during signup
    COALESCE(NEW.raw_user_meta_data->>'aws_builder_alias', NULL),
    COALESCE(NEW.raw_user_meta_data->>'aws_builder_profile_url', NULL),
    COALESCE(NEW.raw_user_meta_data->>'bio', NULL),
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to community builder profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Allow authenticated users to update their own profile fields
-- Prevents users from escalating their own role to admin
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update any profile (including changing roles)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
