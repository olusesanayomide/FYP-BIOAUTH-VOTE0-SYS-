-- Add challenge expiration column to users table with timezone support
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_challenge_expires_at TIMESTAMPTZ;

-- Also ensure otp_expires_at uses TIMESTAMPTZ if possible (safely)
-- ALTER TABLE users ALTER COLUMN otp_expires_at TYPE TIMESTAMPTZ;
