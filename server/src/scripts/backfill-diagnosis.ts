// Backfill sessions stuck in 'diagnosis' phase that are actually completed.
// Updates them to 'complete' with proper endpoint_selected, then sends summary emails.

import { sendSessionSummaryEmail } from '../services/email/send-summary.js'
import { supabase } from '../config/supabase.js'

function mapConstraintToEndpoint(constraint: string | null): string | null {
  switch (constraint) {
    case 'strategy': return 'EC'
    case 'psychology': return 'EC'
    case 'execution': return 'MIST'
    default: return null
  }
}

async function main() {
  const { data: sessions, error } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, user_email, constraint_category, total_turns, email_sent')
    .eq('current_phase', 'diagnosis')
    .eq('email_sent', false)
    .not('user_email', 'is', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch sessions:', error)
    process.exit(1)
  }

  console.log(`Found ${sessions.length} sessions stuck in diagnosis phase\n`)

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const session of sessions) {
    const endpoint = mapConstraintToEndpoint(session.constraint_category)

    if (!endpoint) {
      console.log(`[SKIP] ${session.user_name} (${session.user_email}) - no constraint_category: ${session.constraint_category}`)
      skipped++
      continue
    }

    // Update session to complete with endpoint
    const { error: updateError } = await supabase
      .from('advisor_sessions')
      .update({
        current_phase: 'complete',
        endpoint_selected: endpoint,
      })
      .eq('id', session.id)

    if (updateError) {
      console.error(`[FAIL] ${session.user_name} - update failed:`, updateError)
      failed++
      continue
    }

    console.log(`[UPDATED] ${session.user_name} -> complete / ${endpoint} (was: ${session.constraint_category})`)

    // Re-check email_sent to avoid duplicates
    const { data: fresh } = await supabase
      .from('advisor_sessions')
      .select('email_sent')
      .eq('id', session.id)
      .single()

    if (fresh?.email_sent) {
      console.log(`  [SKIP] Already sent`)
      skipped++
      continue
    }

    console.log(`  [SEND] Sending summary email...`)

    try {
      const result = await sendSessionSummaryEmail(session.id)
      if (result.success) {
        console.log(`  ✓ Sent (CRM: ${result.crmSynced ? 'synced' : 'not synced'})`)
        sent++
      } else {
        console.log(`  ✗ Failed: ${result.error}`)
        failed++
      }
    } catch (err) {
      console.error(`  ✗ Error:`, err)
      failed++
    }

    // 500ms delay for rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\nDone: ${sent} sent, ${skipped} skipped, ${failed} failed (of ${sessions.length} total)`)
}

main()
