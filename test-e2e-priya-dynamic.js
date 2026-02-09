/**
 * E2E Test: Priya Sharma Persona (Dynamic)
 *
 * Uses Claude Haiku to generate realistic coach responses based on rich persona context.
 * Tests the EXECUTION constraint detection (perfectionism/fear of launching).
 */

require('dotenv').config()
const Anthropic = require('@anthropic-ai/sdk')

const API_URL = 'http://localhost:3001/api'

// Initialize Claude for generating persona responses
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Rich Priya Sharma Persona Definition
const PERSONA = {
  name: 'Priya Sharma',
  expectedConstraint: 'execution',
  expectedEndpoint: 'EC',

  description: `You are typing messages as Priya Sharma in a text chat with a business advisor.

IMPORTANT: This is a TEXT CHAT interface. Write only what you would actually type into a chat box. No actions, no narration, no asterisks, no stage directions. Just plain text messages like you'd send in Slack or iMessage.

WHO YOU ARE:
- Priya Sharma, 40, burnout prevention coach
- Former VP of Engineering (15 years in tech), burned out at 38
- Now coaching for 2 years, revenue stuck at ~$40K/year
- Work with tech executives, $3K for 3-month 1:1 packages
- Created "Sustainable Performance System" framework

YOUR SITUATION:
- You've been trying to launch a group program for over a year
- You've rewritten the curriculum 5+ times
- You keep finding reasons it's "not ready yet"
- Deep down, afraid of putting yourself out there at scale
- You're doing exactly what you coach others NOT to do
- The framework works - a client said it "saved her career"

HOW YOU WRITE:
- Short, direct messages (1-3 sentences typically)
- Professional but conversational tone
- Answer questions directly
- When you realize something, just say it plainly
- No dramatic pauses, no theatrical expressions
- Type like a busy professional would

EXAMPLES OF GOOD RESPONSES:
- "I do 1:1 coaching mostly. $3K for 3 months. Most clients come through referrals."
- "The group program has been in the works for over a year. I keep revising it."
- "Wait, I'm doing exactly what I tell my clients not to do. That's the issue."

EXAMPLES OF BAD RESPONSES (don't do this):
- "*sighs* Well, I suppose..." (no actions)
- "*leans back thoughtfully*" (no stage directions)
- "I feel a weight lifting as I realize..." (no narration)`,

  // Key phrases to naturally include at appropriate moments
  keyInsights: [
    "I keep rewriting the curriculum",
    "It's never quite ready",
    "I freeze up when I think about launching",
    "I'm doing exactly what I coach people NOT to do",
    "Hiding behind preparation",
    "The fear is the issue, not the product"
  ]
}

class PersonaSimulator {
  constructor() {
    this.conversationHistory = []
    this.turnCount = 0
  }

