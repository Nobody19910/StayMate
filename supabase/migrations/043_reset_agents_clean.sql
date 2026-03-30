-- Clean slate: reset all agent subscription data
UPDATE profiles
SET is_agent = false,
    agent_subscription_until = NULL,
    agent_subscription_ref = NULL
WHERE is_agent = true OR role = 'agent';

UPDATE profiles SET role = 'seeker' WHERE role = 'agent';
