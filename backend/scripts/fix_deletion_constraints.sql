-- Migration: Fix foreign key constraints for voter deletion
-- Purpose: Allow complete deletion of voters while preserving audit trails

-- 1. audit_logs: Preserve logs but detach from user
DO $$ 
BEGIN
    -- Drop existing if it exists (using common naming convention or checking system tables)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'audit_logs_user_id_fkey') THEN
        ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_user_id_fkey;
    END IF;
    
    -- Add with ON DELETE SET NULL
    ALTER TABLE public.audit_logs 
    ADD CONSTRAINT audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END $$;

-- 2. voter_records: Complete purge
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'voter_records_user_id_fkey') THEN
        ALTER TABLE public.voter_records DROP CONSTRAINT voter_records_user_id_fkey;
    END IF;
    
    ALTER TABLE public.voter_records 
    ADD CONSTRAINT voter_records_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

-- 3. votes: Complete purge (voter side)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'votes_voter_id_fkey') THEN
        ALTER TABLE public.votes DROP CONSTRAINT votes_voter_id_fkey;
    END IF;
    
    ALTER TABLE public.votes 
    ADD CONSTRAINT votes_voter_id_fkey 
    FOREIGN KEY (voter_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

-- 4. votes: Complete purge (candidate side)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'votes_selected_candidate_id_fkey') THEN
        ALTER TABLE public.votes DROP CONSTRAINT votes_selected_candidate_id_fkey;
    END IF;
    
    ALTER TABLE public.votes 
    ADD CONSTRAINT votes_selected_candidate_id_fkey 
    FOREIGN KEY (selected_candidate_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;
