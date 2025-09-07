-- Temporarily disable RLS for testing
-- WARNING: Only use this for testing, re-enable RLS in production!

-- Disable RLS temporarily
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- Test if we can now query the table
SELECT COUNT(*) as total_sessions FROM user_sessions;

-- If this works, you can re-enable RLS later with:
-- ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
