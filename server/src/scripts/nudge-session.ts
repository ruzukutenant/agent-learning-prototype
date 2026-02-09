/**
 * Nudge a stuck session by sending a continuation message through the orchestrator.
 * This triggers CoachMira to read the full conversation history and respond.
 *
 * Usage: npx tsx server/src/scripts/nudge-session.ts <sessionId> [message]
 * Default message: "(continuing from where we left off)"
 */
import 'dotenv/config'
import { processMessageWithOrchestrator } from '../services/orchestratorService.js'

const sessionId = process.argv[2]
const message = process.argv[3] || '(continuing from where we left off)'

if (!sessionId) {
  console.error('Usage: npx tsx server/src/scripts/nudge-session.ts <sessionId> [message]')
  process.exit(1)
}

async function main() {
  console.log(`Nudging session ${sessionId} with message: "${message}"`)

  try {
    const result = await processMessageWithOrchestrator(sessionId, message)
    console.log('\n✅ Mira responded:')
    console.log(result.advisorMessage?.message_text)
    console.log(`\nPhase: ${result.session.current_phase}`)
    console.log(`Total turns: ${result.session.total_turns}`)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

main()
