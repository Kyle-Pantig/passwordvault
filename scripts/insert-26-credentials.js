const { createClient } = require('@supabase/supabase-js')
const CryptoJS = require('crypto-js')
require('dotenv').config({ path: '.env.local' })

// Simple UUID v4 generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const encryptionKey = process.env.ENCRYPTION_KEY

if (!supabaseUrl || !supabaseKey || !encryptionKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Encryption function
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, encryptionKey).toString()
}

// Generate random credentials data
const credentialsData = [
  // Basic credentials (username/password)
  { service_name: 'Facebook', service_url: 'https://www.facebook.com', credential_type: 'basic', username: 'john.doe@email.com', password: 'SecurePass123!' },
  { service_name: 'Instagram', service_url: 'https://www.instagram.com', credential_type: 'basic', username: 'johndoe_insta', password: 'InstaPass456!' },
  { service_name: 'Twitter', service_url: 'https://twitter.com', credential_type: 'basic', username: '@johndoe', password: 'TweetPass789!' },
  { service_name: 'LinkedIn', service_url: 'https://www.linkedin.com', credential_type: 'basic', username: 'john.doe@email.com', password: 'LinkedInPass101!' },
  { service_name: 'TikTok', service_url: 'https://www.tiktok.com', credential_type: 'basic', username: 'johndoe_tiktok', password: 'TikTokPass202!' },
  { service_name: 'Snapchat', service_url: 'https://www.snapchat.com', credential_type: 'basic', username: 'johndoe_snap', password: 'SnapPass303!' },
  { service_name: 'Discord', service_url: 'https://discord.com', credential_type: 'basic', username: 'JohnDoe#1234', password: 'DiscordPass404!' },
  { service_name: 'Reddit', service_url: 'https://www.reddit.com', credential_type: 'basic', username: 'johndoe_reddit', password: 'RedditPass505!' },
  { service_name: 'Pinterest', service_url: 'https://www.pinterest.com', credential_type: 'basic', username: 'johndoe_pin', password: 'PinPass606!' },
  { service_name: 'YouTube', service_url: 'https://www.youtube.com', credential_type: 'basic', username: 'johndoe@email.com', password: 'YouTubePass707!' },
  
  // Advanced credentials (custom fields)
  { service_name: 'GitHub', service_url: 'https://github.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe_github', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'GitHubToken_abc123xyz789', isMasked: true }
  ]},
  { service_name: 'GitLab', service_url: 'https://gitlab.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe_gitlab', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'GitLabToken_def456uvw012', isMasked: true }
  ]},
  { service_name: 'Bitbucket', service_url: 'https://bitbucket.org', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe_bitbucket', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'BitbucketToken_ghi789rst345', isMasked: true }
  ]},
  { service_name: 'AWS', service_url: 'https://aws.amazon.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'AKIAIOSFODNN7EXAMPLE', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', isMasked: true },
    { id: 'field-' + generateUUID(), value: 'us-east-1', isMasked: false }
  ]},
  { service_name: 'Google Cloud', service_url: 'https://cloud.google.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'GoogleCloudToken_jkl012mno678', isMasked: true },
    { id: 'field-' + generateUUID(), value: 'my-project-123', isMasked: false }
  ]},
  { service_name: 'Azure', service_url: 'https://azure.microsoft.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'AzureToken_pqr345stu901', isMasked: true },
    { id: 'field-' + generateUUID(), value: 'my-azure-subscription', isMasked: false }
  ]},
  { service_name: 'DigitalOcean', service_url: 'https://www.digitalocean.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'DigitalOceanToken_vwx678yza234', isMasked: true }
  ]},
  { service_name: 'Heroku', service_url: 'https://www.heroku.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'HerokuToken_bcd901efg456', isMasked: true }
  ]},
  { service_name: 'Vercel', service_url: 'https://vercel.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'VercelToken_hij567klm890', isMasked: true }
  ]},
  { service_name: 'Netlify', service_url: 'https://www.netlify.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'NetlifyToken_nop123qrs456', isMasked: true }
  ]},
  { service_name: 'Stripe', service_url: 'https://stripe.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'pk_test_51234567890abcdef', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'sk_test_51234567890abcdef', isMasked: true }
  ]},
  { service_name: 'PayPal', service_url: 'https://www.paypal.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'PayPalClientId_tuv789wxy012', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'PayPalSecret_zab345cde678', isMasked: true }
  ]},
  { service_name: 'Twilio', service_url: 'https://www.twilio.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'AC1234567890abcdef', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'TwilioAuthToken_fgh901ijk234', isMasked: true }
  ]},
  { service_name: 'SendGrid', service_url: 'https://sendgrid.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'SendGridAPIKey_lmn567opq890', isMasked: true }
  ]},
  { service_name: 'Mailchimp', service_url: 'https://mailchimp.com', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'MailchimpAPIKey_rst123uvw456', isMasked: true }
  ]},
  { service_name: 'MongoDB Atlas', service_url: 'https://www.mongodb.com/atlas', credential_type: 'advanced', custom_fields: [
    { id: 'field-' + generateUUID(), value: 'johndoe@email.com', isMasked: false },
    { id: 'field-' + generateUUID(), value: 'MongoDBPassword_xyz789abc012', isMasked: true },
    { id: 'field-' + generateUUID(), value: 'my-cluster-0.abc123.mongodb.net', isMasked: false }
  ]}
]

