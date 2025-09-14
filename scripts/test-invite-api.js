const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function testInviteAPI() {
  try {
    console.log('🔍 Testing folder sharing invite API...')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables')
      return
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get a test user and folder
    console.log('\n1. Getting test user...')
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(1)

    if (usersError || !users || users.length === 0) {
      console.log('❌ No users found or error:', usersError)
      return
    }

    const testUser = users[0]
    console.log('✅ Test user:', testUser.email)

    // Get a test folder
    console.log('\n2. Getting test folder...')
    const { data: folders, error: foldersError } = await supabase
      .from('categories')
      .select('id, name, user_id')
      .eq('user_id', testUser.id)
      .limit(1)

    if (foldersError || !folders || folders.length === 0) {
      console.log('❌ No folders found or error:', foldersError)
      return
    }

    const testFolder = folders[0]
    console.log('✅ Test folder:', testFolder.name)

    // Check user subscription
    console.log('\n3. Checking user subscription...')
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', testUser.id)
      .single()

    if (subError) {
      console.log('❌ Subscription error:', subError)
    } else {
      console.log('✅ User subscription:', subscription?.plan || 'No subscription')
    }

    // Test creating an invitation directly
    console.log('\n4. Testing invitation creation...')
    const testInvitation = {
      folder_id: testFolder.id,
      owner_id: testUser.id,
      invited_email: 'test@example.com',
      permission_level: 'read',
      invitation_token: 'test-token-123',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('folder_sharing_invitations')
      .insert(testInvitation)
      .select()
      .single()

    if (inviteError) {
      console.log('❌ Invitation creation error:', inviteError)
    } else {
      console.log('✅ Invitation created successfully:', invitation.id)
      
      // Clean up
      await supabase
        .from('folder_sharing_invitations')
        .delete()
        .eq('id', invitation.id)
      console.log('🧹 Cleaned up test invitation')
    }

  } catch (error) {
    console.error('Test failed:', error)
  }
}

testInviteAPI()
