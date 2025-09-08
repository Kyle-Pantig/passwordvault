-- Complete cleanup of all rate limiting functions and tables
-- Run this to start fresh with the new database rate limiting

-- Drop all existing functions
DROP FUNCTION IF EXISTS is_ip_rate_limited(INET);
DROP FUNCTION IF EXISTS is_email_rate_limited(TEXT);
DROP FUNCTION IF EXISTS record_failed_login_attempt(INET, TEXT);
DROP FUNCTION IF EXISTS reset_login_attempts(INET, TEXT);
DROP FUNCTION IF EXISTS cleanup_old_login_attempts();
DROP FUNCTION IF EXISTS increment_attempt_count(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all existing tables
DROP TABLE IF EXISTS login_attempts_ip CASCADE;
DROP TABLE IF EXISTS login_attempts_email CASCADE;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS update_login_attempts_ip_updated_at ON login_attempts_ip;
DROP TRIGGER IF EXISTS update_login_attempts_email_updated_at ON login_attempts_email;
DROP TRIGGER IF EXISTS update_credentials_updated_at ON credentials;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Recreate the update_updated_at_column function (needed for other tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate triggers for existing tables
CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
