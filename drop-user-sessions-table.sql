-- Drop user_sessions table and related functions
-- Run this in your Supabase SQL editor to remove single session enforcement

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_user_sessions_last_activity ON user_sessions;

-- Drop the functions
DROP FUNCTION IF EXISTS validate_session(UUID, TEXT);
DROP FUNCTION IF EXISTS register_session(UUID, TEXT, TEXT, INET, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS update_session_activity(TEXT);
DROP FUNCTION IF EXISTS is_most_recent_session(UUID, TEXT);
DROP FUNCTION IF EXISTS get_most_recent_session(UUID);
DROP FUNCTION IF EXISTS terminate_old_sessions(UUID, TEXT);
DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS update_session_last_activity();

-- Drop the table
DROP TABLE IF EXISTS user_sessions;

-- Verify cleanup
SELECT 'user_sessions table and functions have been removed' as status;