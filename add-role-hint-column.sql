-- Add role_hint column to team_invites table (if not exists)
-- This stores the predefined role for team members (director, writer, hero, etc.)

-- Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'team_invites' 
        AND column_name = 'role_hint'
    ) THEN
        ALTER TABLE public.team_invites ADD COLUMN role_hint TEXT;
    END IF;
END $$;

-- Create index for faster lookups by role
CREATE INDEX IF NOT EXISTS idx_team_invites_role_hint ON public.team_invites(role_hint);
