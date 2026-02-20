-- ========================================
-- FEATURE EXPANSION MIGRATIONS
-- CinYstore - Persona → Buzz → Release Heatmap → Campaign
-- ========================================
-- Run this in Supabase SQL Editor after existing setup scripts
-- All changes are ADDITIVE and BACKWARD-COMPATIBLE
-- ========================================

-- ========================================
-- 1. PROJECT_METADATA - Add initial media links
-- ========================================

-- Add initial_media_links to store trailer/teaser URLs from onboarding
ALTER TABLE public.project_metadata
ADD COLUMN IF NOT EXISTS initial_media_links JSONB DEFAULT NULL;

COMMENT ON COLUMN public.project_metadata.initial_media_links IS 
'Optional media links added during onboarding. Structure: {"primary_trailer_url": "...", "secondary_videos": ["...", "..."]}';

-- ========================================
-- 2. PERSONAS - Add target audience clusters
-- ========================================

-- Add target cluster fields (simplified abstraction layer for Release & Campaign modules)
ALTER TABLE public.personas
ADD COLUMN IF NOT EXISTS target_core_clusters JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS target_secondary_clusters JSONB DEFAULT NULL;

COMMENT ON COLUMN public.personas.target_core_clusters IS 
'Core target audience clusters derived from persona segments. Example: ["MASS_SINGLE_SCREEN", "URBAN_YOUTH_MULTIPLEX"]';

COMMENT ON COLUMN public.personas.target_secondary_clusters IS 
'Secondary target audience clusters. Example: ["FAMILY_FESTIVAL", "NICHE_CINEPHILE"]';

-- ========================================
-- 3. COMPETITION_CALENDAR - Extended fields
-- ========================================

-- Create competition_calendar table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.competition_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_date DATE NOT NULL,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    region_primary TEXT,
    scale TEXT, -- e.g., 'big', 'mid', 'small'
    genre TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new fields for competition analysis
ALTER TABLE public.competition_calendar
ADD COLUMN IF NOT EXISTS target_clusters JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS external_buzz_score FLOAT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.competition_calendar.target_clusters IS 
'Target audience clusters for this competing film. Used for clash analysis.';

COMMENT ON COLUMN public.competition_calendar.external_buzz_score IS 
'Approximate buzz score (0-100) for competing title, manually entered or estimated.';

COMMENT ON COLUMN public.competition_calendar.is_confirmed IS 
'Whether this release date is confirmed (true) or tentative/rumoured (false).';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_competition_calendar_release_date 
    ON public.competition_calendar(release_date);
CREATE INDEX IF NOT EXISTS idx_competition_calendar_language 
    ON public.competition_calendar(language);

-- Enable RLS
ALTER TABLE public.competition_calendar ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read competition data (public info)
DROP POLICY IF EXISTS "All users can view competition calendar" ON public.competition_calendar;
CREATE POLICY "All users can view competition calendar"
    ON public.competition_calendar
    FOR SELECT
    USING (true);

-- Only admins/specific roles can insert/update (for future)
-- For now, allow authenticated users to insert (can be restricted later)
DROP POLICY IF EXISTS "Authenticated users can manage competition calendar" ON public.competition_calendar;
CREATE POLICY "Authenticated users can manage competition calendar"
    ON public.competition_calendar
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ========================================
-- 4. RELEASE_WINDOWS - Extended metadata
-- ========================================

-- Create release_windows table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.release_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    label TEXT,
    risk_level TEXT, -- 'high', 'medium', 'low'
    pros TEXT[],
    cons TEXT[],
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new fields for enhanced release analysis
ALTER TABLE public.release_windows
ADD COLUMN IF NOT EXISTS primary_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS score_numeric FLOAT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expected_buzz_delta FLOAT DEFAULT NULL;

COMMENT ON COLUMN public.release_windows.primary_date IS 
'Single recommended release date within the corridor (if applicable).';

COMMENT ON COLUMN public.release_windows.score_numeric IS 
'Internal score used for ranking dates (0-100, higher is better).';

COMMENT ON COLUMN public.release_windows.expected_buzz_delta IS 
'Simple estimate of buzz change if released on this date (e.g., +10, 0, -5).';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_release_windows_project_id 
    ON public.release_windows(project_id);
CREATE INDEX IF NOT EXISTS idx_release_windows_start_date 
    ON public.release_windows(start_date);

-- Enable RLS
ALTER TABLE public.release_windows ENABLE ROW LEVEL SECURITY;

-- Users can view release windows for their projects
DROP POLICY IF EXISTS "Users can view release windows for their projects" ON public.release_windows;
CREATE POLICY "Users can view release windows for their projects"
    ON public.release_windows
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()
        )
    );

-- Users can insert/update release windows for their projects
DROP POLICY IF EXISTS "Users can manage release windows for their projects" ON public.release_windows;
CREATE POLICY "Users can manage release windows for their projects"
    ON public.release_windows
    FOR ALL
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()
        )
    );

-- ========================================
-- 5. PROJECTS - Add confirmed release date
-- ========================================

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS confirmed_release_date DATE DEFAULT NULL;

COMMENT ON COLUMN public.projects.confirmed_release_date IS 
'Producer-confirmed release date selected from heatmap analysis.';

-- ========================================
-- 6. CAMPAIGN_BLUEPRINTS - Create if not exists
-- ========================================

