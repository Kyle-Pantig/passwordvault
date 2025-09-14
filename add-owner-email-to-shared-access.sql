-- Add owner_email column to shared_folder_access table
ALTER TABLE shared_folder_access ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Update existing records with owner emails from auth.users
-- Note: This requires service role access
UPDATE shared_folder_access 
SET owner_email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = shared_folder_access.owner_id
)
WHERE owner_email IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_shared_folder_access_owner_email ON shared_folder_access(owner_email);
