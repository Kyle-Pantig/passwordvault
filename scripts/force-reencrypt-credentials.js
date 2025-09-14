const { createClient } = require('@supabase/supabase-js')
const CryptoJS = require('crypto-js')
require('dotenv').config({ path: '.env.local' })

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

async function forceReencryptCredentials() {
  console.log('🔐 Starting FORCE re-encryption process...')
  console.log('⚠️  This will replace all encrypted data with placeholder values')
  console.log('📊 Fetching all credentials...')

  try {
    // Get all credentials
    const { data: credentials, error: fetchError } = await supabase
      .from('credentials')
      .select('*')

    if (fetchError) {
      throw new Error(`Failed to fetch credentials: ${fetchError.message}`)
    }

    if (!credentials || credentials.length === 0) {
      console.log('✅ No credentials found to re-encrypt')
      return
    }

    console.log(`📋 Found ${credentials.length} credentials to process`)

    let updated = 0
    let errors = 0

    // Process each credential
    for (const cred of credentials) {
      console.log(`\n🔄 Processing credential: ${cred.service_name} (${cred.id})`)
      
      try {
        const updateData = {}

        // Replace password with placeholder if it exists
        if (cred.password) {
          updateData.password = encrypt('[Please re-enter password]')
          console.log('  🔄 Password replaced with placeholder')
        }

        // Replace username with placeholder if it exists
        if (cred.username) {
          updateData.username = encrypt('[Please re-enter username]')
          console.log('  🔄 Username replaced with placeholder')
        }

        // Replace custom fields with placeholder if they exist
        if (cred.custom_fields && Array.isArray(cred.custom_fields)) {
          const updatedCustomFields = cred.custom_fields.map((field, index) => ({
            id: field.id || `field-${Date.now()}-${index}`,
            value: encrypt('[Please re-enter value]'),
            isMasked: field.isMasked || false
          }))
          updateData.custom_fields = updatedCustomFields
          console.log(`  🔄 ${cred.custom_fields.length} custom fields replaced with placeholders`)
        }

        // Update the credential
        const { error: updateError } = await supabase
          .from('credentials')
          .update(updateData)
          .eq('id', cred.id)

        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`)
          errors++
        } else {
          updated++
          console.log('  ✅ Successfully updated with placeholders')
        }

      } catch (error) {
        console.log(`  ❌ Error processing: ${error.message}`)
        errors++
      }
    }

    console.log('\n📊 Force Re-encryption Summary:')
    console.log(`  Total credentials: ${credentials.length}`)
    console.log(`  Updated: ${updated}`)
    console.log(`  Errors: ${errors}`)

    if (errors === 0) {
      console.log('\n🎉 All credentials updated successfully!')
      console.log('📝 Users will need to re-enter their data for all credentials')
    } else {
      console.log(`\n⚠️  ${errors} credentials had errors during processing`)
    }

  } catch (error) {
    console.error('❌ Force re-encryption failed:', error.message)
    process.exit(1)
  }
}

// Run the force re-encryption
forceReencryptCredentials()
  .then(() => {
    console.log('\n✅ Force re-encryption process completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Force re-encryption process failed:', error)
    process.exit(1)
  })
