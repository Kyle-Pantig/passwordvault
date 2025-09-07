-- Add settings columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS single_session_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_logout_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auto_logout_minutes INTEGER DEFAULT 30;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.single_session_enabled IS 'Whether single session mode is enabled (logout other devices on new login)';
COMMENT ON COLUMN user_profiles.auto_logout_enabled IS 'Whether auto logout after inactivity is enabled';
COMMENT ON COLUMN user_profiles.auto_logout_minutes IS 'Number of minutes before auto logout due to inactivity';
