-- Campaign Section Upgrade Migration
-- Adds action_progress column to track checklist state
-- Run this in your Supabase SQL editor

-- Add action_progress column to campaign_blueprints
ALTER TABLE public.campaign_blueprints 
ADD COLUMN IF NOT EXISTS action_progress JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.campaign_blueprints.action_progress IS 
'Stores user progress on campaign actions: { "actions": [{ "id": "day_-14_0", "completed": true }] }';

-- No data migration needed (nullable, defaults to NULL)
