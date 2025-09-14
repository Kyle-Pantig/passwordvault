-- Create a function to update shared credentials permissions
CREATE OR REPLACE FUNCTION update_shared_credentials_permissions()
RETURNS void AS $$
BEGIN
  UPDATE shared_credentials 
  SET permission_level = sfa.permission_level
  FROM shared_folder_access sfa
  WHERE shared_credentials.folder_id = sfa.folder_id 
    AND shared_credentials.shared_with_user_id = sfa.shared_with_user_id
    AND shared_credentials.permission_level IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Call the function
SELECT update_shared_credentials_permissions();

-- Verify the update
SELECT 
  sc.credential_id,
  sc.folder_id,
  sc.permission_level,
  sfa.permission_level as folder_permission
FROM shared_credentials sc
JOIN shared_folder_access sfa ON sc.folder_id = sfa.folder_id 
  AND sc.shared_with_user_id = sfa.shared_with_user_id
LIMIT 10;
