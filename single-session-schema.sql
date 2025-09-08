-- Single Session Enforcement Schema
-- This schema implements single session per user functionality

-- Create user_sessions table to track active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL, -- Supabase session ID
  device_info TEXT, -- Optional: store device/browser info
  ip_address INET, -- Optional: store IP address
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable Row Level Security on user_sessions table
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own sessions
CREATE POLICY "Users can insert their own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own sessions
CREATE POLICY "Users can update their own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own sessions
CREATE POLICY "Users can delete their own sessions" ON user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_session_id_idx ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS user_sessions_last_activity_idx ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to terminate all sessions except the most recent one for a user
CREATE OR REPLACE FUNCTION terminate_old_sessions(p_user_id UUID, p_current_session_id TEXT)
RETURNS void AS $$
BEGIN
  -- Delete all sessions for the user except the current one
  DELETE FROM user_sessions 
  WHERE user_id = p_user_id 
    AND session_id != p_current_session_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get the most recent session for a user
CREATE OR REPLACE FUNCTION get_most_recent_session(p_user_id UUID)
RETURNS TABLE(session_id TEXT, last_activity TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT us.session_id, us.last_activity
  FROM user_sessions us
  WHERE us.user_id = p_user_id
  ORDER BY us.last_activity DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if a session is the most recent one
CREATE OR REPLACE FUNCTION is_most_recent_session(p_user_id UUID, p_session_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  most_recent_session_id TEXT;
BEGIN
  SELECT session_id INTO most_recent_session_id
  FROM get_most_recent_session(p_user_id);
  
  RETURN p_session_id = most_recent_session_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(p_session_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE user_sessions 
  SET last_activity = NOW()
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to register a new session
CREATE OR REPLACE FUNCTION register_session(
  p_user_id UUID,
  p_session_id TEXT,
  p_device_info TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
)
RETURNS void AS $$
BEGIN
  -- First, terminate all old sessions for this user
  PERFORM terminate_old_sessions(p_user_id, p_session_id);
  
  -- Insert the new session
  INSERT INTO user_sessions (
    user_id,
    session_id,
    device_info,
    ip_address,
    expires_at
  ) VALUES (
    p_user_id,
    p_session_id,
    p_device_info,
    p_ip_address,
    p_expires_at
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to validate session and terminate if not most recent
CREATE OR REPLACE FUNCTION validate_session(p_user_id UUID, p_session_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
  -- Check if session exists and is not expired
  SELECT EXISTS(
    SELECT 1 FROM user_sessions 
    WHERE user_id = p_user_id 
      AND session_id = p_session_id 
      AND expires_at > NOW()
  ) INTO is_valid;
  
  -- If session doesn't exist or is expired, return false
  IF NOT is_valid THEN
    RETURN FALSE;
  END IF;
  
  -- Check if this is the most recent session
  IF NOT is_most_recent_session(p_user_id, p_session_id) THEN
    -- This is not the most recent session, delete it
    DELETE FROM user_sessions 
    WHERE user_id = p_user_id 
      AND session_id = p_session_id;
    RETURN FALSE;
  END IF;
  
  -- Update last activity
  PERFORM update_session_activity(p_session_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_activity on session updates
CREATE OR REPLACE FUNCTION update_session_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_sessions_last_activity
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_activity();

-- Create a scheduled job to clean up expired sessions (if using pg_cron extension)
-- Note: This requires the pg_cron extension to be enabled in Supabase
-- You can also call cleanup_expired_sessions() manually or from your application
