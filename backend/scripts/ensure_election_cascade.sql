-- =========================================================================
-- SQL MIGRATION: Ensure Robust Cascading Deletes for Elections
-- =========================================================================

-- 1. Ensure 'positions' references 'elections' with CASCADE
ALTER TABLE IF EXISTS public.positions
DROP CONSTRAINT IF EXISTS positions_election_id_fkey;

ALTER TABLE IF EXISTS public.positions
ADD CONSTRAINT positions_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-- 2. Ensure 'candidates' references 'elections' with CASCADE
ALTER TABLE IF EXISTS public.candidates
DROP CONSTRAINT IF EXISTS candidates_election_id_fkey;

ALTER TABLE IF EXISTS public.candidates
ADD CONSTRAINT candidates_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-- 3. Ensure 'votes' references 'elections' and 'positions' with CASCADE
ALTER TABLE IF EXISTS public.votes
DROP CONSTRAINT IF EXISTS votes_election_id_fkey;

ALTER TABLE IF EXISTS public.votes
ADD CONSTRAINT votes_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.votes
DROP CONSTRAINT IF EXISTS votes_position_id_fkey;

ALTER TABLE IF EXISTS public.votes
ADD CONSTRAINT votes_position_id_fkey 
FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE CASCADE;

-- 4. Ensure 'voter_records' references 'elections' with CASCADE
ALTER TABLE IF EXISTS public.voter_records
DROP CONSTRAINT IF EXISTS voter_records_election_id_fkey;

ALTER TABLE IF EXISTS public.voter_records
ADD CONSTRAINT voter_records_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-- 5. Note: audit_logs uses a VARCHAR 'resource_id' so no cascade is possible/needed there.
