-- 022: Add property context columns to conversations
-- This allows the Admin Inbox to display exactly which property an inquiry is about directly in the chat

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS property_id text,
ADD COLUMN IF NOT EXISTS property_type text,
ADD COLUMN IF NOT EXISTS property_title text,
ADD COLUMN IF NOT EXISTS property_image text;
