const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function testFolderSharing() {
  try {
    console.log('🔍 Testing folder sharing setup...')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables')
      return
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Test 1: Check if tables exist
    console.log('\n1. Checking if tables exist...')
    try {
      const { data, error } = await supabase
        .from('folder_sharing_invitations')
        .select('count')
        .limit(1)
      
      if (error) {
        console.log('❌ folder_sharing_invitations table does not exist')
        console.log('Error:', error.message)
      } else {
        console.log('✅ folder_sharing_invitations table exists')
      }
    } catch (err) {
      console.log('❌ Error checking folder_sharing_invitations:', err.message)
    }

    // Test 2: Check categories table
    console.log('\n2. Checking categories table...')
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .limit(1)
      
      if (error) {
        console.log('❌ categories table error:', error.message)
      } else {
        console.log('✅ categories table exists')
        console.log('Sample categories:', data)
      }
    } catch (err) {
      console.log('❌ Error checking categories:', err.message)
    }

    // Test 3: Check subscriptions table
    console.log('\n3. Checking subscriptions table...')
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan')
        .limit(1)
      
      if (error) {
        console.log('❌ subscriptions table error:', error.message)
      } else {
        console.log('✅ subscriptions table exists')
      }
    } catch (err) {
      console.log('❌ Error checking subscriptions:', err.message)
    }

  } catch (error) {
    console.error('Test failed:', error)
  }
}

testFolderSharing()
