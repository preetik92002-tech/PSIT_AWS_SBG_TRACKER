-- ==============================================================================
-- Migration: 20260926000010_institution_normalization_and_uniqueness.sql
-- Description: Enforce one community tracker per institution at database level
--              through normalized institution identifiers and duplicate prevention triggers.
-- ==============================================================================

-- 1. Add institution_normalized column to communities
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS institution_normalized TEXT;

-- 2. Function to compute normalized institution string
CREATE OR REPLACE FUNCTION public.normalize_institution(raw_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF raw_name IS NULL OR length(trim(raw_name)) = 0 THEN
    RETURN '';
  END IF;

  -- Lowercase, replace non-alphanumeric with spaces, collapse multiple spaces, trim
  RETURN trim(
    regexp_replace(
      lower(
        regexp_replace(raw_name, '[^a-zA-Z0-9]+', ' ', 'g')
      ),
      '\s+', ' ', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Populate existing records
UPDATE public.communities
SET institution_normalized = public.normalize_institution(institution)
WHERE institution_normalized IS NULL OR institution_normalized = '';

-- 4. Trigger to maintain institution_normalized automatically
CREATE OR REPLACE FUNCTION public.handle_community_institution_normalization()
RETURNS TRIGGER AS $$
DECLARE
  v_normalized TEXT;
  v_existing_id UUID;
BEGIN
  v_normalized := public.normalize_institution(NEW.institution);
  NEW.institution_normalized := v_normalized;

  -- Verify no other community already claims this normalized institution
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO v_existing_id
    FROM public.communities
    WHERE institution_normalized = v_normalized
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'A community tracker already exists for this institution (ID: %). Duplicate communities are prohibited.', v_existing_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND (NEW.institution <> OLD.institution OR OLD.institution_normalized IS NULL) THEN
    SELECT id INTO v_existing_id
    FROM public.communities
    WHERE institution_normalized = v_normalized
      AND id <> NEW.id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'Another community tracker already exists for this institution (ID: %). Duplicate communities are prohibited.', v_existing_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_community_institution ON public.communities;
CREATE TRIGGER trg_normalize_community_institution
  BEFORE INSERT OR UPDATE OF institution ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_community_institution_normalization();

-- 5. Partial or full unique index on active communities
CREATE UNIQUE INDEX IF NOT EXISTS uq_communities_institution_normalized
  ON public.communities (institution_normalized)
  WHERE institution_normalized IS NOT NULL AND institution_normalized <> '';