CREATE TABLE IF NOT EXISTS public.campaign_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    summary TEXT,
    next_14_days_actions JSONB DEFAULT '[]',
    channels_focus JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaign_blueprints_project_id 
    ON public.campaign_blueprints(project_id);

-- Enable RLS
ALTER TABLE public.campaign_blueprints ENABLE ROW LEVEL SECURITY;

-- Users can view campaign blueprints for their projects
DROP POLICY IF EXISTS "Users can view campaign blueprints for their projects" ON public.campaign_blueprints;
CREATE POLICY "Users can view campaign blueprints for their projects"
    ON public.campaign_blueprints
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()
        )
    );

-- Users can manage campaign blueprints for their projects
DROP POLICY IF EXISTS "Users can manage campaign blueprints for their projects" ON public.campaign_blueprints;
CREATE POLICY "Users can manage campaign blueprints for their projects"
    ON public.campaign_blueprints
    FOR ALL
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()
        )
    );

-- ========================================
-- 7. Helper Tables - Exam & Festival Calendar (Optional)
-- ========================================

-- Exam calendar for avoiding student exam periods
CREATE TABLE IF NOT EXISTS public.exam_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region TEXT NOT NULL, -- 'AP/TG', 'TN', 'KA', 'KL', etc.
    exam_type TEXT NOT NULL, -- 'school_board', 'college_sem', 'competitive'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_calendar_dates 
    ON public.exam_calendar(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_exam_calendar_region 
    ON public.exam_calendar(region);

-- Enable RLS (public read)
ALTER TABLE public.exam_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can view exam calendar" ON public.exam_calendar;
CREATE POLICY "All users can view exam calendar"
    ON public.exam_calendar
    FOR SELECT
    USING (true);

-- Festival/holiday calendar for identifying favorable release windows
CREATE TABLE IF NOT EXISTS public.festival_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_name TEXT NOT NULL,
    region TEXT, -- NULL = pan-India/pan-South
    date DATE NOT NULL,
    favorable_for_clusters JSONB DEFAULT '[]', -- e.g., ["FAMILY_FESTIVAL"]
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_festival_calendar_date 
    ON public.festival_calendar(date);
CREATE INDEX IF NOT EXISTS idx_festival_calendar_region 
    ON public.festival_calendar(region);

-- Enable RLS (public read)
ALTER TABLE public.festival_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can view festival calendar" ON public.festival_calendar;
CREATE POLICY "All users can view festival calendar"
    ON public.festival_calendar
    FOR SELECT
    USING (true);

-- ========================================
-- 8. Update Triggers for new tables
-- ========================================

-- Trigger for competition_calendar updated_at
CREATE OR REPLACE FUNCTION public.update_competition_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS competition_calendar_updated_at ON public.competition_calendar;
CREATE TRIGGER competition_calendar_updated_at
    BEFORE UPDATE ON public.competition_calendar
    FOR EACH ROW
    EXECUTE FUNCTION public.update_competition_calendar_updated_at();

-- Trigger for release_windows updated_at
CREATE OR REPLACE FUNCTION public.update_release_windows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS release_windows_updated_at ON public.release_windows;
CREATE TRIGGER release_windows_updated_at
    BEFORE UPDATE ON public.release_windows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_release_windows_updated_at();

-- Trigger for campaign_blueprints updated_at
CREATE OR REPLACE FUNCTION public.update_campaign_blueprints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_blueprints_updated_at ON public.campaign_blueprints;
CREATE TRIGGER campaign_blueprints_updated_at
    BEFORE UPDATE ON public.campaign_blueprints
    FOR EACH ROW
    EXECUTE FUNCTION public.update_campaign_blueprints_updated_at();

-- ========================================
-- 9. Sample Data for Testing (Optional)
-- ========================================

-- NOTE: Competition data will be auto-imported from CSV file (public/assets/updated_movies.csv)
-- Use the Competition Manager page (/competition) to import data

-- Insert sample exam periods
INSERT INTO public.exam_calendar (region, exam_type, start_date, end_date, description)
VALUES 
    ('AP/TG', 'school_board', '2026-03-15', '2026-03-30', 'SSC/Intermediate Board Exams'),
    ('TN', 'school_board', '2026-03-10', '2026-03-25', 'HSC Board Exams'),
    ('KA', 'college_sem', '2026-04-01', '2026-04-15', 'University Semester Exams')
ON CONFLICT DO NOTHING;

-- Insert sample festivals
INSERT INTO public.festival_calendar (festival_name, region, date, favorable_for_clusters, notes)
VALUES 
    ('Ugadi', 'AP/TG/KA', '2026-03-22', '["FAMILY_FESTIVAL"]', 'Telugu/Kannada New Year - favorable for family films'),
    ('Tamil New Year', 'TN', '2026-04-14', '["FAMILY_FESTIVAL"]', 'Favorable for family-oriented releases'),
    ('Sankranti', 'Pan South', '2026-01-14', '["FAMILY_FESTIVAL", "MASS_SINGLE_SCREEN"]', 'Peak release window for mass + family films')
ON CONFLICT DO NOTHING;

-- ========================================
-- COMPLETED!
-- ========================================
-- All migrations applied successfully.
-- Existing data is preserved and unaffected.
-- New features can now use these extended schemas.
-- ========================================
