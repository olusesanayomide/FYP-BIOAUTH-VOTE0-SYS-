-- =========================================================================
-- SQL MIGRATION REQUIRED: Add Supabase Storage Bucket for Candidate Photos
-- =========================================================================

-- Create the storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate_photos', 'candidate_photos', true),
       ('candidate_manifestos', 'candidate_manifestos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (select)
DROP POLICY IF EXISTS "Public read for candidate_photos" ON storage.objects;
CREATE POLICY "Public read for candidate_photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'candidate_photos');

DROP POLICY IF EXISTS "Public read for candidate_manifestos" ON storage.objects;
CREATE POLICY "Public read for candidate_manifestos"
ON storage.objects FOR SELECT
USING (bucket_id = 'candidate_manifestos');

-- Allow public to upload (needed for custom auth system)
DROP POLICY IF EXISTS "Authenticated users can upload candidate_photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload candidate_photos" ON storage.objects;
CREATE POLICY "Public can upload candidate_photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'candidate_photos');

DROP POLICY IF EXISTS "Authenticated users can upload candidate_manifestos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload candidate_manifestos" ON storage.objects;
CREATE POLICY "Public can upload candidate_manifestos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'candidate_manifestos');

-- Allow public to update (needed for custom auth system)
DROP POLICY IF EXISTS "Authenticated users can update candidate_photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can update candidate_photos" ON storage.objects;
CREATE POLICY "Public can update candidate_photos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'candidate_photos');

DROP POLICY IF EXISTS "Authenticated users can update candidate_manifestos" ON storage.objects;
DROP POLICY IF EXISTS "Public can update candidate_manifestos" ON storage.objects;
CREATE POLICY "Public can update candidate_manifestos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'candidate_manifestos');

-- Allow public to delete (needed for custom auth system)
DROP POLICY IF EXISTS "Authenticated users can delete candidate_photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete candidate_photos" ON storage.objects;
CREATE POLICY "Public can delete candidate_photos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'candidate_photos');

DROP POLICY IF EXISTS "Authenticated users can delete candidate_manifestos" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete candidate_manifestos" ON storage.objects;
CREATE POLICY "Public can delete candidate_manifestos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'candidate_manifestos');
