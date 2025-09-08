-- Drop session security tables and functions

-- Drop functions first (they depend on tables)
DROP FUNCTION IF EXISTS cleanup_expired_sessions();
DROP FUNCTION IF EXISTS get_user_active_session_count(UUID);
DROP FUNCTION IF EXISTS check_login_rate_limit(TEXT, INET, INTEGER, INTEGER);

-- Drop tables
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS login_attempts CASCADE;

-- Note: user_profiles table is kept as it's used for 2FA functionality
