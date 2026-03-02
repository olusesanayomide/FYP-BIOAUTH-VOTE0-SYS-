-- ============================================
-- FIX: Cascading Deletes for Elections
-- ============================================

-- 1. Update voter_records table
ALTER TABLE IF EXISTS public.voter_records
DROP CONSTRAINT IF EXISTS voter_records_election_id_fkey;

ALTER TABLE IF EXISTS public.voter_records
ADD CONSTRAINT voter_records_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-- 2. Ensure votes table has cascade (safety check)
ALTER TABLE IF EXISTS public.votes
DROP CONSTRAINT IF EXISTS votes_election_id_fkey;

ALTER TABLE IF EXISTS public.votes
ADD CONSTRAINT votes_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-- 3. Ensure candidates table has cascade (safety check)
ALTER TABLE IF EXISTS public.candidates
DROP CONSTRAINT IF EXISTS candidates_election_id_fkey;

ALTER TABLE IF EXISTS public.candidates
ADD CONSTRAINT candidates_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-- 4. Ensure positions table has cascade (safety check)
ALTER TABLE IF EXISTS public.positions
DROP CONSTRAINT IF EXISTS positions_election_id_fkey;

ALTER TABLE IF EXISTS public.positions
ADD CONSTRAINT positions_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;
