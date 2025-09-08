-- Check current sessions in database
SELECT 
  id,
  user_id,
  session_id,
  device_info,
  last_activity,
  created_at,
  expires_at
FROM user_sessions 
ORDER BY last_activity DESC;
