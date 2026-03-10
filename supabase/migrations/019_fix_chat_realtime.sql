-- 019: Fix Chat Realtime and Admin Insert
-- Enable realtime for messages and conversations
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Fix message read/insert for admin (Admin needs to see seeker conversations)
DROP POLICY IF EXISTS "Admins can read any message" ON public.messages;
CREATE POLICY "Admins can read any message" 
    ON public.messages FOR SELECT 
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert any message" ON public.messages;
CREATE POLICY "Admins can insert any message" 
    ON public.messages FOR INSERT 
    WITH CHECK (public.is_admin());
