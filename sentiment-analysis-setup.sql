-- ========================================
-- FILM SENTIMENT ANALYSIS TABLE
-- ========================================
-- This table stores sentiment analysis results from YouTube comments
-- on film promotional content (trailers, teasers, interviews)
-- ========================================

-- Create film_sentiment_analysis table
CREATE TABLE IF NOT EXISTS public.film_sentiment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Sentiment percentages (must add up to 100)
    positive_sentiment INTEGER NOT NULL CHECK (positive_sentiment >= 0 AND positive_sentiment <= 100),
    neutral_sentiment INTEGER NOT NULL CHECK (neutral_sentiment >= 0 AND neutral_sentiment <= 100),
    negative_sentiment INTEGER NOT NULL CHECK (negative_sentiment >= 0 AND negative_sentiment <= 100),
    
    -- Summary and key insights
    summary_opinion TEXT NOT NULL,
    key_positive_1 TEXT NOT NULL,
    key_positive_2 TEXT NOT NULL,
    key_positive_3 TEXT NOT NULL,
    
    -- Concern factors and action strategies
    concern_factor_1 TEXT NOT NULL,
    concern_problem_1 TEXT NOT NULL,
    action_strategy_1 TEXT NOT NULL,
    
    concern_factor_2 TEXT NOT NULL,
    concern_problem_2 TEXT NOT NULL,
    action_strategy_2 TEXT NOT NULL,
    
    concern_factor_3 TEXT NOT NULL,
    concern_problem_3 TEXT NOT NULL,
    action_strategy_3 TEXT NOT NULL,
    
    -- Analysis metadata
    video_sources TEXT[] NOT NULL, -- Array of YouTube URLs analyzed
    total_comments_analyzed INTEGER NOT NULL DEFAULT 0,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.film_sentiment_analysis ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view sentiment analysis for their projects" ON public.film_sentiment_analysis;
DROP POLICY IF EXISTS "Users can insert sentiment analysis for their projects" ON public.film_sentiment_analysis;
DROP POLICY IF EXISTS "Users can update sentiment analysis for their projects" ON public.film_sentiment_analysis;
DROP POLICY IF EXISTS "Users can delete sentiment analysis for their projects" ON public.film_sentiment_analysis;

-- Create policy to allow users to read sentiment analysis for their projects
CREATE POLICY "Users can view sentiment analysis for their projects"
    ON public.film_sentiment_analysis
    FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()
        )
    );

-- Create policy to allow users to insert sentiment analysis for their projects
CREATE POLICY "Users can insert sentiment analysis for their projects"
    ON public.film_sentiment_analysis
    FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()
        )
    );

-- Create policy to allow users to update sentiment analysis for their projects
CREATE POLICY "Users can update sentiment analysis for their projects"
    ON public.film_sentiment_analysis
    FOR UPDATE
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

-- Create policy to allow users to delete sentiment analysis for their projects
CREATE POLICY "Users can delete sentiment analysis for their projects"
    ON public.film_sentiment_analysis
    FOR DELETE
    USING (
        project_id IN (
            SELECT id FROM public.projects WHERE owner_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_film_sentiment_project_id 
    ON public.film_sentiment_analysis(project_id);

CREATE INDEX IF NOT EXISTS idx_film_sentiment_analyzed_at 
    ON public.film_sentiment_analysis(analyzed_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_film_sentiment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_film_sentiment_analysis_updated_at ON public.film_sentiment_analysis;

-- Create trigger to call the function before update
CREATE TRIGGER update_film_sentiment_analysis_updated_at
    BEFORE UPDATE ON public.film_sentiment_analysis
    FOR EACH ROW
    EXECUTE FUNCTION public.update_film_sentiment_updated_at();

-- Add constraint to ensure sentiments add up to 100
ALTER TABLE public.film_sentiment_analysis
ADD CONSTRAINT check_sentiment_total 
CHECK (positive_sentiment + neutral_sentiment + negative_sentiment = 100);

-- ========================================
-- COMPLETED!
-- ========================================
-- The film_sentiment_analysis table is ready.
-- 
-- Table structure:
-- - Stores sentiment analysis from YouTube comments
-- - Links to projects via project_id
-- - Contains positive/neutral/negative sentiment percentages
-- - Stores key positive aspects and audience concerns
-- - Includes action strategies for addressing concerns
-- - Tracks which YouTube videos were analyzed
-- - RLS policies ensure users only see their own data
-- ========================================
