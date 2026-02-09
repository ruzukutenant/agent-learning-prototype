/**
 * End-to-End Test: Realistic Coach Persona with Claude Haiku
 *
 * Tests the full conversation flow by calling Supabase functions directly
 * and using Claude Haiku to generate realistic persona-based responses.
 */

const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase configuration')
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing')
  console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Missing')
  process.exit(1)
}

// Initialize Claude Haiku for generating responses
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Productivity Coach Persona
const PERSONA = {
  name: 'Jamie',
  description: `You are Jamie, an experienced productivity and time-management coach.

Core Identity:
- You help busy professionals move from reactive, overwhelmed workdays to intentional, focused execution
- You specialize in clarity, prioritization, and sustainable execution
- You work with service providers, coaches, consultants, and small business owners

Your Business Reality:
- You work with 3-5 clients per month
- Most clients come via word of mouth or referrals
- Revenue feels unpredictable due to feast-or-famine client flow
- You have capacity for a few more clients, but growth is inconsistent

Your Current Frustration:
- People express interest but don't always book calls or commit
- Some discovery calls convert easily; others stall
- Your value becomes obvious during the call, not before it
- You lack a consistent pre-call pathway that warms people up properly

You feel:
- Confident in your ability to help once someone is a client
- Less confident in your ability to create predictable demand
- Frustrated by scattered, reactive marketing efforts
- Aware that something is "off," but only recently able to name it clearly

Communication Style:
- Thoughtful and reflective
- Honest about uncertainty
- Not hype-driven
- Values clarity over persuasion
- Speaks in plain language
- Comfortable admitting what's still fuzzy

Typical language patterns:
- "It feels like…"
- "What I'm noticing is…"
- "I know the direction, but…"
- "When it works, it looks like…"

Response Guidelines:
- Be concise (1-2 sentences per response)
- Answer questions directly without over-explaining
- Don't volunteer extra information unless asked
- Reflect honestly, not perform expertise
- You are open to insight and curious, not defensive`
}

console.log('🧪 Starting End-to-End Test: Realistic Coach Persona\n')
console.log('Persona: Productivity & Time Management Coach (Jamie)')
console.log('Model: Claude Haiku 4.5\n')

