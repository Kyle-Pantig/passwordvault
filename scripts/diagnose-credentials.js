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

async function diagnoseCredentials() {
  console.log('🔍 Diagnosing credential encryption issues...')
  console.log(`🔑 Using encryption key: ${encryptionKey.substring(0, 8)}...`)
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

    console.log(`📋 Found ${credentials.length} credentials to diagnose`)

    let totalFields = 0
    let decryptionErrors = 0
    let successfulDecryptions = 0

    // Process each credential
    for (const cred of credentials) {
      console.log(`\n🔍 Diagnosing credential: ${cred.service_name} (${cred.id})`)
      
      // Check password
      if (cred.password) {
        totalFields++
        console.log(`  🔐 Password: ${cred.password.substring(0, 50)}...`)
        const decrypted = safeDecrypt(cred.password, '')
        if (decrypted === '[Decryption Error]' || decrypted === '[Decryption Error - Please re-enter password]') {
          decryptionErrors++
          console.log(`    ❌ Decryption failed`)
        } else {
          successfulDecryptions++
          console.log(`    ✅ Decrypted: ${decrypted}`)
        }
      }

      // Check username
      if (cred.username) {
        totalFields++
        console.log(`  👤 Username: ${cred.username.substring(0, 50)}...`)
        const decrypted = safeDecrypt(cred.username, '')
        if (decrypted === '[Decryption Error]' || decrypted === '[Decryption Error - Please re-enter username]') {
          decryptionErrors++
          console.log(`    ❌ Decryption failed`)
        } else {
          successfulDecryptions++
          console.log(`    ✅ Decrypted: ${decrypted}`)
        }
      }

      // Check custom fields
      if (cred.custom_fields && Array.isArray(cred.custom_fields)) {
        cred.custom_fields.forEach((field, index) => {
          if (field.value) {
            totalFields++
            console.log(`  📝 Custom field ${index + 1}: ${field.value.substring(0, 50)}...`)
            const decrypted = safeDecrypt(field.value, '')
            if (decrypted === '[Decryption Error]') {
              decryptionErrors++
              console.log(`    ❌ Decryption failed`)
            } else {
              successfulDecryptions++
              console.log(`    ✅ Decrypted: ${decrypted}`)
            }
          }
        })
      }
    }

    console.log('\n📊 Diagnosis Summary:')
    console.log(`  Total encrypted fields: ${totalFields}`)
    console.log(`  Successful decryptions: ${successfulDecryptions}`)
    console.log(`  Decryption errors: ${decryptionErrors}`)

    if (decryptionErrors > 0) {
      console.log('\n⚠️  Some fields still have decryption issues')
      console.log('This might be due to:')
      console.log('1. Different encryption keys between client/server')
      console.log('2. Some credentials not properly updated')
      console.log('3. Caching issues')
    } else {
      console.log('\n🎉 All fields can be decrypted successfully!')
    }

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message)
    process.exit(1)
  }
}

// Run the diagnosis
diagnoseCredentials()
  .then(() => {
    console.log('\n✅ Diagnosis completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Diagnosis failed:', error)
    process.exit(1)
  })
