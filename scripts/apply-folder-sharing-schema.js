const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function applySchema() {
  try {
    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables:')
      console.error('- NEXT_PUBLIC_SUPABASE_URL')
      console.error('- SUPABASE_SERVICE_ROLE_KEY')
      console.error('Please check your .env.local file')
      process.exit(1)
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log('🔍 Checking if folder sharing tables exist...')

    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['folder_sharing_invitations', 'shared_folder_access', 'shared_credentials'])

    if (tablesError) {
      console.error('Error checking tables:', tablesError)
      return
    }

    const existingTables = tables.map(t => t.table_name)
    console.log('Existing tables:', existingTables)

    if (existingTables.length === 3) {
      console.log('✅ All folder sharing tables already exist!')
      return
    }

    console.log('📄 Reading schema file...')
    const schemaPath = path.join(__dirname, '..', 'folder-sharing-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    console.log('🚀 Applying folder sharing schema...')
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        if (error) {
          console.error('Error executing statement:', error)
          console.error('Statement:', statement)
        } else {
          console.log('✅ Statement executed successfully')
        }
      }
    }

    console.log('🎉 Folder sharing schema applied successfully!')

  } catch (error) {
    console.error('Error applying schema:', error)
  }
}

applySchema()
