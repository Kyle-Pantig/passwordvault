-- Check and verify user_sessions table setup
-- Run this in your Supabase SQL Editor

-- 1. Check if the table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') 
    THEN '✅ user_sessions table exists'
    ELSE '❌ user_sessions table does not exist'
  END as table_status;

-- 2. Check table structure
SELECT 
  'Table structure:' as info,
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_sessions' 
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT 
  CASE 
    WHEN relrowsecurity = true 
    THEN '✅ RLS is enabled'
    ELSE '❌ RLS is not enabled'
  END as rls_status
FROM pg_class 
WHERE relname = 'user_sessions';

-- 4. Check existing policies
SELECT 
  'Existing policies:' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_sessions';

-- 5. Test if we can query the table (this should work if everything is set up correctly)
SELECT 
  'Test query:' as info,
  COUNT(*) as total_sessions
FROM user_sessions;

-- 6. If the table doesn't exist, create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        -- Create the table
        CREATE TABLE user_sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          session_id TEXT NOT NULL UNIQUE,
          device_info TEXT,
          last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
        CREATE INDEX idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
        
        -- Enable RLS
        ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view their own sessions" ON user_sessions
          FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert their own sessions" ON user_sessions
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update their own sessions" ON user_sessions
          FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete their own sessions" ON user_sessions
          FOR DELETE USING (auth.uid() = user_id);
          
        RAISE NOTICE '✅ user_sessions table created successfully';
    ELSE
        RAISE NOTICE '✅ user_sessions table already exists';
    END IF;
END $$;
