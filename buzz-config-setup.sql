-- Buzz Configuration Setup
-- ========================================
-- IMPORTANT: Run this SQL in Supabase Dashboard → SQL Editor
-- 
-- Prerequisites:
-- 1. Make sure you're logged into Supabase Dashboard
-- 2. These tables are independent - no other tables required
-- ========================================
--
-- NOTE: user_id and project_id are stored as plain UUIDs without foreign key constraints.
-- This makes the schema portable and avoids dependency issues.
-- ========================================

-- Stores YouTube URLs for automatic buzz metrics calculation
-- Model: YouTube (60%) + Google Trends (40%)

-- Create buzz_config table
CREATE TABLE IF NOT EXISTS public.buzz_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  youtube_urls TEXT[] DEFAULT '{}',
  instagram_handle TEXT,
  film_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Create buzz_snapshots table
-- Stores historical buzz score calculations
CREATE TABLE IF NOT EXISTS public.buzz_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  buzz_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  watch_time_norm DECIMAL(5,2) NOT NULL DEFAULT 0,
  share_rate_norm DECIMAL(5,2) NOT NULL DEFAULT 0,
  sentiment_score_norm DECIMAL(5,2) NOT NULL DEFAULT 0,
  search_growth_norm DECIMAL(5,2) NOT NULL DEFAULT 0,
  engagement_rate_norm DECIMAL(5,2) NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_buzz_config_project_id ON public.buzz_config(project_id);
CREATE INDEX IF NOT EXISTS idx_buzz_config_user_id ON public.buzz_config(user_id);

-- Create indexes for buzz_snapshots
CREATE INDEX IF NOT EXISTS idx_buzz_snapshots_project_id ON public.buzz_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_buzz_snapshots_user_id ON public.buzz_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_buzz_snapshots_created_at ON public.buzz_snapshots(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.buzz_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buzz_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to allow re-running this script
DROP POLICY IF EXISTS "Users can view their own buzz config" ON public.buzz_config;
DROP POLICY IF EXISTS "Users can insert their own buzz config" ON public.buzz_config;
DROP POLICY IF EXISTS "Users can update their own buzz config" ON public.buzz_config;
DROP POLICY IF EXISTS "Users can delete their own buzz config" ON public.buzz_config;

DROP POLICY IF EXISTS "Users can view their own buzz snapshots" ON public.buzz_snapshots;
DROP POLICY IF EXISTS "Users can insert their own buzz snapshots" ON public.buzz_snapshots;
DROP POLICY IF EXISTS "Users can delete their own buzz snapshots" ON public.buzz_snapshots;

-- RLS Policies for buzz_config
CREATE POLICY "Users can view their own buzz config"
  ON public.buzz_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own buzz config"
  ON public.buzz_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buzz config"
  ON public.buzz_config FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own buzz config"
  ON public.buzz_config FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for buzz_snapshots
CREATE POLICY "Users can view their own buzz snapshots"
  ON public.buzz_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own buzz snapshots"
  ON public.buzz_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own buzz snapshots"
  ON public.buzz_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_buzz_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS buzz_config_updated_at ON public.buzz_config;
CREATE TRIGGER buzz_config_updated_at
  BEFORE UPDATE ON public.buzz_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_buzz_config_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buzz_config TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.buzz_snapshots TO authenticated;

COMMENT ON TABLE public.buzz_config IS 'Stores configuration for automatic buzz metrics calculation (YouTube URLs, film name)';
COMMENT ON COLUMN public.buzz_config.youtube_urls IS 'Array of YouTube video URLs (trailers, teasers, interviews)';
COMMENT ON COLUMN public.buzz_config.instagram_handle IS 'Instagram account handle (deprecated, not used in calculation)';
COMMENT ON COLUMN public.buzz_config.film_name IS 'Film name for Google Trends analysis';

COMMENT ON TABLE public.buzz_snapshots IS 'Historical buzz score calculations. Model: YouTube (60%) + Google Trends (40%)';
COMMENT ON COLUMN public.buzz_snapshots.buzz_score IS 'Calculated buzz score (0-100)';
COMMENT ON COLUMN public.buzz_snapshots.watch_time_norm IS 'Normalized watch time metric (0-1)';
COMMENT ON COLUMN public.buzz_snapshots.share_rate_norm IS 'Normalized share rate metric (0-1)';
COMMENT ON COLUMN public.buzz_snapshots.sentiment_score_norm IS 'Normalized sentiment score (0-1)';
COMMENT ON COLUMN public.buzz_snapshots.search_growth_norm IS 'Normalized search growth metric (0-1)';
COMMENT ON COLUMN public.buzz_snapshots.engagement_rate_norm IS 'Normalized engagement rate metric (0-1)';
COMMENT ON COLUMN public.buzz_snapshots.metadata IS 'Additional calculation metadata (JSON)';

-- ========================================
-- COMPLETED!
-- ========================================
-- Tables created successfully.
-- You can now use the Buzz Score feature in your app.
-- ========================================