  /**
   * Generate a realistic response using Claude Haiku
   */
  async generateResponse(advisorMessage) {
    // Build context from conversation history
    const historyContext = this.conversationHistory
      .slice(-8) // Last 4 exchanges
      .map(m => `${m.role === 'advisor' ? 'Advisor' : 'Priya'}: ${m.text}`)
      .join('\n')

    const prompt = `${PERSONA.description}

CHAT HISTORY:
${historyContext || '(Starting the conversation)'}

ADVISOR'S MESSAGE:
"${advisorMessage}"

Type your reply as Priya. Remember: plain text only, no asterisks or stage directions. 1-3 sentences.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 250,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    return textBlock ? textBlock.text.trim() : "I'm not sure how to respond to that."
  }

  /**
   * Create a new session
   */
  async createSession() {
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: PERSONA.name })
    })

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`)
    }

    const data = await response.json()
    return data.session
  }

  /**
   * Send message to advisor
   */
  async sendMessage(sessionId, message) {
    const response = await fetch(`${API_URL}/chat/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to send message: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  /**
   * Get session state
   */
  async getSession(sessionId) {
    const response = await fetch(`${API_URL}/sessions/${sessionId}`)

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * Run the full conversation
   */
  async run() {
    console.log('='.repeat(80))
    console.log('E2E TEST: Priya Sharma (Dynamic Persona Simulation)')
    console.log('Expected Constraint: EXECUTION (perfectionism/fear of launching)')
    console.log('='.repeat(80))
    console.log('')
    console.log('Persona: Burnout Prevention Coach')
    console.log('Background: Former VP Engineering, now coaching for 2 years')
    console.log('Issue: Keeps perfecting group program but never launches')
    console.log('')

    try {
      // Create session
      console.log('Creating session...')
      const session = await this.createSession()
      console.log(`Session created: ${session.id}`)
      console.log('')

      // Step 1: Get initial greeting by sending __INIT__
      console.log('-'.repeat(80))
      console.log('INITIAL GREETING')
      console.log('-'.repeat(80))
      console.log('')

      const initResponse = await this.sendMessage(session.id, '__INIT__')
      const greeting = initResponse.advisorMessage.message_text

      console.log(`ADVISOR: "${greeting}"`)
      console.log('')

      // Store greeting in history
      this.conversationHistory.push({ role: 'advisor', text: greeting })

      const MAX_TURNS = 20
      let isComplete = false

      // Step 2: Conversation loop
      while (this.turnCount < MAX_TURNS && !isComplete) {
        this.turnCount++

        // Get the last advisor message from history
        const lastAdvisorMessage = this.conversationHistory[this.conversationHistory.length - 1]?.text

        // Generate Priya's response
        const userResponse = await this.generateResponse(lastAdvisorMessage)

        console.log('-'.repeat(80))
        console.log(`TURN ${this.turnCount}`)
        console.log('-'.repeat(80))
        console.log('')
        console.log(`PRIYA: "${userResponse}"`)
        console.log('')

        // Store user message
        this.conversationHistory.push({ role: 'user', text: userResponse })

        // Send to advisor
        const response = await this.sendMessage(session.id, userResponse)
        const advisorReply = response.advisorMessage.message_text

        console.log(`ADVISOR: "${advisorReply}"`)
        console.log('')

        // Store advisor message
        this.conversationHistory.push({ role: 'advisor', text: advisorReply })

        // Get updated session state
        const updatedSession = await this.getSession(session.id)
        const state = updatedSession.session.conversation_state

        // Show state snapshot
        console.log('STATE:')
        console.log(`  Phase: ${state?.phase || 'N/A'}`)
        console.log(`  Action: ${state?.last_action || 'N/A'}`)
        console.log(`  Expertise: ${state?.learner_state?.expertise_level || 'N/A'}`)
        console.log(`  Insights: ${state?.learner_state?.insights_articulated?.length || 0}`)
        console.log(`  Commitment: ${state?.readiness_check?.commitment_level || 'N/A'}`)
        console.log(`  Hypothesis Co-Created: ${state?.learner_state?.hypothesis_co_created || false}`)
        console.log(`  Stress Test Passed: ${state?.learner_state?.stress_test_passed || false}`)
        console.log(`  Constraint: ${state?.constraint_hypothesis?.category || 'N/A'}`)
        console.log('')

        // Check for completion - only end when we get complete:true from API or phase is 'complete'
        const phaseComplete = state?.phase === 'complete'
        const apiComplete = response.complete === true
        const statusComplete = updatedSession.session.completion_status === 'completed'

        if (phaseComplete || apiComplete || statusComplete) {
          isComplete = true
          console.log('  [CONVERSATION COMPLETE - phase=' + state?.phase + ']')
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      // Final results
      console.log('='.repeat(80))
      console.log('FINAL RESULTS')
      console.log('='.repeat(80))
      console.log('')

      const finalSession = await this.getSession(session.id)
      const finalState = finalSession.session.conversation_state

      console.log('Session:')
      console.log(`  ID: ${session.id}`)
      console.log(`  Turns: ${this.turnCount}`)
      console.log(`  Constraint Category: ${finalSession.session.constraint_category || 'NOT SET'}`)
      console.log(`  Constraint Summary: ${finalSession.session.constraint_summary || 'N/A'}`)
      console.log('')

      console.log('Learner State:')
      console.log(`  Expertise: ${finalState?.learner_state?.expertise_level || 'N/A'}`)
      console.log(`  Milestones: ${finalState?.learner_state?.learning_milestones || 0}`)
      console.log(`  Hypothesis Co-Created: ${finalState?.learner_state?.hypothesis_co_created || false}`)
      console.log(`  Stress Test Passed: ${finalState?.learner_state?.stress_test_passed || false}`)
      console.log('')

      console.log('Readiness:')
      console.log(`  Commitment: ${finalState?.readiness_check?.commitment_level || 'N/A'}`)
      console.log(`  Ready for Booking: ${finalState?.readiness_check?.ready_for_booking || false}`)
      console.log('')

      console.log('Insights Captured:')
      const insights = finalState?.learner_state?.insights_articulated || []
      insights.forEach((insight, i) => console.log(`  ${i + 1}. ${insight}`))
      console.log('')

      // Validation
      console.log('='.repeat(80))
      console.log('VALIDATION')
      console.log('='.repeat(80))
      console.log('')

      const constraintMatch = finalSession.session.constraint_category === PERSONA.expectedConstraint
      console.log(`Expected Constraint: ${PERSONA.expectedConstraint}`)
      console.log(`Actual Constraint: ${finalSession.session.constraint_category || 'NOT SET'}`)
      console.log(`Result: ${constraintMatch ? 'PASS' : 'FAIL'}`)
      console.log('')

      console.log('Summary Page:')
      console.log(`http://localhost:3001/summary/${session.id}`)
      console.log('')

      console.log('='.repeat(80))
      console.log(constraintMatch ? 'TEST PASSED' : 'TEST FAILED')
      console.log('='.repeat(80))

      return {
        success: constraintMatch,
        sessionId: session.id,
        turns: this.turnCount,
        constraint: finalSession.session.constraint_category
      }

    } catch (error) {
      console.error('')
      console.error('ERROR:', error.message)
      console.error(error.stack)
      return { success: false, error: error.message }
    }
  }
}

// Run the test
const simulator = new PersonaSimulator()
simulator.run().then(result => {
  process.exit(result.success ? 0 : 1)
})
