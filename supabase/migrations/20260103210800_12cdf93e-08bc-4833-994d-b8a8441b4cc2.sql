-- Add department column to profiles for categorizing users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'team_member';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.department IS 'User department: customer, manager, accounting, team_member';