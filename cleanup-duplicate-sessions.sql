-- Cleanup script to fix duplicate sessions in user_sessions table
-- Run this AFTER adding the UNIQUE constraint

-- First, let's see what we have
SELECT 
  user_id, 
  COUNT(*) as session_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM user_sessions 
GROUP BY user_id 
ORDER BY session_count DESC;

-- Keep only the most recent session for each user
-- This will mark all but the latest session as inactive
WITH latest_sessions AS (
  SELECT 
    user_id,
    MAX(created_at) as latest_created_at
  FROM user_sessions 
  WHERE is_active = true
  GROUP BY user_id
)
UPDATE user_sessions 
SET is_active = false
WHERE (user_id, created_at) NOT IN (
  SELECT user_id, latest_created_at 
  FROM latest_sessions
)
AND is_active = true;

-- Alternative approach: Keep only one session per user (the most recent one)
-- Uncomment this if you want to completely remove old sessions instead of marking them inactive

/*
WITH latest_sessions AS (
  SELECT 
    user_id,
    MAX(created_at) as latest_created_at
  FROM user_sessions 
  GROUP BY user_id
)
DELETE FROM user_sessions 
WHERE (user_id, created_at) NOT IN (
  SELECT user_id, latest_created_at 
  FROM latest_sessions
);
*/

-- Verify the cleanup
SELECT 
  user_id, 
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions
FROM user_sessions 
GROUP BY user_id 
ORDER BY total_sessions DESC;
