import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbServer } from '@/lib/database-server'
import { CreateCategoryData } from '@/lib/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await dbServer.getCategories()
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categoryData: CreateCategoryData = await request.json()
    
    if (!categoryData.name || categoryData.name.trim() === '') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const category = await dbServer.createCategory(categoryData)
    return NextResponse.json(category)
  } catch (error) {
    console.error('Category creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
