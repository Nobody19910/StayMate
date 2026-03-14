-- 027: Set REPLICA IDENTITY FULL on messages and conversations
-- Required for Supabase realtime postgres_changes to deliver filtered payloads
-- (column-level filters only work with REPLICA IDENTITY FULL)
ALTER TABLE public.messages      REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Also allow admin to UPDATE messages (needed for mark-as-read)
DROP POLICY IF EXISTS "Admins can update any message" ON public.messages;
CREATE POLICY "Admins can update any message"
    ON public.messages FOR UPDATE
    USING (public.is_admin());

-- Allow seekers to update their own received messages (mark as read)
DROP POLICY IF EXISTS "Seekers can mark messages read" ON public.messages;
CREATE POLICY "Seekers can mark messages read"
    ON public.messages FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND c.seeker_id = auth.uid()
      )
    );
