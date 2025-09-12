import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbServer } from '@/lib/database-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const credentials = await dbServer.getCredentialsInCategory(id)
    return NextResponse.json(credentials)
  } catch (error) {
    console.error('Get credentials in category error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
