/**
 * Biometric Voting System - Supabase Database Schema
 * 
 * This SQL script sets up all required tables for the biometric voting system.
 * Run this in Supabase SQL Editor to initialize the database.
 * 
 * Tables:
 * - school_students: Institutional student records (source of truth)
 * - users: Application users with authentication credentials
 * - authenticators: WebAuthn credentials (encrypted)
 * - elections: Voting events
 * - positions: Positions within elections (President, Vice President, etc)
 * - candidates: Candidates running for positions
 * - votes: Individual votes cast by users (double voting prevention)
 * - voter_records: Track which users voted in which elections (double voting prevention)
 * - audit_logs: Security audit trail
 * - admin: System administrators
 */

-- ============================================
-- SCHOOL STUDENTS TABLE
-- ============================================
-- Source of truth for institutional student records
CREATE TABLE IF NOT EXISTS school_students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  matric_no VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  enrollment_status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_school_students_matric_no ON school_students(matric_no);
CREATE INDEX idx_school_students_email ON school_students(email);

-- ============================================
-- USERS TABLE
-- ============================================
-- Application users with authentication credentials
CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  matric_no VARCHAR(50) NOT NULL UNIQUE,
  school_student_id uuid REFERENCES school_students(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) DEFAULT 'STUDENT',
  role VARCHAR(50) DEFAULT 'VOTER',
  
  -- Authentication
  password_hash VARCHAR(255),
  
  -- WebAuthn/Biometric
  webauthn_registered BOOLEAN DEFAULT FALSE,
  -- Registration completion flag: set to TRUE only after OTP verified + biometric enrolled
  registration_completed BOOLEAN DEFAULT FALSE,
  current_challenge VARCHAR(1024),
  
  -- OTP fields
  otp_hash VARCHAR(255),
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INT DEFAULT 0,
  last_otp_request_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_matric_no ON users(matric_no);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_school_student_id ON users(school_student_id);

-- ============================================
-- AUTHENTICATORS TABLE (WebAuthn)
-- ============================================
-- Stores encrypted WebAuthn credentials for biometric voting
CREATE TABLE IF NOT EXISTS authenticators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id VARCHAR(1024) NOT NULL UNIQUE,
  
  -- Encrypted public key
  public_key_encrypted TEXT NOT NULL,
  public_key_iv VARCHAR(32) NOT NULL,
  
  -- Counter for replay attack prevention
  counter INT DEFAULT 0,
  
  -- Backup fields for passkeys
  backup_eligible BOOLEAN DEFAULT FALSE,
  backup_state BOOLEAN DEFAULT FALSE,
  
  -- Transport mechanisms
  transports TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_authenticators_user_id ON authenticators(user_id);

-- ============================================
-- ELECTIONS TABLE
-- ============================================
-- Voting events/elections
CREATE TABLE IF NOT EXISTS elections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'DRAFT',
  
  -- Eligibility
  eligible_types TEXT[] DEFAULT ARRAY['STUDENT']::TEXT[],
  
  -- Timeline
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_elections_status ON elections(status);

-- ============================================
-- POSITIONS TABLE
-- ============================================
-- Positions within elections (President, VP, etc)
CREATE TABLE IF NOT EXISTS positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  election_id uuid NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_positions_election_id ON positions(election_id);

-- ============================================
-- CANDIDATES TABLE
-- ============================================
-- Candidates running for positions
-- NOTE: Candidate records are represented by `users` entries for students
-- Students who run for a `position` are stored as `users` with role/flags
-- The `votes` table references `users` directly to represent selected candidates.

-- ============================================
-- VOTES TABLE
-- ============================================
-- Individual votes with WebAuthn verification proof
CREATE TABLE IF NOT EXISTS votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id uuid NOT NULL REFERENCES users(id),
  election_id uuid NOT NULL REFERENCES elections(id),
  position_id uuid NOT NULL REFERENCES positions(id),
  selected_candidate_id uuid NOT NULL REFERENCES users(id),
  
  -- WebAuthn verification
  webauthn_verified BOOLEAN DEFAULT FALSE,
  webauthn_timestamp TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent double voting per position
  UNIQUE(voter_id, election_id, position_id),
  -- Prevent voting for yourself (voter cannot equal selected candidate)
  CHECK (voter_id <> selected_candidate_id)
);

CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_election_id ON votes(election_id);

-- ============================================
-- VOTER RECORDS TABLE
-- ============================================
-- Track which users participated in which elections (double voting prevention)
CREATE TABLE IF NOT EXISTS voter_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  election_id uuid NOT NULL REFERENCES elections(id),
  voted_at TIMESTAMPTZ DEFAULT now(),
  
  -- One record per user per election
  UNIQUE(user_id, election_id)
);

CREATE INDEX idx_voter_records_user_id ON voter_records(user_id);
CREATE INDEX idx_voter_records_election_id ON voter_records(election_id);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
-- Security audit trail for all system actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  details TEXT,
  status VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- ADMIN TABLE
-- ============================================
-- System administrators
CREATE TABLE IF NOT EXISTS admin (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  
  can_manage_elections BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  can_manage_candidates BOOLEAN DEFAULT FALSE,
  can_view_audit_logs BOOLEAN DEFAULT TRUE,
  
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_username ON admin(username);
CREATE INDEX idx_admin_email ON admin(email);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Sample school student
INSERT INTO school_students (matric_no, email, full_name, department)
VALUES 
  ('22/0086', 'ndidid3261@student.babcock.edu.ng', 'Ndidi Destiny', 'Software Engineering'),
  ('22/0087', 'janesmith@student.babcock.edu.ng', 'Jane Smith', 'Engineering'),
  ('22/0088', 'apagudavid@student.babcock.edu.ng', 'Apagu David', 'Computer Science')
ON CONFLICT (matric_no) DO NOTHING;

-- Enable Row Level Security (optional, for production security)
-- ALTER TABLE school_students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
