-- 018_bookings_and_chat_schema.sql

-- ==========================================
-- 1. Bookings Table (Expanded for Inquiries)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    property_type TEXT CHECK (property_type IN ('home', 'hostel')) NOT NULL,
    property_id UUID NOT NULL, -- Logical ref to either homes or hostels
    status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
    viewing_date TIMESTAMPTZ,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Standard update trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_modtime
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Seeker can insert their own bookings
CREATE POLICY "Seekers can insert their own bookings" 
    ON public.bookings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Seeker can view their own bookings
CREATE POLICY "Seekers can view their own bookings" 
    ON public.bookings FOR SELECT 
    USING (auth.uid() = user_id);

-- Seeker can update their own bookings (e.g. cancel)
CREATE POLICY "Seekers can update their own bookings" 
    ON public.bookings FOR UPDATE 
    USING (auth.uid() = user_id);

-- Admin can read all bookings
CREATE POLICY "Admin can read all bookings" 
    ON public.bookings FOR SELECT 
    USING (public.is_admin());

-- Admin can update all bookings (e.g. approve, reject)
CREATE POLICY "Admin can update all bookings" 
    ON public.bookings FOR UPDATE 
    USING (public.is_admin());


-- ==========================================
-- 2. Chat System (Conversations & Messages)
-- ==========================================

-- Conversations: 1 per seeker
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seeker_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE, -- Only 1 active thread per seeker to start
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_seeker_id ON public.conversations(seeker_id);

CREATE TRIGGER update_conversations_modtime
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Messages inside a conversation
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- RLS for Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can view their own conversation" 
    ON public.conversations FOR SELECT 
    USING (auth.uid() = seeker_id);

CREATE POLICY "Seekers can insert their own conversation" 
    ON public.conversations FOR INSERT 
    WITH CHECK (auth.uid() = seeker_id);

CREATE POLICY "Admin can completely manage conversations" 
    ON public.conversations FOR ALL 
    USING (public.is_admin());

-- RLS for Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert messages into their conversation" 
    ON public.messages FOR INSERT 
    WITH CHECK (
        auth.uid() = sender_id AND 
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.seeker_id = auth.uid()
        )
    );

CREATE POLICY "Users can read their conversation messages" 
    ON public.messages FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.seeker_id = auth.uid()
        )
    );

-- Admins can insert and read any message
CREATE POLICY "Admins can insert any message" 
    ON public.messages FOR INSERT 
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can read any message" 
    ON public.messages FOR SELECT 
    USING (public.is_admin());

-- Users/Admins can update messages to mark them as read
CREATE POLICY "Participants can mark messages as read" 
    ON public.messages FOR UPDATE 
    USING (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.seeker_id = auth.uid()
        )
    );
