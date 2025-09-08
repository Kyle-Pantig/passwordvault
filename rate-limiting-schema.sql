-- Database rate limiting schema (simplified approach)
-- This uses direct table queries instead of complex functions

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS login_attempts_ip (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  attempt_count INTEGER DEFAULT 1,
  first_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_locked BOOLEAN DEFAULT FALSE,
  lockout_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_attempts_email (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  attempt_count INTEGER DEFAULT 1,
  first_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_locked BOOLEAN DEFAULT FALSE,
  lockout_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS login_attempts_ip_address_idx ON login_attempts_ip(ip_address);
CREATE INDEX IF NOT EXISTS login_attempts_ip_last_attempt_idx ON login_attempts_ip(last_attempt);
CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts_email(email);
CREATE INDEX IF NOT EXISTS login_attempts_email_last_attempt_idx ON login_attempts_email(last_attempt);

-- Create function to increment attempt count
CREATE OR REPLACE FUNCTION increment_attempt_count(
  table_name TEXT,
  identifier_column TEXT,
  identifier_value TEXT
)
RETURNS void AS $$
DECLARE
  sql_query TEXT;
BEGIN
  sql_query := format('
    UPDATE %I 
    SET attempt_count = attempt_count + 1, 
        last_attempt = NOW(),
        updated_at = NOW()
    WHERE %I = %L',
    table_name, identifier_column, identifier_value);
  
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old attempts
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM login_attempts_ip 
  WHERE last_attempt < NOW() - INTERVAL '24 hours';
  
  DELETE FROM login_attempts_email 
  WHERE last_attempt < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DROP TRIGGER IF EXISTS update_login_attempts_ip_updated_at ON login_attempts_ip;
CREATE TRIGGER update_login_attempts_ip_updated_at
  BEFORE UPDATE ON login_attempts_ip
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_login_attempts_email_updated_at ON login_attempts_email;
CREATE TRIGGER update_login_attempts_email_updated_at
  BEFORE UPDATE ON login_attempts_email
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
