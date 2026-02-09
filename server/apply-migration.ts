import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '../.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

console.log('Using Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

async function applyMigration() {
  console.log('Applying migration via SQL...')
  
  try {
    // Execute the ALTER TABLE command
    const { data: data1, error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE advisor_sessions ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT NULL;'
    })
    
    if (error1) {
      console.error('Error adding column:', error1)
    } else {
      console.log('✓ Added conversation_state column')
    }
    
    // Execute the CREATE INDEX command
    const { data: data2, error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_constraint ON advisor_sessions(constraint_category);'
    })
    
    if (error2) {
      console.error('Error adding index:', error2)
    } else {
      console.log('✓ Added index')
    }
    
    console.log('Migration complete!')
  } catch (err) {
    console.error('Migration error:', err)
  }
}

applyMigration().catch(console.error)
