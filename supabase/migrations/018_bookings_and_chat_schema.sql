-- 018_bookings_and_chat_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Bookings Table (Expanded for Inquiries)
-- ==========================================
-- If bookings already exists but doesn't have the user_id column (because we changed schemas from Phase 1 to Phase 2 mid-flight), 
-- we will drop it since the previous table was just for demo UI tickets.
DROP TABLE IF EXISTS public.bookings CASCADE;

CREATE TABLE public.bookings (
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

CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Standard update trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bookings_modtime ON public.bookings;
CREATE TRIGGER update_bookings_modtime
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Seeker can insert their own bookings
DROP POLICY IF EXISTS "Seekers can insert their own bookings" ON public.bookings;
CREATE POLICY "Seekers can insert their own bookings" 
    ON public.bookings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Seeker can view their own bookings
DROP POLICY IF EXISTS "Seekers can view their own bookings" ON public.bookings;
CREATE POLICY "Seekers can view their own bookings" 
    ON public.bookings FOR SELECT 
    USING (auth.uid() = user_id);

-- Seeker can update their own bookings (e.g. cancel)
DROP POLICY IF EXISTS "Seekers can update their own bookings" ON public.bookings;
CREATE POLICY "Seekers can update their own bookings" 
    ON public.bookings FOR UPDATE 
    USING (auth.uid() = user_id);

-- Admin can read all bookings
DROP POLICY IF EXISTS "Admin can read all bookings" ON public.bookings;
CREATE POLICY "Admin can read all bookings" 
    ON public.bookings FOR SELECT 
    USING (public.is_admin());

-- Admin can update all bookings (e.g. approve, reject)
DROP POLICY IF EXISTS "Admin can update all bookings" ON public.bookings;
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_conversations_seeker_id'
        AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_conversations_seeker_id ON public.conversations(seeker_id);
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_conversations_modtime ON public.conversations;
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_messages_conversation_id'
        AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_messages_sender_id'
        AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
    END IF;
END $$;

-- RLS for Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seekers can view their own conversation" ON public.conversations;
CREATE POLICY "Seekers can view their own conversation" 
    ON public.conversations FOR SELECT 
    USING (auth.uid() = seeker_id);

DROP POLICY IF EXISTS "Seekers can insert their own conversation" ON public.conversations;
CREATE POLICY "Seekers can insert their own conversation" 
    ON public.conversations FOR INSERT 
    WITH CHECK (auth.uid() = seeker_id);

DROP POLICY IF EXISTS "Admin can completely manage conversations" ON public.conversations;
CREATE POLICY "Admin can completely manage conversations" 
    ON public.conversations FOR ALL 
    USING (public.is_admin());

-- RLS for Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert messages into their conversation" ON public.messages;
CREATE POLICY "Users can insert messages into their conversation" 
    ON public.messages FOR INSERT 
    WITH CHECK (
        auth.uid() = sender_id AND 
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.seeker_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can read their conversation messages" ON public.messages;
CREATE POLICY "Users can read their conversation messages" 
    ON public.messages FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.seeker_id = auth.uid()
        )
    );

-- Admins can insert and read any message
DROP POLICY IF EXISTS "Admins can insert any message" ON public.messages;
CREATE POLICY "Admins can insert any message" 
    ON public.messages FOR INSERT 
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read any message" ON public.messages;
CREATE POLICY "Admins can read any message" 
    ON public.messages FOR SELECT 
    USING (public.is_admin());

-- Users/Admins can update messages to mark them as read
DROP POLICY IF EXISTS "Participants can mark messages as read" ON public.messages;
CREATE POLICY "Participants can mark messages as read" 
    ON public.messages FOR UPDATE 
    USING (
        public.is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.conversations c 
            WHERE c.id = conversation_id AND c.seeker_id = auth.uid()
        )
    );