async function callChatOrchestrator(sessionId, message) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ sessionId, message })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Chat orchestrator error: ${response.status} - ${error}`)
  }

  return response.json()
}

async function generateResponse(conversationHistory, miraMessage) {
  // Add Mira's message to history
  conversationHistory.push({ role: 'user', content: miraMessage })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    temperature: 0.7,
    system: PERSONA.description,
    messages: conversationHistory
  })

  const userResponse = response.content[0].text.trim()
  conversationHistory.push({ role: 'assistant', content: userResponse })

  return userResponse
}

async function runTest() {
  let conversationHistory = []
  let sessionId = null

  try {
    // Step 1: Create session
    console.log('📝 Step 1: Creating session...')
    const createResponse = await fetch(`${SUPABASE_URL.replace('/functions/v1', '')}/rest/v1/advisor_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ user_name: PERSONA.name })
    })

    if (!createResponse.ok) {
      throw new Error(`Failed to create session: ${createResponse.status}`)
    }

    const [session] = await createResponse.json()
    sessionId = session.id
    console.log(`✅ Session created: ${sessionId}\n`)

    // Step 2: Get initial greeting
    console.log('💬 Step 2: Getting initial greeting...')
    const initResult = await callChatOrchestrator(sessionId, '__INIT__')
    const greeting = initResult.advisorMessage?.message_text || 'No greeting'
    console.log(`\n🤖 Mira: "${greeting.substring(0, 100)}..."\n`)

    // Step 3: Conversation loop
    console.log('🔄 Step 3: Starting conversation loop...\n')
    console.log('=' .repeat(80))

    let turnCount = 0
    const MAX_TURNS = 15

    while (turnCount < MAX_TURNS) {
      turnCount++

      // Get last advisor message
      const messagesResponse = await fetch(
        `${SUPABASE_URL.replace('/functions/v1', '')}/rest/v1/advisor_messages?session_id=eq.${sessionId}&speaker=eq.advisor&order=created_at.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      const messages = await messagesResponse.json()
      if (!messages || messages.length === 0) {
        console.log('⚠️  No advisor message found')
        break
      }

      const lastMessage = messages[0].message_text

      // Generate persona response using Claude Haiku
      console.log(`\n[Turn ${turnCount}]`)
      console.log(`🤖 Mira: "${lastMessage.substring(0, 120)}${lastMessage.length > 120 ? '...' : ''}"`)

      const userResponse = await generateResponse(conversationHistory, lastMessage)
      console.log(`👤 Jamie: "${userResponse}"`)

      // Send response
      const result = await callChatOrchestrator(sessionId, userResponse)

      // Check session state
      const sessionResponse = await fetch(
        `${SUPABASE_URL.replace('/functions/v1', '')}/rest/v1/advisor_sessions?id=eq.${sessionId}&select=*`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY
          }
        }
      )

      const [currentSession] = await sessionResponse.json()

      console.log(`   Phase: ${currentSession.current_phase}`)
      if (currentSession.constraint_category) {
        console.log(`   Constraint: ${currentSession.constraint_category}`)
      }

      // Check if conversation is complete
      if (currentSession.current_phase === 'complete' || currentSession.constraint_category) {
        console.log('\n' + '='.repeat(80))
        console.log('\n✅ CONVERSATION COMPLETE!\n')
        console.log('📊 Final Session State:')
        console.log(`   - Phase: ${currentSession.current_phase}`)
        console.log(`   - Constraint Category: ${currentSession.constraint_category}`)
        console.log(`   - Constraint Summary: ${currentSession.constraint_summary}`)
        console.log(`   - Total Turns: ${currentSession.total_turns}`)
        console.log(`   - Completion Status: ${currentSession.completion_status}`)

        // Verify expected values
        console.log('\n🔍 Validation:')

        if (currentSession.current_phase === 'complete') {
          console.log('   ✅ Phase is "complete"')
        } else {
          console.log(`   ❌ Phase is "${currentSession.current_phase}" (expected "complete")`)
        }

        if (currentSession.constraint_category) {
          console.log(`   ✅ Constraint identified: ${currentSession.constraint_category}`)
        } else {
          console.log('   ❌ No constraint category set')
        }

        if (currentSession.completion_status === 'in_progress') {
          console.log('   ✅ Completion status is "in_progress" (will be "completed" after assessment)')
        } else {
          console.log(`   ⚠️  Completion status is "${currentSession.completion_status}"`)
        }

        // Expected constraint for this persona: likely "strategy" (clarity gap in positioning/messaging)
        console.log('\n💡 Expected Constraint Analysis:')
        console.log('   Based on persona: Likely STRATEGY (clarity gap in pre-call positioning)')
        console.log(`   Actual diagnosis: ${currentSession.constraint_category?.toUpperCase()}`)

        if (currentSession.constraint_category === 'strategy') {
          console.log('   ✅ Correct constraint identified!')
        } else {
          console.log(`   ℹ️  Different constraint identified - reviewing...`)
        }

        break
      }

      // Check for timeout
      if (turnCount >= MAX_TURNS) {
        console.log('\n⚠️  Max turns reached')
        console.log(`   Current phase: ${currentSession.current_phase}`)
        console.log(`   Constraint: ${currentSession.constraint_category || 'Not identified'}`)
      }

      // Small delay between turns
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n✅ End-to-End Test Complete!')
    console.log(`\n📈 Summary:`)
    console.log(`   - Turns: ${turnCount}`)
    console.log(`   - Session ID: ${sessionId}`)
    console.log(`   - Test: ${turnCount < MAX_TURNS ? 'PASSED ✅' : 'TIMEOUT ⚠️'}`)

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    console.error('\nStack:', error.stack)
    if (sessionId) {
      console.log(`\n📝 Session ID for debugging: ${sessionId}`)
    }
    process.exit(1)
  }
}

runTest()
