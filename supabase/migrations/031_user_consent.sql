-- Record user consent for terms of service and data collection
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consents jsonb DEFAULT '{}';

-- Example stored value:
-- { "terms_accepted": true, "terms_accepted_at": "2026-03-18T12:00:00Z",
--   "privacy_accepted": true, "privacy_accepted_at": "2026-03-18T12:00:00Z" }
