INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "authenticated upload chat attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-attachments');
CREATE POLICY "public read chat attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
