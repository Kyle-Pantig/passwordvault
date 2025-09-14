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

async function verifyAndFixCredentials() {
  console.log('🔍 Verifying and fixing all credentials...')
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
      console.log('✅ No credentials found')
      return
    }

    console.log(`📋 Found ${credentials.length} credentials to verify`)

    let fixed = 0
    let alreadyGood = 0
    let errors = 0

    // Process each credential
    for (const cred of credentials) {
      console.log(`\n🔍 Verifying credential: ${cred.service_name} (${cred.id})`)
      
      try {
        let needsUpdate = false
        const updateData = {}

        // Check password
        if (cred.password) {
          const decrypted = safeDecrypt(cred.password, '')
          if (decrypted === '[Decryption Error]' || decrypted === '[Decryption Error - Please re-enter password]') {
            updateData.password = encrypt('[Please re-enter password]')
            needsUpdate = true
            console.log('  🔧 Password needs fixing')
          } else {
            console.log('  ✅ Password is good')
          }
        }

        // Check username
        if (cred.username) {
          const decrypted = safeDecrypt(cred.username, '')
          if (decrypted === '[Decryption Error]' || decrypted === '[Decryption Error - Please re-enter username]') {
            updateData.username = encrypt('[Please re-enter username]')
            needsUpdate = true
            console.log('  🔧 Username needs fixing')
          } else {
            console.log('  ✅ Username is good')
          }
        }

        // Check custom fields
        if (cred.custom_fields && Array.isArray(cred.custom_fields)) {
          let customFieldsNeedUpdate = false
          const updatedCustomFields = cred.custom_fields.map((field) => {
            if (field.value) {
              const decrypted = safeDecrypt(field.value, '')
              if (decrypted === '[Decryption Error]') {
                customFieldsNeedUpdate = true
                return {
                  ...field,
                  value: encrypt('[Please re-enter value]')
                }
              }
            }
            return field
          })

          if (customFieldsNeedUpdate) {
            updateData.custom_fields = updatedCustomFields
            needsUpdate = true
            console.log('  🔧 Custom fields need fixing')
          } else {
            console.log('  ✅ Custom fields are good')
          }
        }

        // Update if needed
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('credentials')
            .update(updateData)
            .eq('id', cred.id)

          if (updateError) {
            console.log(`  ❌ Failed to update: ${updateError.message}`)
            errors++
          } else {
            fixed++
            console.log('  ✅ Successfully fixed')
          }
        } else {
          alreadyGood++
          console.log('  ✅ Already good, no changes needed')
        }

      } catch (error) {
        console.log(`  ❌ Error processing: ${error.message}`)
        errors++
      }
    }

    console.log('\n📊 Verification Summary:')
    console.log(`  Total credentials: ${credentials.length}`)
    console.log(`  Fixed: ${fixed}`)
    console.log(`  Already good: ${alreadyGood}`)
    console.log(`  Errors: ${errors}`)

    if (errors === 0) {
      console.log('\n🎉 All credentials verified and fixed!')
    } else {
      console.log(`\n⚠️  ${errors} credentials had errors during processing`)
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    process.exit(1)
  }
}

// Run the verification
verifyAndFixCredentials()
  .then(() => {
    console.log('\n✅ Verification process completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Verification process failed:', error)
    process.exit(1)
  })
