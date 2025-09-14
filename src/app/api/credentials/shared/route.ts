import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { encrypt, safeDecrypt } from '@/lib/encryption'

export async function PATCH(request: NextRequest) {
  try {
    console.log('Shared credential API called')
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { credentialId, credentialData } = body
    
    console.log('Shared credential update request:', { credentialId, credentialData })

    if (!credentialId || !credentialData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create service client for database operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First, get the original credential to check if it's shared
    const { data: originalCredential, error: fetchError } = await serviceSupabase
      .from('credentials')
      .select('*')
      .eq('id', credentialId)
      .single()

    if (fetchError || !originalCredential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 })
    }

    // Check if this is a shared credential by looking at the category
    const { data: category, error: categoryError } = await serviceSupabase
      .from('categories')
      .select('*')
      .eq('id', originalCredential.category_id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if the category is shared and if the user has write permission
    const { data: sharedAccess, error: accessError } = await serviceSupabase
      .from('shared_folder_access')
      .select('permission_level')
      .eq('folder_id', originalCredential.category_id)
      .eq('shared_with_user_id', user.id)
      .single()

    if (accessError || !sharedAccess) {
      return NextResponse.json({ error: 'No access to this shared folder' }, { status: 403 })
    }

    if (sharedAccess.permission_level !== 'write') {
      return NextResponse.json({ error: 'Write permission required' }, { status: 403 })
    }

    // Prepare update data with encryption
    const updateData: Record<string, unknown> = { ...credentialData }
    
    // Encrypt password and username if they're being updated
    if (credentialData.password) {
      updateData.password = encrypt(credentialData.password)
    }
    if (credentialData.username) {
      updateData.username = encrypt(credentialData.username)
    }
    if (credentialData.custom_fields) {
      // Encrypt custom fields
      const encryptedCustomFields = credentialData.custom_fields.map((field: any) => ({
        ...field,
        value: field.value ? encrypt(field.value) : field.value
      }))
      updateData.custom_fields = encryptedCustomFields
    }

    // Update the original credential using service client
    const { data: updatedCredential, error: updateError } = await serviceSupabase
      .from('credentials')
      .update(updateData)
      .eq('id', credentialId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update credential' }, { status: 500 })
    }

    // Decrypt the response for the client
    const decryptedCredential = {
      ...updatedCredential,
      password: updatedCredential.password ? safeDecrypt(updatedCredential.password, '[Decryption Error]') : undefined,
      username: updatedCredential.username ? safeDecrypt(updatedCredential.username, '[Decryption Error]') : undefined,
      custom_fields: updatedCredential.custom_fields ? updatedCredential.custom_fields.map((field: any) => ({
        ...field,
        value: field.value ? safeDecrypt(field.value, '[Decryption Error]') : field.value
      })) : []
    }

    return NextResponse.json(decryptedCredential)

  } catch (error) {
    console.error('Update shared credential error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
