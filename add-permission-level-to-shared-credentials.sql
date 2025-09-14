-- Add permission_level column to shared_credentials table
ALTER TABLE shared_credentials ADD COLUMN IF NOT EXISTS permission_level TEXT DEFAULT 'read' CHECK (permission_level IN ('read', 'write'));

-- Update existing shared_credentials with permission_level from shared_folder_access
UPDATE shared_credentials 
SET permission_level = sfa.permission_level
FROM shared_folder_access sfa
WHERE shared_credentials.folder_id = sfa.folder_id 
AND shared_credentials.shared_with_user_id = sfa.shared_with_user_id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_shared_credentials_permission_level ON shared_credentials(permission_level);
