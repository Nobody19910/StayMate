-- 020: Fix Admin Messages RLS 
-- Admins need more lenient access to insert and read.

-- First, drop the old policies that might be restricting us
DROP POLICY IF EXISTS "Users can insert messages into their conversation" ON public.messages;
DROP POLICY IF EXISTS "Admins can insert any message" ON public.messages;
DROP POLICY IF EXISTS "Admins can read any message" ON public.messages;

-- Create an overarching policy for Admins that handles ALL operations on messages
CREATE POLICY "Admins have full access to messages" 
    ON public.messages FOR ALL 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Re-add the Seeker insert policy without conflicting with admin
CREATE POLICY "Seekers can insert messages into their conversation" 
    ON public.messages FOR INSERT 
    WITH CHECK (
        auth.uid() = sender_id AND 
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.seeker_id = auth.uid()
        )
    );
