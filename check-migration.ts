import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

async function checkMigration() {
  console.log('Checking if conversation_state column exists...')
  
  // Try to query a session and see if conversation_state field is returned
  const { data, error } = await supabase
    .from('advisor_sessions')
    .select('id, conversation_state')
    .limit(1)
    
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✓ Column exists! Data:', data)
  }
}

checkMigration()
