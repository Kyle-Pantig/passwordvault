-- Fix the session duplication issue
-- Run this in your Supabase SQL editor

-- First, clean up all existing sessions
DELETE FROM user_sessions;

-- Update the register_session function to handle duplicates properly
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
  DELETE FROM user_sessions WHERE user_id = p_user_id;
  
  -- Insert the new session (only one per user)
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

-- Verify the fix
SELECT COUNT(*) as total_sessions FROM user_sessions;
