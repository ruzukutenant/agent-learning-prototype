/**
 * Automated Testing Harness for Advisor Flow
 *
 * Simulates realistic coach personas going through the entire interview.
 * Uses real Claude API to generate persona-appropriate responses.
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gqelaotedbyvysatnnsx.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
const API_URL = 'http://localhost:3001/api'

// Persona definitions
const PERSONAS = {
  strategy_gap: {
    name: 'Sarah - Strategy Gap',
    profile: {
      business: 'Life coach for burned-out professionals',
      acquisition: 'Instagram posts and occasional referrals',
      volume: '2-3 clients per month, around $6K monthly',
      challenge: 'People are interested but don\'t convert to paying clients'
    },
    characteristics: [
      'Unclear on value proposition',
      'Nervous about pricing',
      'Gets lots of interest but low conversion',
      'Doesn\'t know how to position offer clearly',
      'Talks about services in vague terms'
    ],
    expectedConstraint: 'strategy',
    expectedEndpoint: 'EC', // Strategic challenge, not a deliverable
    readinessLevel: 'medium' // Scores around 5-7
  },

  execution_bottleneck: {
    name: 'Marcus - Execution Bottleneck',
    profile: {
      business: 'Business coach for small service businesses',
      acquisition: 'LinkedIn and referrals',
      volume: '5-6 clients per month, $15K monthly',
      challenge: 'Everything is manual, can\'t scale beyond current capacity'
    },
    characteristics: [
      'Knows what needs to happen',
      'Drowning in admin work',
      'No systems for onboarding, scheduling, follow-up',
      'Spending hours on manual tasks',
      'Can\'t grow because personally doing everything'
    ],
    expectedConstraint: 'execution',
    expectedEndpoint: 'EC', // Strategic process problem, not a specific deliverable
    readinessLevel: 'high' // Scores 7-9, clear and ready
  },

  execution_deliverable: {
    name: 'Jessica - Needs Funnel Built',
    profile: {
      business: 'Health coach specializing in nutrition',
      acquisition: 'Paid Facebook ads to webinar',
      volume: '8-10 clients per month, $20K monthly',
      challenge: 'Webinar registration funnel is broken, losing leads'
    },
    characteristics: [
      'Has a webinar that works',
      'Needs a proper funnel built',
      'Knows exactly what pages needed',
      'Current landing page isn\'t converting',
      'Wants someone to build it professionally',
      'Has the content, needs implementation'
    ],
    expectedConstraint: 'execution',
    expectedEndpoint: 'MIST', // Specific deliverable: build a funnel
    readinessLevel: 'high' // Clear on what\'s needed, ready to move
  },

  energy_drain: {
    name: 'Tom - Energy Drain',
    profile: {
      business: 'Executive coach for tech leaders',
      acquisition: 'Mostly referrals',
      volume: '4 clients per month, $12K monthly',
      challenge: 'Losing motivation, business feels like a grind'
    },
    characteristics: [
      'Started excited, now burned out',
      'Working with clients who drain energy',
      'Not excited about the work anymore',
      'Feast/famine revenue stress',
      'Isolated, doing it all alone'
    ],
    expectedConstraint: 'energy',
    expectedEndpoint: 'EC', // Needs strategic coaching on business restructuring
    readinessLevel: 'low' // Scores 3-6, uncertain
  },

  not_ready: {
    name: 'Alex - Not Ready',
    profile: {
      business: 'Career coach for mid-career transitions',
      acquisition: 'Word of mouth',
      volume: 'Just getting started, 1 client so far',
      challenge: 'Everything feels overwhelming and unclear'
    },
    characteristics: [
      'Very early stage',
      'Not clear on what to focus on',
      'Low confidence',
      'No capacity right now',
      'Needs time to think'
    ],
    expectedConstraint: 'strategy',
    expectedEndpoint: 'NURTURE', // Low readiness, not ready for consultation
    readinessLevel: 'very_low' // All scores <5
  }
}

interface Message {
  speaker: 'user' | 'advisor'
  text: string
  phase?: string
}

class PersonaSimulator {
  private anthropic: Anthropic
  private persona: typeof PERSONAS[keyof typeof PERSONAS]
  private conversationHistory: Message[] = []

  constructor(personaKey: keyof typeof PERSONAS) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    this.persona = PERSONAS[personaKey]
  }

  /**
   * Generate a realistic user response using Claude
   */
  async generateUserResponse(advisorQuestion: string, phase: string): Promise<string> {
    const readinessScores = this.getReadinessScores()

    const prompt = `You are roleplaying as ${this.persona.name}, a coach with these characteristics:

**Profile:**
- Business: ${this.persona.profile.business}
- How clients find them: ${this.persona.profile.acquisition}
- Volume: ${this.persona.profile.volume}
- Main challenge: ${this.persona.profile.challenge}

**Personality traits:**
${this.persona.characteristics.map(c => `- ${c}`).join('\n')}

**Readiness level:** ${this.persona.readinessLevel}
${readinessScores ? `(Clarity: ${readinessScores.clarity}/10, Confidence: ${readinessScores.confidence}/10, Capacity: ${readinessScores.capacity}/10)` : ''}

**Current conversation context:**
${this.conversationHistory.slice(-6).map(m => `${m.speaker}: ${m.text}`).join('\n')}

**Latest advisor question:** ${advisorQuestion}

**Current phase:** ${phase}

Respond naturally as this persona would. Keep responses conversational and realistic (1-3 sentences).

${phase === 'readiness' ? 'If asked for a 1-10 score, just give the number.' : ''}
${phase === 'routing' && this.persona.expectedEndpoint === 'MIST' ? 'If asked about implementation vs strategy, express wanting someone to BUILD it for you.' : ''}
${phase === 'routing' && this.persona.expectedEndpoint === 'EC' ? 'If asked about implementation vs strategy, express wanting help figuring out the APPROACH.' : ''}

Response (just the text, no quotes or labels):`

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    return textBlock ? textBlock.text.trim() : 'Yes'
  }

  /**
   * Send a message to the advisor Edge Function
   */
  async sendToAdvisor(sessionId: string, message: string): Promise<any> {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-orchestrator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId, message })
    })

    if (!response.ok) {
      throw new Error(`Edge Function error: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Create a new session
   */
  async createSession(): Promise<string> {
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: this.persona.name })
    })

    const data = await response.json()
    return data.session.id
  }

  /**
   * Get final session state
   */
  async getSession(sessionId: string): Promise<any> {
    const response = await fetch(`${API_URL}/sessions/${sessionId}`)
    const data = await response.json()
    return data.session
  }

  /**
   * Get readiness scores based on persona's readiness level
   */
  getReadinessScores(): { clarity: number, confidence: number, capacity: number } | null {
    switch (this.persona.readinessLevel) {
      case 'high':
        return { clarity: 8, confidence: 8, capacity: 9 }
      case 'medium':
        return { clarity: 6, confidence: 7, capacity: 6 }
      case 'low':
        return { clarity: 5, confidence: 4, capacity: 5 }
      case 'very_low':
        return { clarity: 3, confidence: 3, capacity: 4 }
      default:
        return null
    }
  }

  /**
   * Run the full conversation simulation
   */
  async runConversation(): Promise<void> {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`TESTING PERSONA: ${this.persona.name}`)
    console.log(`Expected: ${this.persona.expectedConstraint} constraint → ${this.persona.expectedEndpoint} endpoint`)
    console.log('='.repeat(80))

    // Create session
    const sessionId = await this.createSession()
    console.log(`\n📝 Session created: ${sessionId}\n`)

    // Initialize conversation
    let response = await this.sendToAdvisor(sessionId, '__INIT__')
    let currentPhase = 'context'
    let turnCount = 0
    const maxTurns = 30

    this.conversationHistory.push({
      speaker: 'advisor',
      text: response.advisorMessage.message_text,
      phase: currentPhase
    })

    console.log(`[${currentPhase.toUpperCase()}] Advisor: ${response.advisorMessage.message_text}\n`)

    // Conversation loop
    while (turnCount < maxTurns) {
      turnCount++

      // Generate user response
      const userMessage = await this.generateUserResponse(
        response.advisorMessage.message_text,
        currentPhase
      )

      this.conversationHistory.push({
        speaker: 'user',
        text: userMessage,
        phase: currentPhase
      })

      console.log(`[${currentPhase.toUpperCase()}] User: ${userMessage}\n`)

      // Send to advisor
      await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
      response = await this.sendToAdvisor(sessionId, userMessage)

      // Update phase
      const session = await this.getSession(sessionId)
      currentPhase = session.current_phase

      this.conversationHistory.push({
        speaker: 'advisor',
        text: response.advisorMessage.message_text,
        phase: currentPhase
      })

      console.log(`[${currentPhase.toUpperCase()}] Advisor: ${response.advisorMessage.message_text}\n`)

      // Check if conversation is complete
      if (session.endpoint_selected || session.completion_status === 'completed') {
        console.log(`\n✅ Conversation complete!`)
        break
      }

      // Safety check for phase progression
      if (turnCount > 25) {
        console.log(`\n⚠️  Max turns reached, ending simulation`)
        break
      }
    }

    // Get final results
    const finalSession = await this.getSession(sessionId)

    console.log(`\n${'='.repeat(80)}`)
    console.log(`RESULTS FOR: ${this.persona.name}`)
    console.log('='.repeat(80))
    console.log(`Final Phase: ${finalSession.current_phase}`)
    console.log(`Constraint Category: ${finalSession.constraint_category || 'NOT SET'}`)
    console.log(`Endpoint Selected: ${finalSession.endpoint_selected || 'NOT SET'}`)
    console.log(`\nReadiness Scores:`)
    console.log(`  Clarity: ${finalSession.clarity_score || 'N/A'}/10`)
    console.log(`  Confidence: ${finalSession.confidence_score || 'N/A'}/10`)
    console.log(`  Capacity: ${finalSession.capacity_score || 'N/A'}/10`)

    // Validation
    const constraintMatch = finalSession.constraint_category === this.persona.expectedConstraint
    const endpointMatch = finalSession.endpoint_selected === this.persona.expectedEndpoint

    console.log(`\n${'─'.repeat(80)}`)
    console.log(`VALIDATION:`)
    console.log(`  Expected constraint: ${this.persona.expectedConstraint} ${constraintMatch ? '✅' : '❌ Got: ' + finalSession.constraint_category}`)
    console.log(`  Expected endpoint: ${this.persona.expectedEndpoint} ${endpointMatch ? '✅' : '❌ Got: ' + finalSession.endpoint_selected}`)

    if (constraintMatch && endpointMatch) {
      console.log(`\n🎉 PASS: Routing worked correctly!`)
    } else {
      console.log(`\n❌ FAIL: Routing mismatch`)
    }

    console.log(`\nView full conversation: http://localhost:5173/chat/${sessionId}`)
    console.log(`View summary: http://localhost:5173/summary/${sessionId}`)
    console.log('='.repeat(80))
  }
}

