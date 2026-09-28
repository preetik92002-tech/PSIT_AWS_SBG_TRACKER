-- ==============================================================================
-- AWS JOURNEY TRACKER - MIGRATION 000019
-- FEATURE 20: SUPABASE STORAGE + IMAGE MANAGEMENT & SECURITY POLICIES
-- ==============================================================================

-- 1. Ensure 'avatars' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Ensure 'community-media' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ------------------------------------------------------------------------------
-- 3. RLS POLICIES FOR 'avatars' BUCKET
-- Stored path format: {user_id}/avatar_{timestamp}.{ext}
-- ------------------------------------------------------------------------------

-- Public read access
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON storage.objects;
CREATE POLICY "Public avatars are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can insert their own avatar
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own avatar
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------------------------
-- 4. RLS POLICIES FOR 'community-media' BUCKET
-- Path formats:
--   - communities/{community_id}/image_{timestamp}.{ext}
--   - events/{community_id}/{event_id}/cover_{timestamp}.{ext}
-- ------------------------------------------------------------------------------

-- Public read access
DROP POLICY IF EXISTS "Public community media is viewable by everyone" ON storage.objects;
CREATE POLICY "Public community media is viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-media');

-- Authenticated community managers or platform admins can upload community media
DROP POLICY IF EXISTS "Community managers can upload community media" ON storage.objects;
CREATE POLICY "Community managers can upload community media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-media' AND (
      public.is_admin() OR
      (
        (storage.foldername(name))[1] = 'communities' AND
        public.is_community_manager(((storage.foldername(name))[2])::uuid)
      ) OR
      (
        (storage.foldername(name))[1] = 'events' AND
        public.is_community_manager(((storage.foldername(name))[2])::uuid)
      )
    )
  );

-- Authenticated community managers or platform admins can update community media
DROP POLICY IF EXISTS "Community managers can update community media" ON storage.objects;
CREATE POLICY "Community managers can update community media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'community-media' AND (
      public.is_admin() OR
      (
        (storage.foldername(name))[1] = 'communities' AND
        public.is_community_manager(((storage.foldername(name))[2])::uuid)
      ) OR
      (
        (storage.foldername(name))[1] = 'events' AND
        public.is_community_manager(((storage.foldername(name))[2])::uuid)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'community-media' AND (
      public.is_admin() OR
      (
        (storage.foldername(name))[1] = 'communities' AND
        public.is_community_manager(((storage.foldername(name))[2])::uuid)
      ) OR
      (
        (storage.foldername(name))[1] = 'events' AND
        public.is_community_manager(((storage.foldername(name))[2])::uuid)
      )
    )
  );

-- Authenticated community managers or platform admins can delete community media
DROP POLICY IF EXISTS "Community managers can delete community media" ON storage.objects;
CREATE POLICY "Community managers can delete community media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-media' AND (
      public.is_admin() OR
      (
        (storage.foldername(name))[1] = 'communities' AND
        public.is_community_manager(((storage.foldername(name))[2])::uuid)
      ) OR
      (
        (storage.foldername(name))[1] = 'events' AND
        public.is_community_manager(((storage.foldername(name))[2])::uuid)
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 5. ENSURE communities.image_url COLUMN & SYNC WITH logo_url
-- ------------------------------------------------------------------------------

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Backfill image_url from logo_url if null
UPDATE public.communities
SET image_url = logo_url
WHERE image_url IS NULL AND logo_url IS NOT NULL;

-- Trigger to keep image_url and logo_url synced automatically
CREATE OR REPLACE FUNCTION public.sync_community_image_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.image_url IS DISTINCT FROM OLD.image_url AND NEW.image_url IS NOT NULL THEN
    NEW.logo_url := NEW.image_url;
  ELSIF NEW.logo_url IS DISTINCT FROM OLD.logo_url AND NEW.logo_url IS NOT NULL THEN
    NEW.image_url := NEW.logo_url;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_community_image ON public.communities;
CREATE TRIGGER trg_sync_community_image
  BEFORE INSERT OR UPDATE ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_community_image_columns();

-- ------------------------------------------------------------------------------
-- 6. UPDATE update_community_settings RPC TO SUPPORT image_url
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_community_settings(
  p_community_id UUID,
  p_identity JSONB DEFAULT NULL,
  p_settings JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_comm RECORD;
  v_current_settings JSONB;
  v_merged_settings JSONB;
  v_new_image TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify community exists
  SELECT * INTO v_comm
  FROM public.communities
  WHERE id = p_community_id;

  IF v_comm.id IS NULL THEN
    RAISE EXCEPTION 'Community not found';
  END IF;

  -- Server-side security check: Community Manager or Platform Admin only
  IF NOT (public.is_community_manager(p_community_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Access denied: Only authorized community managers can update settings';
  END IF;

  -- Update identity fields if provided
  IF p_identity IS NOT NULL THEN
    v_new_image := COALESCE(p_identity->>'image_url', p_identity->>'logo_url');

    UPDATE public.communities
    SET
      name = COALESCE(p_identity->>'name', name),
      short_name = COALESCE(p_identity->>'short_name', short_name),
      institution = COALESCE(p_identity->>'institution', institution),
      institution_name = COALESCE(p_identity->>'institution', p_identity->>'institution_name', institution_name),
      city = COALESCE(p_identity->>'city', city),
      description = COALESCE(p_identity->>'description', description),
      logo_url = CASE
        WHEN v_new_image IS NOT NULL THEN v_new_image
        WHEN p_identity ? 'logo_url' THEN p_identity->>'logo_url'
        ELSE logo_url
      END,
      image_url = CASE
        WHEN v_new_image IS NOT NULL THEN v_new_image
        WHEN p_identity ? 'image_url' THEN p_identity->>'image_url'
        ELSE image_url
      END,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_community_id;
  END IF;

  -- Update settings JSONB if provided
  IF p_settings IS NOT NULL THEN
    SELECT COALESCE(settings, '{}'::jsonb) INTO v_current_settings
    FROM public.communities
    WHERE id = p_community_id;

    v_merged_settings := v_current_settings || p_settings;

    UPDATE public.communities
    SET
      settings = v_merged_settings,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_community_id;
  END IF;

  -- Log manager activity
  INSERT INTO public.community_activities (
    community_id,
    user_id,
    activity_type,
    description
  ) VALUES (
    p_community_id,
    v_caller_id,
    'community_settings_updated',
    'Community manager updated settings and configuration'
  );

  RETURN jsonb_build_object(
    'success', true,
    'community_id', p_community_id,
    'updated_at', timezone('utc'::text, now())
  );
END;
$$;
