-- Folder Locks Schema
-- This table stores encrypted folder lock information

CREATE TABLE IF NOT EXISTS folder_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    lock_type VARCHAR(20) NOT NULL CHECK (lock_type IN ('passcode_4', 'passcode_6', 'password')),
    encrypted_lock_data TEXT NOT NULL, -- Encrypted passcode/password
    salt TEXT NOT NULL, -- Salt for encryption
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_locked BOOLEAN DEFAULT true,
    last_unlock_attempt TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    lockout_until TIMESTAMP WITH TIME ZONE
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_folder_locks_user_id ON folder_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_locks_category_id ON folder_locks(category_id);
CREATE INDEX IF NOT EXISTS idx_folder_locks_locked ON folder_locks(is_locked);

-- RLS (Row Level Security) policies
ALTER TABLE folder_locks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own folder locks
CREATE POLICY "Users can view their own folder locks" ON folder_locks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folder locks" ON folder_locks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folder locks" ON folder_locks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folder locks" ON folder_locks
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_folder_locks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_folder_locks_updated_at
    BEFORE UPDATE ON folder_locks
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_locks_updated_at();