// Main execution
async function runAllPersonas() {
  const personaKeys = Object.keys(PERSONAS) as Array<keyof typeof PERSONAS>

  console.log(`\n🤖 Starting Automated Persona Testing`)
  console.log(`Testing ${personaKeys.length} personas...\n`)

  for (const personaKey of personaKeys) {
    const simulator = new PersonaSimulator(personaKey)

    try {
      await simulator.runConversation()
    } catch (error) {
      console.error(`\n❌ Error testing ${PERSONAS[personaKey].name}:`, error)
    }

    // Wait between personas
    if (personaKey !== personaKeys[personaKeys.length - 1]) {
      console.log(`\nWaiting 3 seconds before next persona...\n`)
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  console.log(`\n✅ All persona tests complete!\n`)
}

// Run a single persona or all
const targetPersona = process.argv[2] as keyof typeof PERSONAS | undefined

if (targetPersona && PERSONAS[targetPersona]) {
  const simulator = new PersonaSimulator(targetPersona)
  simulator.runConversation().catch(console.error)
} else if (targetPersona) {
  console.error(`Unknown persona: ${targetPersona}`)
  console.log(`Available personas: ${Object.keys(PERSONAS).join(', ')}`)
  process.exit(1)
} else {
  runAllPersonas().catch(console.error)
}
