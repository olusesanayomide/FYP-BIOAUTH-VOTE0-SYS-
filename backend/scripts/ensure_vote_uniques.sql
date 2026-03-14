-- Migration: Ensure vote uniqueness constraints to prevent double voting
-- Purpose: Enforce one vote per position per election, and one voter record per election.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'votes_voter_election_position_unique'
      AND table_name = 'votes'
  ) THEN
    ALTER TABLE public.votes
    ADD CONSTRAINT votes_voter_election_position_unique
    UNIQUE (voter_id, election_id, position_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'voter_records_user_election_unique'
      AND table_name = 'voter_records'
  ) THEN
    ALTER TABLE public.voter_records
    ADD CONSTRAINT voter_records_user_election_unique
    UNIQUE (user_id, election_id);
  END IF;
END $$;
