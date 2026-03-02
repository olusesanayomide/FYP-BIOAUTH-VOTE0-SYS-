-- Migration: Add status to users table for voter management
-- Purpose: Support suspending and deleting voters

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- Add index for status lookups (useful for middleware)
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Ensure all existing users are marked as ACTIVE if not already
UPDATE public.users SET status = 'ACTIVE' WHERE status IS NULL;

-- Log the migration action if audit_logs exists
-- INSERT INTO audit_logs (action, details) VALUES ('MIGRATION', '{"name": "voter_management_migration"}');
