-- Drop user_sessions table and related policies
-- Run this in your Supabase SQL editor

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop the cleanup function
DROP FUNCTION IF EXISTS cleanup_old_sessions();

-- Drop all policies on user_sessions table
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON user_sessions;

-- Drop the table
DROP TABLE IF EXISTS user_sessions;

-- Verify the table is dropped
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_sessions';
