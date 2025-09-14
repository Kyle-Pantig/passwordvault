-- Folder Sharing Schema for Pro Users
-- Allows Pro users to share folders with up to 5 other users via email invitations

-- Table for sharing invitations
CREATE TABLE IF NOT EXISTS folder_sharing_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Set when user accepts
    permission_level TEXT NOT NULL DEFAULT 'read' CHECK (permission_level IN ('read', 'write')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    invitation_token TEXT NOT NULL UNIQUE, -- Secure token for invitation
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint for pending invitations per folder per email
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitations 
ON folder_sharing_invitations(folder_id, invited_email) 
WHERE status = 'pending';

-- Table for shared folder access
CREATE TABLE IF NOT EXISTS shared_folder_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level TEXT NOT NULL DEFAULT 'read' CHECK (permission_level IN ('read', 'write')),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure unique access per user per folder
    UNIQUE(folder_id, shared_with_user_id)
);

-- Table for shared credentials (credentials accessible to shared users)
CREATE TABLE IF NOT EXISTS shared_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique sharing per credential per user
    UNIQUE(credential_id, shared_with_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_folder_sharing_invitations_owner ON folder_sharing_invitations(owner_id);
CREATE INDEX IF NOT EXISTS idx_folder_sharing_invitations_invited_email ON folder_sharing_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_folder_sharing_invitations_invited_user ON folder_sharing_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_folder_sharing_invitations_status ON folder_sharing_invitations(status);
CREATE INDEX IF NOT EXISTS idx_folder_sharing_invitations_token ON folder_sharing_invitations(invitation_token);

CREATE INDEX IF NOT EXISTS idx_shared_folder_access_owner ON shared_folder_access(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_folder_access_shared_with ON shared_folder_access(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_folder_access_folder ON shared_folder_access(folder_id);

CREATE INDEX IF NOT EXISTS idx_shared_credentials_owner ON shared_credentials(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_credentials_shared_with ON shared_credentials(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_credentials_folder ON shared_credentials(folder_id);

-- RLS Policies for security
ALTER TABLE folder_sharing_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_folder_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_credentials ENABLE ROW LEVEL SECURITY;

-- Policies for folder_sharing_invitations
CREATE POLICY "Users can view their own invitations" ON folder_sharing_invitations
    FOR SELECT USING (
        auth.uid() = owner_id OR 
        auth.uid() = invited_user_id OR
        (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    );

CREATE POLICY "Users can create invitations for their folders" ON folder_sharing_invitations
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id AND
        EXISTS (
            SELECT 1 FROM categories 
            WHERE id = folder_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own invitations" ON folder_sharing_invitations
    FOR UPDATE USING (
        auth.uid() = owner_id OR 
        auth.uid() = invited_user_id
    );

-- Policies for shared_folder_access
CREATE POLICY "Users can view shared folders they have access to" ON shared_folder_access
    FOR SELECT USING (
        auth.uid() = owner_id OR 
        auth.uid() = shared_with_user_id
    );

CREATE POLICY "Users can create shared access for their folders" ON shared_folder_access
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id AND
        EXISTS (
            SELECT 1 FROM categories 
            WHERE id = folder_id AND user_id = auth.uid()
        )
    );

-- Policies for shared_credentials
CREATE POLICY "Users can view shared credentials they have access to" ON shared_credentials
    FOR SELECT USING (
        auth.uid() = owner_id OR 
        auth.uid() = shared_with_user_id
    );

CREATE POLICY "Users can create shared credentials for their folders" ON shared_credentials
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id AND
        EXISTS (
            SELECT 1 FROM categories 
            WHERE id = folder_id AND user_id = auth.uid()
        )
    );

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE folder_sharing_invitations 
    SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get user's shared folders
CREATE OR REPLACE FUNCTION get_user_shared_folders(user_id UUID)
RETURNS TABLE (
    folder_id UUID,
    folder_name TEXT,
    folder_color TEXT,
    folder_icon TEXT,
    owner_email TEXT,
    permission_level TEXT,
    shared_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as folder_id,
        c.name as folder_name,
        c.color as folder_color,
        c.icon as folder_icon,
        u.email as owner_email,
        sfa.permission_level,
        sfa.shared_at
    FROM shared_folder_access sfa
    JOIN categories c ON c.id = sfa.folder_id
    JOIN auth.users u ON u.id = sfa.owner_id
    WHERE sfa.shared_with_user_id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's pending invitations
CREATE OR REPLACE FUNCTION get_user_pending_invitations(user_email TEXT)
RETURNS TABLE (
    invitation_id UUID,
    folder_id UUID,
    folder_name TEXT,
    folder_color TEXT,
    folder_icon TEXT,
    owner_email TEXT,
    permission_level TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fsi.id as invitation_id,
        c.id as folder_id,
        c.name as folder_name,
        c.color as folder_color,
        c.icon as folder_icon,
        u.email as owner_email,
        fsi.permission_level,
        fsi.expires_at,
        fsi.created_at
    FROM folder_sharing_invitations fsi
    JOIN categories c ON c.id = fsi.folder_id
    JOIN auth.users u ON u.id = fsi.owner_id
    WHERE fsi.invited_email = user_email 
    AND fsi.status = 'pending'
    AND fsi.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;