async function insertCredentials() {
  console.log('🚀 Starting to insert 26 credentials...')
  console.log(`🔑 Using encryption key: ${encryptionKey.substring(0, 8)}...`)
  console.log(`📁 Target category ID: 965f7658-6db9-4318-8302-a930a7dad20a`)

  try {
    // Get the user ID from the first credential in the provided data
    const userId = 'd2d630d8-1d3f-4d76-a7c6-d38ad5b61294'
    
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < credentialsData.length; i++) {
      const cred = credentialsData[i]
      console.log(`\n📝 Inserting credential ${i + 1}/26: ${cred.service_name}`)

      try {
        const insertData = {
          id: generateUUID(),
          user_id: userId,
          service_name: cred.service_name,
          service_url: cred.service_url,
          credential_type: cred.credential_type,
          category_id: '965f7658-6db9-4318-8302-a930a7dad20a',
          notes: `Auto-generated credential ${i + 1}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Handle basic credentials (username/password)
        if (cred.credential_type === 'basic') {
          insertData.username = cred.username ? encrypt(cred.username) : null
          insertData.password = cred.password ? encrypt(cred.password) : null
          insertData.custom_fields = []
        }

        // Handle advanced credentials (custom fields)
        if (cred.credential_type === 'advanced') {
          insertData.username = null
          insertData.password = null
          insertData.custom_fields = cred.custom_fields.map(field => ({
            id: field.id,
            value: encrypt(field.value),
            isMasked: field.isMasked
          }))
        }

        const { data, error } = await supabase
          .from('credentials')
          .insert(insertData)
          .select()

        if (error) {
          console.error(`  ❌ Error inserting ${cred.service_name}:`, error.message)
          errorCount++
        } else {
          console.log(`  ✅ Successfully inserted ${cred.service_name}`)
          successCount++
        }

        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`  ❌ Unexpected error for ${cred.service_name}:`, error.message)
        errorCount++
      }
    }

    console.log('\n📊 Insertion Summary:')
    console.log(`  ✅ Successfully inserted: ${successCount} credentials`)
    console.log(`  ❌ Failed to insert: ${errorCount} credentials`)
    console.log(`  📁 All credentials assigned to category: 965f7658-6db9-4318-8302-a930a7dad20a`)

    if (errorCount === 0) {
      console.log('\n🎉 All 26 credentials inserted successfully!')
    } else {
      console.log(`\n⚠️  ${errorCount} credentials failed to insert. Check the errors above.`)
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message)
    process.exit(1)
  }
}

// Run the insertion
insertCredentials()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
