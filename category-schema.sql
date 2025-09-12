-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6', -- Default blue color
  icon TEXT DEFAULT 'folder', -- Default folder icon
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name) -- Prevent duplicate category names per user
);

-- Enable Row Level Security on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own categories
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own categories
CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own categories
CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own categories
CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at on categories table
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);
CREATE INDEX IF NOT EXISTS categories_name_idx ON categories(name);

-- Add category_id column to credentials table
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for category_id in credentials table
CREATE INDEX IF NOT EXISTS credentials_category_id_idx ON credentials(category_id);

-- Insert default categories for existing users (optional)
-- This will create default categories for users who already have credentials
INSERT INTO categories (user_id, name, color, icon, description)
SELECT DISTINCT 
  user_id,
  'General',
  '#6B7280',
  'folder',
  'Default category for credentials'
FROM credentials
WHERE user_id NOT IN (SELECT user_id FROM categories WHERE name = 'General')
ON CONFLICT (user_id, name) DO NOTHING;

-- Update existing credentials to use the General category
UPDATE credentials 
SET category_id = (
  SELECT id FROM categories 
  WHERE categories.user_id = credentials.user_id 
  AND categories.name = 'General'
)
WHERE category_id IS NULL;
