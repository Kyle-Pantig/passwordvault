import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt, safeDecrypt } from '@/lib/encryption'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all credentials for the user
    const { data: credentials, error: fetchError } = await supabase
      .from('credentials')
      .select('*')
      .eq('user_id', user.id)

    if (fetchError) {
      console.error('Error fetching credentials:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 })
    }

    if (!credentials || credentials.length === 0) {
      return NextResponse.json({ 
        message: 'No credentials found to re-encrypt',
        reencrypted: 0,
        skipped: 0,
        errors: 0
      })
    }

    let reencrypted = 0
    let skipped = 0
    let errors = 0
    const errorDetails: string[] = []

    // Process each credential
    for (const cred of credentials) {
      try {
        let needsUpdate = false
        const updateData: any = {}

        // Check and re-encrypt password
        if (cred.password) {
          try {
            // Try to decrypt with current key
            const decrypted = decrypt(cred.password)
            // If successful, re-encrypt with current key
            updateData.password = encrypt(decrypted)
            needsUpdate = true
          } catch (error) {
            // If decryption fails, try safeDecrypt to see if it's already using current key
            const safeDecrypted = safeDecrypt(cred.password, '')
            if (safeDecrypted && safeDecrypted !== '[Decryption Error - Please re-enter password]') {
              // It's already using current key, skip
            } else {
              // Can't decrypt, skip this field
            }
          }
        }

        // Check and re-encrypt username
        if (cred.username) {
          try {
            const decrypted = decrypt(cred.username)
            updateData.username = encrypt(decrypted)
            needsUpdate = true
          } catch (error) {
            const safeDecrypted = safeDecrypt(cred.username, '')
            if (safeDecrypted && safeDecrypted !== '[Decryption Error - Please re-enter username]') {
              // Already using current key
            } else {
              // Can't decrypt, skip this field
            }
          }
        }

        // Check and re-encrypt custom fields
        if (cred.custom_fields && Array.isArray(cred.custom_fields)) {
          let customFieldsUpdated = false
          const updatedCustomFields = cred.custom_fields.map((field: any) => {
            if (field.value) {
              try {
                const decrypted = decrypt(field.value)
                customFieldsUpdated = true
                return {
                  ...field,
                  value: encrypt(decrypted)
                }
              } catch (error) {
                const safeDecrypted = safeDecrypt(field.value, '')
                if (safeDecrypted && safeDecrypted !== '[Decryption Error]') {
                  // Already using current key
                } else {
                  // Can't decrypt, skip this field
                }
                return field
              }
            }
            return field
          })

          if (customFieldsUpdated) {
            updateData.custom_fields = updatedCustomFields
            needsUpdate = true
          }
        }

        // Update the credential if needed
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('credentials')
            .update(updateData)
            .eq('id', cred.id)

          if (updateError) {
            console.error(`Error updating credential ${cred.id}:`, updateError)
            errors++
            errorDetails.push(`Failed to update credential ${cred.id}: ${updateError.message}`)
          } else {
            reencrypted++
          }
        } else {
          skipped++
        }

      } catch (error) {
        console.error(`Error processing credential ${cred.id}:`, error)
        errors++
        errorDetails.push(`Error processing credential ${cred.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: 'Re-encryption completed',
      total: credentials.length,
      reencrypted,
      skipped,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined
    })

  } catch (error) {
    console.error('Error in re-encryption process:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
