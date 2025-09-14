const { createClient } = require('@supabase/supabase-js')
const CryptoJS = require('crypto-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const encryptionKey = process.env.ENCRYPTION_KEY

if (!supabaseUrl || !supabaseKey || !encryptionKey) {
  console.error('Missing required environment variables')
  console.error('Make sure you have:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  console.error('- ENCRYPTION_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Encryption/Decryption functions
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, encryptionKey).toString()
}

function decrypt(encryptedText) {
  const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey)
  return bytes.toString(CryptoJS.enc.Utf8)
}

function safeDecrypt(encryptedText, fallback = '[Decryption Error]') {
  try {
    return decrypt(encryptedText)
  } catch (error) {
    return fallback
  }
}

async function reencryptCredentials() {
  console.log('🔐 Starting credential re-encryption process...')
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

    let reencrypted = 0
    let skipped = 0
    let errors = 0

    // Process each credential
    for (const cred of credentials) {
      console.log(`\n🔄 Processing credential: ${cred.service_name} (${cred.id})`)
      
      try {
        let needsUpdate = false
        const updateData = {}

        // Check and re-encrypt password
        if (cred.password) {
          const safeDecrypted = safeDecrypt(cred.password, '')
          if (safeDecrypted && safeDecrypted !== '[Decryption Error - Please re-enter password]') {
            // Try to decrypt with current key
            try {
              const decrypted = decrypt(cred.password)
              updateData.password = encrypt(decrypted)
              needsUpdate = true
              console.log('  ✅ Password re-encrypted')
            } catch (error) {
              console.log('  ⚠️  Password already using current key')
            }
          } else {
            console.log('  ❌ Cannot decrypt password, skipping')
          }
        }

        // Check and re-encrypt username
        if (cred.username) {
          const safeDecrypted = safeDecrypt(cred.username, '')
          if (safeDecrypted && safeDecrypted !== '[Decryption Error - Please re-enter username]') {
            try {
              const decrypted = decrypt(cred.username)
              updateData.username = encrypt(decrypted)
              needsUpdate = true
              console.log('  ✅ Username re-encrypted')
            } catch (error) {
              console.log('  ⚠️  Username already using current key')
            }
          } else {
            console.log('  ❌ Cannot decrypt username, skipping')
          }
        }

        // Check and re-encrypt custom fields
        if (cred.custom_fields && Array.isArray(cred.custom_fields)) {
          let customFieldsUpdated = false
          const updatedCustomFields = cred.custom_fields.map((field) => {
            if (field.value) {
              const safeDecrypted = safeDecrypt(field.value, '')
              if (safeDecrypted && safeDecrypted !== '[Decryption Error]') {
                try {
                  const decrypted = decrypt(field.value)
                  customFieldsUpdated = true
                  return {
                    ...field,
                    value: encrypt(decrypted)
                  }
                } catch (error) {
                  console.log('  ⚠️  Custom field already using current key')
                  return field
                }
              } else {
                console.log('  ❌ Cannot decrypt custom field, skipping')
                return field
              }
            }
            return field
          })

          if (customFieldsUpdated) {
            updateData.custom_fields = updatedCustomFields
            needsUpdate = true
            console.log('  ✅ Custom fields re-encrypted')
          }
        }

        // Update the credential if needed
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('credentials')
            .update(updateData)
            .eq('id', cred.id)

          if (updateError) {
            console.log(`  ❌ Failed to update: ${updateError.message}`)
            errors++
          } else {
            reencrypted++
            console.log('  ✅ Successfully updated')
          }
        } else {
          skipped++
          console.log('  ⏭️  Skipped (no changes needed)')
        }

      } catch (error) {
        console.log(`  ❌ Error processing: ${error.message}`)
        errors++
      }
    }

    console.log('\n📊 Re-encryption Summary:')
    console.log(`  Total credentials: ${credentials.length}`)
    console.log(`  Re-encrypted: ${reencrypted}`)
    console.log(`  Skipped: ${skipped}`)
    console.log(`  Errors: ${errors}`)

    if (errors === 0) {
      console.log('\n🎉 All credentials processed successfully!')
    } else {
      console.log(`\n⚠️  ${errors} credentials had errors during processing`)
    }

  } catch (error) {
    console.error('❌ Re-encryption failed:', error.message)
    process.exit(1)
  }
}

// Run the re-encryption
reencryptCredentials()
  .then(() => {
    console.log('\n✅ Re-encryption process completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Re-encryption process failed:', error)
    process.exit(1)
  })
