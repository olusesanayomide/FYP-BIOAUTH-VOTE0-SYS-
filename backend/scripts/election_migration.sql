-- =========================================================================
-- SQL MIGRATION REQUIRED: Update tables for Faculty, Department, and Level
-- =========================================================================

-- 1. Update school_students (source of truth)
ALTER TABLE school_students
ADD COLUMN IF NOT EXISTS faculty VARCHAR(255),
ADD COLUMN IF NOT EXISTS level INT;

-- 2. Update users (application users)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS faculty VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(255),
ADD COLUMN IF NOT EXISTS level INT;

-- 3. Update elections (to support the new UI fields)
ALTER TABLE elections
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Presidential', -- Presidential, Faculty, Departmental
ADD COLUMN IF NOT EXISTS scope_faculty VARCHAR(255) DEFAULT 'All',
ADD COLUMN IF NOT EXISTS scope_department VARCHAR(255) DEFAULT 'All',
ADD COLUMN IF NOT EXISTS scope_level INT DEFAULT 0, -- 0 means 'All', otherwise specifies level (e.g., 100, 200)
ADD COLUMN IF NOT EXISTS voting_method VARCHAR(50) DEFAULT 'Single Choice',
ADD COLUMN IF NOT EXISTS max_votes INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS biometric_enforced BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS real_time_monitoring BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE;

-- 4. Sample updates to existing dummy users (for testing)
UPDATE school_students 
SET faculty = 'Computing and Engineering Sciences', department = 'Software Engineering', level = 300 
WHERE email = 'ndidid3261@student.babcock.edu.ng';

UPDATE users 
SET faculty = 'Computing and Engineering Sciences', department = 'Software Engineering', level = 300 
WHERE email = 'ndidid3261@student.babcock.edu.ng';
