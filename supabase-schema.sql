-- Create credentials table
CREATE TABLE IF NOT EXISTS credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  service_url TEXT,
  credential_type TEXT DEFAULT 'basic' CHECK (credential_type IN ('basic', 'advanced')),
  username TEXT,
  password TEXT,
  custom_fields JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop columns if they exist (for existing tables)
ALTER TABLE credentials DROP COLUMN IF EXISTS api_key;
ALTER TABLE credentials DROP COLUMN IF EXISTS api_secret;

-- Add new columns for custom fields support
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS credential_type TEXT DEFAULT 'basic' CHECK (credential_type IN ('basic', 'advanced'));
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]';
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS notes TEXT;

-- Make username and password nullable for advanced credentials
ALTER TABLE credentials ALTER COLUMN username DROP NOT NULL;
ALTER TABLE credentials ALTER COLUMN password DROP NOT NULL;

-- Enable Row Level Security on credentials table
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own credentials
CREATE POLICY "Users can view their own credentials" ON credentials
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own credentials
CREATE POLICY "Users can insert their own credentials" ON credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own credentials
CREATE POLICY "Users can update their own credentials" ON credentials
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own credentials
CREATE POLICY "Users can delete their own credentials" ON credentials
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on credentials table
CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS credentials_user_id_idx ON credentials(user_id);
CREATE INDEX IF NOT EXISTS credentials_service_name_idx ON credentials(service_name);
CREATE INDEX IF NOT EXISTS credentials_credential_type_idx ON credentials(credential_type);

-- Create user_profiles table for 2FA settings
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  two_factor_backup_codes TEXT[], -- Array of backup codes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own profile
CREATE POLICY "Users can delete their own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at on user_profiles table
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON user_profiles(user_id);

-- Create email verification codes table
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'general',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on email_verification_codes table
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own verification codes
CREATE POLICY "Users can view their own verification codes" ON email_verification_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own verification codes
CREATE POLICY "Users can insert their own verification codes" ON email_verification_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own verification codes
CREATE POLICY "Users can delete their own verification codes" ON email_verification_codes
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS email_verification_codes_user_id_idx ON email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS email_verification_codes_code_idx ON email_verification_codes(code);
CREATE INDEX IF NOT EXISTS email_verification_codes_expires_at_idx ON email_verification_codes(expires_at);