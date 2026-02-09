// Export conversation transcripts with 5+ turns for AI analysis
// Usage: npx tsx server/src/scripts/export-transcripts.ts [--min-turns N] [--output path]
//
// Output: JSONL (one JSON object per session) — the most practical format for AI analysis.
// Each line contains session metadata + full message transcript.

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Parse CLI args
const args = process.argv.slice(2)
function getArg(flag: string, defaultValue: string): string {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue
}

const MIN_TURNS = parseInt(getArg('--min-turns', '5'), 10)
const OUTPUT_PATH = getArg('--output', `/tmp/coachmira-transcripts-${new Date().toISOString().split('T')[0]}.jsonl`)

interface ExportedSession {
  session_id: string
  exported_at: string
  // Session metadata
  user_name: string | null
  created_at: string
  completion_status: string
  total_turns: number
  // Constraint diagnosis
  constraint_category: string | null
  constraint_summary: string | null
  constraint_validated: boolean
  // Readiness scores
  clarity_score: number | null
  confidence_score: number | null
  capacity_score: number | null
  // Routing
  endpoint_selected: string | null
  // Transcript
  messages: Array<{
    turn: number
    speaker: 'user' | 'advisor'
    text: string
    phase: string | null
  }>
}

async function exportTranscripts() {
  console.log(`Exporting transcripts with ${MIN_TURNS}+ turns...`)

  // Fetch sessions with enough turns
  const { data: sessions, error: sessionsError } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, created_at, completion_status, total_turns, constraint_category, constraint_summary, constraint_validated, clarity_score, confidence_score, capacity_score, endpoint_selected')
    .gte('total_turns', MIN_TURNS)
    .order('created_at', { ascending: true })

  if (sessionsError) {
    console.error('Failed to fetch sessions:', sessionsError)
    process.exit(1)
  }

  if (!sessions || sessions.length === 0) {
    console.log('No sessions found with', MIN_TURNS, '+ turns.')
    return
  }

  console.log(`Found ${sessions.length} sessions. Fetching messages...`)

  const sessionIds = sessions.map(s => s.id)

  // Fetch all messages for qualifying sessions in one query
  const { data: allMessages, error: messagesError } = await supabase
    .from('advisor_messages')
    .select('session_id, turn_number, speaker, message_text, phase')
    .in('session_id', sessionIds)
    .order('turn_number', { ascending: true })

  if (messagesError) {
    console.error('Failed to fetch messages:', messagesError)
    process.exit(1)
  }

  // Group messages by session
  const messagesBySession = new Map<string, typeof allMessages>()
  for (const msg of allMessages || []) {
    const existing = messagesBySession.get(msg.session_id) || []
    existing.push(msg)
    messagesBySession.set(msg.session_id, existing)
  }

  // Build export lines
  const lines: string[] = []

  for (const session of sessions) {
    const messages = messagesBySession.get(session.id) || []

    // Skip if messages didn't actually load (shouldn't happen, but defensive)
    if (messages.length < MIN_TURNS) continue

    const exported: ExportedSession = {
      session_id: session.id,
      exported_at: new Date().toISOString(),
      user_name: session.user_name,
      created_at: session.created_at,
      completion_status: session.completion_status,
      total_turns: session.total_turns,
      constraint_category: session.constraint_category,
      constraint_summary: session.constraint_summary,
      constraint_validated: session.constraint_validated,
      clarity_score: session.clarity_score,
      confidence_score: session.confidence_score,
      capacity_score: session.capacity_score,
      endpoint_selected: session.endpoint_selected,
      messages: messages.map(m => ({
        turn: m.turn_number,
        speaker: m.speaker,
        text: m.message_text,
        phase: m.phase
      }))
    }

    lines.push(JSON.stringify(exported))
  }

  // Write output
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n') + '\n')

  console.log(`\nExported ${lines.length} transcripts to: ${OUTPUT_PATH}`)
  console.log(`Format: JSONL (one JSON object per line)`)
  console.log(`\nBreakdown:`)

  // Quick stats
  const constraints: Record<string, number> = {}
  const statuses: Record<string, number> = {}
  let totalMessages = 0

  for (const line of lines) {
    const s = JSON.parse(line) as ExportedSession
    const c = s.constraint_category || 'undiagnosed'
    constraints[c] = (constraints[c] || 0) + 1
    const st = s.completion_status || 'unknown'
    statuses[st] = (statuses[st] || 0) + 1
    totalMessages += s.messages.length
  }

  console.log(`  Constraints: ${Object.entries(constraints).map(([k, v]) => `${k}=${v}`).join(', ')}`)
  console.log(`  Statuses: ${Object.entries(statuses).map(([k, v]) => `${k}=${v}`).join(', ')}`)
  console.log(`  Total messages: ${totalMessages}`)
  console.log(`  Avg messages/session: ${(totalMessages / lines.length).toFixed(1)}`)
}

exportTranscripts().catch(err => {
  console.error('Export failed:', err)
  process.exit(1)
})
