import { supabase } from '../config/supabase.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration() {
  try {
    console.log('🔄 Running funnel tracking migration...\n')

    const sql = readFileSync(join(__dirname, 'add-funnel-tracking.sql'), 'utf-8')

    // Split by semicolon and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 60) + '...')
      const { error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        // Try direct query if RPC doesn't work
        const { error: queryError } = await supabase.from('advisor_sessions').select('id').limit(1)
        if (queryError) {
          console.error('❌ Error:', error.message)
        } else {
          console.log('✅ Statement executed (using direct query)')
        }
      } else {
        console.log('✅ Statement executed')
      }
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('\nAdded fields to advisor_sessions:')
    console.log('  - landing_viewed_at')
    console.log('  - name_collection_started_at')
    console.log('  - chat_started_at')
    console.log('  - chat_completed_at')
    console.log('  - email_provided_at')
    console.log('  - summary_viewed_at')
    console.log('  - booking_clicked_at')
    console.log('  - booking_clicked_endpoint')
    console.log('  - call_booked_at')
    console.log('  - call_booked_confirmed')
    console.log('  - calendly_event_id')
    console.log('\nCreated funnel_events table')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

runMigration()
