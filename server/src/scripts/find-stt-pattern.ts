import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '/Users/abecrystal/Dev/new-advisor/.env' })

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  let allMessages: any[] = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('advisor_messages')
      .select('id, session_id, message_text, created_at, was_voice')
      .eq('speaker', 'user')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) { console.error(error); return }
    if (!data || data.length === 0) break
    allMessages = allMessages.concat(data)
    if (data.length < pageSize) break
    offset += pageSize
  }

  console.log(`Total user messages: ${allMessages.length}`)

  const matches: any[] = []

  for (const msg of allMessages) {
    if (!msg.message_text || msg.message_text.length < 500) continue
    const words = msg.message_text.trim().split(/\s+/)
    const prefix = words.slice(0, 6).join(' ').toLowerCase()
    const text = msg.message_text.toLowerCase()
    let count = 0, idx = 0
    while ((idx = text.indexOf(prefix, idx)) !== -1) { count++; idx += prefix.length }
    if (count >= 5) {
      matches.push({
        id: msg.id,
        session_id: msg.session_id,
        created_at: msg.created_at,
        was_voice: msg.was_voice,
        length: msg.message_text.length,
        prefix_repeats: count,
        prefix,
        preview: msg.message_text.slice(0, 300)
      })
    }
  }

  console.log(`\nFound ${matches.length} messages with speech-to-text repeat pattern:\n`)
  for (const m of matches) {
    console.log(`Session: ${m.session_id}`)
    console.log(`Message ID: ${m.id}`)
    console.log(`Date: ${m.created_at}`)
    console.log(`Was voice: ${m.was_voice}`)
    console.log(`Length: ${m.length} chars, Prefix repeats: ${m.prefix_repeats}`)
    console.log(`Prefix: "${m.prefix}"`)
    console.log(`Preview: ${m.preview}...`)
    console.log('---')
  }
}

main()
