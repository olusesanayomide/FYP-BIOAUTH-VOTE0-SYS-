-- =========================================================================
-- SQL MIGRATION REQUIRED: Add Candidates Management Table
-- =========================================================================

-- Create the Candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id), -- Optional link to the actual user
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    faculty VARCHAR(255),
    department VARCHAR(255),
    party VARCHAR(100) DEFAULT 'Independent',
    bio TEXT,
    election_id uuid REFERENCES elections(id) ON DELETE CASCADE,
    election_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    photo_url TEXT,
    manifesto_url TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Indexing for fast dashboard lookups
CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_candidates_status ON candidates(status);
