import { getSession } from './src/services/session.js'
import { getMessages } from './src/services/session.js'

async function checkSession() {
  const sessionId = '0c1da150-7af5-4f9d-8dd4-083fa8c53c8b'

  console.log('\n=== SESSION STATE ===')
  const session = await getSession(sessionId)
  console.log('Phase:', session?.current_phase)
  console.log('Constraint:', session?.constraint_category)
  console.log('Clarity:', session?.clarity_score)
  console.log('Confidence:', session?.confidence_score)
  console.log('Capacity:', session?.capacity_score)
  console.log('Endpoint:', session?.endpoint_selected)
  console.log('Status:', session?.completion_status)

  console.log('\n=== LAST 5 MESSAGES ===')
  const messages = await getMessages(sessionId)
  const last5 = messages.slice(-5)

  for (const msg of last5) {
    console.log(`\n[${msg.speaker}] Turn ${msg.turn_number}:`)
    console.log(msg.message_text.substring(0, 150))
  }
}

checkSession()
