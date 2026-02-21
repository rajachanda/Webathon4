-- Migration: Add ai_insights column to buzz_snapshots table
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor
-- This adds AI insights storage to existing buzz_snapshots table
-- ========================================

-- Add ai_insights column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'buzz_snapshots' 
    AND column_name = 'ai_insights'
  ) THEN
    ALTER TABLE public.buzz_snapshots ADD COLUMN ai_insights TEXT;
    RAISE NOTICE 'Column ai_insights added successfully';
  ELSE
    RAISE NOTICE 'Column ai_insights already exists';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.buzz_snapshots.ai_insights IS 'AI-generated insights from Groq analysis';

-- ========================================
-- COMPLETED!
-- ========================================
