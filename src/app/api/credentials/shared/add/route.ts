import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { encrypt } from '@/lib/encryption'

export async function POST(request: NextRequest) {
  try {
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { credentialData, sharedFolderId } = body
    

    if (!credentialData || !sharedFolderId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create service client for database operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user has write access to this shared folder
    const { data: sharedAccess, error: accessError } = await serviceSupabase
      .from('shared_folder_access')
      .select('permission_level, owner_id')
      .eq('folder_id', sharedFolderId)
      .eq('shared_with_user_id', user.id)
      .single()

    if (accessError || !sharedAccess) {
      return NextResponse.json({ error: 'No access to this shared folder' }, { status: 403 })
    }

    if (sharedAccess.permission_level !== 'write') {
      return NextResponse.json({ error: 'Write permission required' }, { status: 403 })
    }

    // Prepare credential data with encryption
    const encryptedCredentialData = {
      ...credentialData,
      category_id: sharedFolderId, // Use the original folder ID, not the shared- prefixed one
      user_id: sharedAccess.owner_id, // Set the owner as the user_id
      password: credentialData.password ? encrypt(credentialData.password) : undefined,
      username: credentialData.username ? encrypt(credentialData.username) : undefined,
      custom_fields: credentialData.custom_fields ? credentialData.custom_fields.map((field: any) => ({
        ...field,
        value: field.value ? encrypt(field.value) : field.value
      })) : []
    }

    // Add the credential to the original folder using service client
    const { data: newCredential, error: createError } = await serviceSupabase
      .from('credentials')
      .insert(encryptedCredentialData)
      .select()
      .single()

    if (createError) {
      console.error('Create credential error:', createError)
      return NextResponse.json({ error: 'Failed to create credential' }, { status: 500 })
    }

    // Return the credential with decrypted data for the client
    const decryptedCredential = {
      ...newCredential,
      password: newCredential.password ? credentialData.password : undefined,
      username: newCredential.username ? credentialData.username : undefined,
      custom_fields: newCredential.custom_fields ? newCredential.custom_fields.map((field: any) => ({
        ...field,
        value: field.value ? credentialData.custom_fields?.find((cf: any) => cf.id === field.id)?.value || field.value : field.value
      })) : []
    }

    return NextResponse.json(decryptedCredential)

  } catch (error) {
    console.error('Add shared credential error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
