import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbServer } from '@/lib/database-server'
import { UpdateCategoryData } from '@/lib/types'

export async function PUT(
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
    const categoryData: UpdateCategoryData = await request.json()
    const category = await dbServer.updateCategory(id, categoryData)
    
    return NextResponse.json(category)
  } catch (error) {
    console.error('Category update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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
    // Get query parameters for deletion options
    const { searchParams } = new URL(request.url)
    const moveCredentialsTo = searchParams.get('moveTo')
    const deleteCredentials = searchParams.get('deleteCredentials') === 'true'

    await dbServer.deleteCategory(id, moveCredentialsTo || undefined, deleteCredentials)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Category deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
