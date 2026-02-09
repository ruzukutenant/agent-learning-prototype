import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

console.log('Using Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

async function fixConstraintCheck() {
  console.log('Updating constraint_category check to allow psychology...')

  try {
    // Drop the old constraint and add new one with psychology
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE advisor_sessions DROP CONSTRAINT IF EXISTS advisor_sessions_constraint_category_check;'
    })

    if (error1) {
      console.error('Error dropping constraint:', error1)
      return
    }
    console.log('✓ Dropped old constraint')

    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE advisor_sessions ADD CONSTRAINT advisor_sessions_constraint_category_check
            CHECK (constraint_category IN ('strategy', 'execution', 'psychology', 'energy'));`
    })

    if (error2) {
      console.error('Error adding new constraint:', error2)
      return
    }
    console.log('✓ Added new constraint allowing psychology')

    // Also update any existing 'energy' values to 'psychology' for consistency
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `UPDATE advisor_sessions SET constraint_category = 'psychology' WHERE constraint_category = 'energy';`
    })

    if (error3) {
      console.error('Error updating values:', error3)
    } else {
      console.log('✓ Updated existing energy values to psychology')
    }

    console.log('Done!')
  } catch (err) {
    console.error('Error:', err)
  }
}

fixConstraintCheck().catch(console.error)
