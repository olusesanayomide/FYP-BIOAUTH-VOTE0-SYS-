-- 1. Ensure `admin` table exists
CREATE TABLE IF NOT EXISTS public.admin (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 2. Ensure `elections` table has necessary schema and Foreign Keys
ALTER TABLE public.elections 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.admin(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS biometric_enforced BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS real_time_monitoring BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scope_faculty VARCHAR(255),
ADD COLUMN IF NOT EXISTS scope_department VARCHAR(255),
ADD COLUMN IF NOT EXISTS scope_level INTEGER DEFAULT 0;

-- 3. Ensure `candidates` references `elections`
ALTER TABLE public.candidates
DROP CONSTRAINT IF EXISTS candidates_election_id_fkey;

ALTER TABLE public.candidates
ADD CONSTRAINT candidates_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-- 4. Ensure `votes` table has proper foreign keys mapping to voter and election
ALTER TABLE public.votes
DROP CONSTRAINT IF EXISTS votes_election_id_fkey,
DROP CONSTRAINT IF EXISTS votes_voter_id_fkey;

ALTER TABLE public.votes
ADD CONSTRAINT votes_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE,
ADD CONSTRAINT votes_voter_id_fkey 
FOREIGN KEY (voter_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. Ensure `audit_logs` table exists with user_id relationship
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    details JSONB,
    user_id UUID, -- Could be Voter or Admin, no hard foreign key enforcement to allow both easily, or enforce if strictly typed.
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure user table has role column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'VOTER';

-- Notifications table (for admins and voters)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_role VARCHAR(20) NOT NULL, -- 'admin' or 'voter'
    recipient_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    category VARCHAR(50) DEFAULT 'system',
    route TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_role, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Cleanup duplicate/old columns safely (Optional, omitted to avoid data loss)
