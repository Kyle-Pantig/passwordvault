#!/usr/bin/env node

/**
 * Database Setup Script for Single Session Management
 * 
 * This script helps set up the user_sessions table and RLS policies
 * required for the single session management feature.
 * 
 * Run this script with: node setup-database.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function setupDatabase() {
  console.log('🚀 Setting up database for single session management...\n')

  // Check if required environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    console.error('\nPlease check your .env.local file and try again.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 1. Create user_sessions table
    console.log('📋 Creating user_sessions table...')
    const createTableSQL = `
      -- Create user_sessions table for tracking active sessions
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL UNIQUE,
        device_info TEXT,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    if (tableError) {
      console.log('   Table might already exist or there was an error:', tableError.message)
    } else {
      console.log('   ✅ user_sessions table created successfully')
    }

    // 2. Create indexes
    console.log('📊 Creating indexes...')
    const createIndexesSQL = `
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
    `

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexesSQL })
    if (indexError) {
      console.log('   Indexes might already exist or there was an error:', indexError.message)
    } else {
      console.log('   ✅ Indexes created successfully')
    }

    // 3. Enable RLS
    console.log('🔒 Enabling Row Level Security...')
    const enableRLSSQL = `ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;`
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLSSQL })
    if (rlsError) {
      console.log('   RLS might already be enabled or there was an error:', rlsError.message)
    } else {
      console.log('   ✅ RLS enabled successfully')
    }

    // 4. Create RLS policies
    console.log('🛡️ Creating RLS policies...')
    const createPoliciesSQL = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
      DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;
      DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
      DROP POLICY IF EXISTS "Users can delete their own sessions" ON user_sessions;

      -- Create new policies
      CREATE POLICY "Users can view their own sessions" ON user_sessions
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own sessions" ON user_sessions
        FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own sessions" ON user_sessions
        FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own sessions" ON user_sessions
        FOR DELETE USING (auth.uid() = user_id);
    `

    const { error: policyError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL })
    if (policyError) {
      console.log('   Policies might already exist or there was an error:', policyError.message)
    } else {
      console.log('   ✅ RLS policies created successfully')
    }

    // 5. Create trigger for updated_at
    console.log('⚡ Creating updated_at trigger...')
    const createTriggerSQL = `
      -- Create function to update updated_at column
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger
      DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
      CREATE TRIGGER update_user_sessions_updated_at
        BEFORE UPDATE ON user_sessions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `

    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: createTriggerSQL })
    if (triggerError) {
      console.log('   Trigger might already exist or there was an error:', triggerError.message)
    } else {
      console.log('   ✅ Updated_at trigger created successfully')
    }

    console.log('\n🎉 Database setup completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Restart your Next.js development server')
    console.log('2. Try logging in and check the browser console for session logs')
    console.log('3. Check your Supabase dashboard to see the user_sessions table')

  } catch (error) {
    console.error('❌ Error setting up database:', error.message)
    console.error('\nTroubleshooting:')
    console.error('1. Make sure you have the correct SUPABASE_SERVICE_ROLE_KEY')
    console.error('2. Check that your Supabase project is active')
    console.error('3. Verify your database connection')
    process.exit(1)
  }
}

// Check if this script is being run directly
if (require.main === module) {
  setupDatabase()
}

module.exports = { setupDatabase }
