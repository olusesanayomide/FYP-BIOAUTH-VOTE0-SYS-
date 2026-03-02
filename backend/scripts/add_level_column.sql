-- Add level column to school_students, users, and candidates
ALTER TABLE IF EXISTS public.school_students 
ADD COLUMN IF NOT EXISTS level VARCHAR(10);

ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS level VARCHAR(10);

ALTER TABLE IF EXISTS public.candidates 
ADD COLUMN IF NOT EXISTS level VARCHAR(10);
