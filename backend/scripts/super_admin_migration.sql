ALTER TABLE public.admin
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';

ALTER TABLE public.admin
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

ALTER TABLE public.admin
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.admin(id) ON DELETE SET NULL;

ALTER TABLE public.admin
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

UPDATE public.admin
SET role = 'admin'
WHERE role IS NULL OR BTRIM(role) = '';

UPDATE public.admin
SET role = LOWER(role)
WHERE role IS NOT NULL;

UPDATE public.admin
SET status = 'ACTIVE'
WHERE status IS NULL OR BTRIM(status) = '';

UPDATE public.admin
SET status = UPPER(status)
WHERE status IS NOT NULL;

-- Promote your bootstrap account manually after this migration, for example:
-- UPDATE public.admin SET role = 'super_admin' WHERE email = 'you@example.com';
