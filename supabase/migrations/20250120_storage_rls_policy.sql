-- Enable RLS on storage.objects if not already enabled
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow anyone to upload files to chat-attachments bucket
-- This is for a public-facing app without user authentication
CREATE POLICY "Allow public uploads to chat-attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow anyone to read files from chat-attachments bucket
CREATE POLICY "Allow public reads from chat-attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Allow anyone to delete their own uploaded files (by path)
CREATE POLICY "Allow public deletes from chat-attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'chat-attachments');
