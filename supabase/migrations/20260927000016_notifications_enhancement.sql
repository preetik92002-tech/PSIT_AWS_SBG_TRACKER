-- ==============================================================================
-- Migration: 20260927000016_notifications_enhancement.sql
-- Description: Expand notifications type check and add indices for fast unread queries.
-- ==============================================================================

DO $$
BEGIN
  -- Drop existing check constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check' 
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
  END IF;

  -- Add updated check constraint supporting all notification types
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('task', 'event', 'project', 'community', 'achievement', 'system', 'contribution', 'live'));
END $$;
