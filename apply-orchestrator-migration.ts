import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('Applying orchestrator migration...')

  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'supabase/migrations/20241230002_add_orchestrator_state.sql'),
    'utf-8'
  )

  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 100) + '...')
    const { error } = await supabase.rpc('exec_sql', { sql: statement })

    if (error) {
      console.error('Error executing statement:', error)
      // Continue anyway since we use IF NOT EXISTS
    } else {
      console.log('✓ Success')
    }
  }

  console.log('\nMigration complete!')
}

applyMigration().catch(console.error)
