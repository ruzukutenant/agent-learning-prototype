// Backfill summary emails for completed sessions that never received one
// Safety: sendSessionSummaryEmail checks email_sent and no-ops if already sent

import { sendSessionSummaryEmail } from '../services/email/send-summary.js'
import { supabase } from '../config/supabase.js'

async function main() {
  const { data: sessions, error } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, user_email, total_turns, email_sent')
    .eq('current_phase', 'complete')
    .eq('email_sent', false)
    .not('user_email', 'is', null)
    .gte('total_turns', 12)
    .order('total_turns', { ascending: false })

  if (error) {
    console.error('Failed to fetch sessions:', error)
    process.exit(1)
  }

  console.log(`Found ${sessions.length} sessions to backfill\n`)

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const session of sessions) {
    // Re-check email_sent to avoid duplicates (e.g. same email across sessions)
    const { data: fresh } = await supabase
      .from('advisor_sessions')
      .select('email_sent')
      .eq('id', session.id)
      .single()

    if (fresh?.email_sent) {
      console.log(`[SKIP] ${session.user_name} (${session.user_email}) - already sent`)
      skipped++
      continue
    }

    console.log(`[SEND] ${session.user_name} (${session.user_email}) - ${session.total_turns} turns...`)

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

    // 500ms delay to stay under Resend rate limits
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\nDone: ${sent} sent, ${skipped} skipped, ${failed} failed (of ${sessions.length} total)`)
}

main()
