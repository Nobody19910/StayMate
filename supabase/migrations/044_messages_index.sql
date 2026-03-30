-- Performance index for unread message badge queries
CREATE INDEX IF NOT EXISTS idx_messages_conv_read ON messages(conversation_id, is_read);
