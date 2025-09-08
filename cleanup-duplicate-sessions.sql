-- Clean up duplicate sessions and fix the current data
-- Run this in your Supabase SQL editor

-- First, let's see what we have
SELECT 
  user_id, 
  session_id, 
  device_info, 
  created_at,
  last_activity,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_activity DESC) as session_rank
FROM user_sessions 
ORDER BY user_id, last_activity DESC;

-- Delete duplicate sessions, keeping only the most recent one per user
WITH ranked_sessions AS (
  SELECT 
    id,
    user_id,
    session_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_activity DESC) as rn
  FROM user_sessions
)
DELETE FROM user_sessions 
WHERE id IN (
  SELECT id FROM ranked_sessions WHERE rn > 1
);

-- Verify cleanup
SELECT 
  user_id, 
  COUNT(*) as session_count,
  MAX(last_activity) as most_recent_activity
FROM user_sessions 
GROUP BY user_id
ORDER BY user_id;
