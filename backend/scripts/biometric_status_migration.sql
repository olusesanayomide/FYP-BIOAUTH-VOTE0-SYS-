-- Migration: Add biometric_status to users table
-- Purpose: Track real-time biometric verification status for voters

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'biometric_status_type') THEN
        CREATE TYPE biometric_status_type AS ENUM ('PENDING', 'VERIFIED', 'FAILED');
    END IF;
END $$;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS biometric_status VARCHAR(20) DEFAULT 'PENDING';

-- Update existing users who have already registered WebAuthn
UPDATE users 
SET biometric_status = 'VERIFIED' 
WHERE webauthn_registered = TRUE;

-- Add a comment for clarity
COMMENT ON COLUMN users.biometric_status IS 'Current biometric verification state: PENDING, VERIFIED, or FAILED';
