import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbServer } from '@/lib/database-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription to check limits
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError)
      // Default to FREE plan if no subscription found
    }

    // Determine credential limit
    let credentialLimit = 30 // Default FREE plan limit
    if (subscription) {
      credentialLimit = subscription.credential_limit
    }

    // Check if user has reached their limit (unless unlimited)
    if (credentialLimit !== -1) {
      const currentCredentials = await dbServer.getCredentials()
      if (currentCredentials.length >= credentialLimit) {
        return NextResponse.json(
          { 
            error: 'Credential limit reached', 
            limit: credentialLimit,
            current: currentCredentials.length,
            plan: subscription?.plan || 'FREE'
          }, 
          { status: 403 }
        )
      }
    }

    // Parse and validate the credential data
    const credentialData = await request.json()
    
    // Create the credential
    const newCredential = await dbServer.createCredential(credentialData)
    
    return NextResponse.json(newCredential)
  } catch (error) {
    console.error('Create credential error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const credentials = await dbServer.getCredentials()
    return NextResponse.json(credentials)
  } catch (error) {
    console.error('Get credentials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
