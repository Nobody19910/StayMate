-- Fix any existing agents that have is_agent=true but role wasn't set to 'agent'
UPDATE profiles
SET role = 'agent'
WHERE is_agent = true
  AND agent_subscription_until > now()
  AND role != 'agent';

-- Also fix agents that somehow have role='agent' but is_agent=false
UPDATE profiles
SET is_agent = true
WHERE role = 'agent'
  AND (is_agent IS NULL OR is_agent = false);

-- For agents whose subscription has expired, revert to 'owner'
UPDATE profiles
SET role = 'owner', is_agent = false
WHERE is_agent = true
  AND (agent_subscription_until IS NULL OR agent_subscription_until <= now());
