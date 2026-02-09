import { getMessages } from './src/services/session.js'

async function checkMessages() {
  const messages = await getMessages('b34fd85d-8c96-4b1d-9b67-24b74e0e06a1')

  // Get last 10 messages
  const lastMessages = messages.slice(-10)

  for (const msg of lastMessages) {
    console.log(`\n[${msg.speaker}] Turn ${msg.turn_number}:`)
    console.log(msg.message_text)
  }
}

checkMessages()
