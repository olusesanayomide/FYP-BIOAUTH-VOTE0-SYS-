-- Admin Authentication Enhancements Migration
-- Run this in your Supabase SQL Editor

-- 1. Add new columns to admin table
ALTER TABLE public.admin
ADD COLUMN IF NOT EXISTS webauthn_registered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS registration_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS registration_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_challenge VARCHAR(1024),
ADD COLUMN IF NOT EXISTS current_challenge_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0;

-- 2. Create admin_authenticators table
CREATE TABLE IF NOT EXISTS public.admin_authenticators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
    credential_id VARCHAR(1024) NOT NULL UNIQUE,
    public_key_encrypted TEXT NOT NULL,
    public_key_iv VARCHAR(32) NOT NULL,
    counter INT DEFAULT 0,
    transports TEXT[] DEFAULT ARRAY[]::TEXT[],
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_admin_auth_admin_id ON public.admin_authenticators(admin_id);
