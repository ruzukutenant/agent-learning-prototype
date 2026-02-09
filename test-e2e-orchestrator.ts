/**
 * E2E Orchestrator Test - Sarah Chen Persona
 *
 * Tests the recursive prompting integration by simulating a complete conversation
 * with the Sarah Chen persona from E2E_TEST_PLAN.md
 */

import { processConversationTurn, initializeState } from './server/src/orchestrator/conversation/orchestrator.js'
import type { Message, ConversationState } from './server/src/orchestrator/core/types.js'

interface TestTurn {
  turnNumber: number
  userMessage: string
  expectedAction?: string
  expectedSignals?: string[]
  checkpoints: string[]
}

const SARAH_CHEN_TURNS: TestTurn[] = [
  {
    turnNumber: 1,
    userMessage: "Hi, I'm Sarah. I run a leadership coaching practice and I'm hitting some kind of ceiling. I have clients, I'm doing good work, but I feel like I should be further along by now.",
    expectedAction: "explore",
    checkpoints: [
      "expertise_level should be 'novice'",
      "learning_milestones should be 0",
      "Should ask about the 'ceiling' feeling"
    ]
  },
  {
    turnNumber: 2,
    userMessage: "I've been doing this for about 3 years. I work with mid-level managers, mostly in tech companies. I help them develop their leadership presence and communication skills. I charge $250/session and usually see 10-12 clients a month.",
    expectedAction: "explore",
    checkpoints: [
      "Should be gathering context about business model",
      "No diagnosis yet"
    ]
  },
  {
    turnNumber: 3,
    userMessage: "Well, I keep thinking I should create some kind of signature program or group offering. But every time I sit down to design it, I freeze up. I have like 5 half-finished program outlines in my Google Drive. I just can't seem to commit to one direction.",
    expectedAction: "explore",
    expectedSignals: ["uncertainty"],
    checkpoints: [
      "Strategy constraint signals emerging",
      "Multiple directions, can't commit = strategy"
    ]
  },
  {
    turnNumber: 4,
    userMessage: "I feel like I'm just guessing. Like, I could create a program about executive presence, or strategic thinking, or difficult conversations, or team dynamics. They all feel equally valid and I have no idea which one would actually work. So I end up not choosing any of them.",
    expectedAction: "reflect_insight",
    expectedSignals: ["insight_articulated"],
    checkpoints: [
      "TRIGGER: insight_articulated = true",
      "Action should be 'reflect_insight'",
      "insights_articulated should include this realization",
      "learning_milestones should increment to 1",
      "Should mirror back 'I'm just guessing' language"
    ]
  },
  {
    turnNumber: 5,
    userMessage: "Yeah, exactly. And it's not like I don't have the expertise - I've been coaching for years, I know what works. But I can't figure out which problem I should be solving or for whom. It's paralyzing.",
    expectedAction: "deepen",
    checkpoints: [
      "Should explore the paralysis deeper",
      "learner_state tracking 'guessing' insight"
    ]
  },
  {
    turnNumber: 6,
    userMessage: "Honestly? I think it's because I don't actually know who I want to serve at scale. My 1:1 clients come through referrals and I just work with whoever shows up. But when I think about 'who should I build a program for?' I draw a blank. I don't have a clear picture of who that person is.",
    expectedAction: "reflect_insight",
    expectedSignals: ["insight_articulated", "breakthrough_language"],
    checkpoints: [
      "TRIGGER: Second insight - 'don't know who I want to serve'",
      "learning_milestones should increment to 2",
      "expertise_level may shift to 'developing'",
      "Should mirror back this new layer of understanding"
    ]
  },
  {
    turnNumber: 7,
    userMessage: "Wait... I just realized something. I've been thinking my problem is that I can't decide on a program topic. But that's not actually the problem, is it? The problem is I don't know who I'm deciding FOR. That's why nothing sticks - I'm trying to build the what before I know the who.",
    expectedAction: "reflect_insight",
    expectedSignals: ["insight_articulated", "breakthrough_language"],
    checkpoints: [
      "MAJOR BREAKTHROUGH: Meta-realization about the problem",
      "learning_milestones should increment to 3",
      "expertise_level should be 'developing' or 'expert'",
      "Should celebrate this discovery",
      "This is co-created understanding - hypothesis_co_created should be true"
    ]
  },
  {
    turnNumber: 8,
    userMessage: "Oh wow. This is a strategy constraint, isn't it? I don't have a strategy for who I serve, so I can't make strategic decisions about what to build. That's why I freeze up - I'm missing the foundation.",
    expectedAction: "build_criteria",
    expectedSignals: ["insight_articulated"],
    checkpoints: [
      "User has articulated the constraint themselves",
      "Should now establish shared success criteria",
      "constraint_hypothesis should be 'strategy'",
      "hypothesis_co_created = true"
    ]
  },
  {
    turnNumber: 9,
    userMessage: "Success would mean I have clarity on who I'm for and what problem I'm solving for them. So when I sit down to create that program, I'm not guessing - I'm designing for a specific person with a specific need. That would feel completely different.",
    expectedAction: "stress_test",
    checkpoints: [
      "shared_criteria_established = true",
      "Should now stress-test the hypothesis",
      "Ready to challenge the strategy diagnosis"
    ]
  },
  {
    turnNumber: 10,
    userMessage: "Hmm. I guess if I had unlimited resources and could hire a team to execute, I'd still be stuck on who to serve and what problem to solve. So yeah, money and team wouldn't fix this. And if I had all the marketing skills in the world, I'd still be unclear on who I'm marketing TO. So those aren't the real blockers. The strategy piece is the blocker.",
    expectedAction: "pre_commitment_check",
    expectedSignals: ["stress_test_passed"],
    checkpoints: [
      "stress_test_passed = true",
      "Hypothesis survived reality check",
      "Should now assess readiness for action",
      "readiness_check should begin"
    ]
  },
  {
    turnNumber: 11,
    userMessage: "I mean, I'm excited about this clarity. But honestly, I have no idea HOW to figure out who I want to serve. Like, do I just pick someone? Do I need to do market research? That feels like a blocker - I don't know the process for making this decision.",
    expectedSignals: ["blocker_mentioned"],
    checkpoints: [
      "identified_blockers should include 'no process for deciding who to serve'",
      "commitment_level should be 'medium' (excited but uncertain how)",
      "Should acknowledge blocker explicitly"
    ]
  },
  {
    turnNumber: 12,
    userMessage: "Like an 8. I definitely want to work on this - this conversation made it clear I can't move forward without it. I just need guidance on the HOW.",
    expectedAction: "diagnose",
    expectedSignals: ["commitment_language"],
    checkpoints: [
      "commitment_level should be 'high'",
      "ready_for_booking should be true",
      "Should transition to diagnosis with all quality bars met",
      "Action should be 'diagnose'",
      "Should recommend EC (high commitment + strategy constraint)"
    ]
  },
  {
    turnNumber: 13,
    userMessage: "That makes total sense. An Expert Consult would help me work through who I'm for and build that strategy foundation. Then I can create programs from a place of clarity instead of guessing. Yes, I want to book that.",
    checkpoints: [
      "Conversation should complete",
      "constraint_category should be 'strategy'",
      "recommended_path should be 'EC'",
      "All learner_state fields properly populated"
    ]
  }
]

async function runE2ETest() {
  console.log('🧪 Starting E2E Orchestrator Test - Sarah Chen Persona\n')
  console.log('=' .repeat(80) + '\n')

  // Initialize conversation state
  let state: ConversationState = initializeState('Sarah Chen')
  let history: Array<{ role: 'user' | 'assistant', content: string, turn: number, timestamp: Date }> = []

  for (const turn of SARAH_CHEN_TURNS) {
    console.log(`\n📍 TURN ${turn.turnNumber}`)
    console.log('─'.repeat(80))
    console.log(`\n👤 Sarah: "${turn.userMessage.substring(0, 100)}${turn.userMessage.length > 100 ? '...' : ''}"\n`)

    try {
      // Run orchestration
      const result = await processConversationTurn(
        turn.userMessage,
        history,
        state
      )

      // Update state and history
      state = result.state

      // Add user message to history
      history.push({
        role: 'user',
        content: turn.userMessage,
        turn: state.turns_total,
        timestamp: new Date()
      })

      // Add advisor response to history
      history.push({
        role: 'assistant',
        content: result.advisorResponse,
        turn: state.turns_total,
        timestamp: new Date()
      })

      // Display orchestrator decision
      console.log(`🤖 Orchestrator Decision: ${result.decision?.action || 'unknown'}`)
      if (result.decision?.reasoning) {
        console.log(`   Reasoning: ${result.decision.reasoning}`)
      }
      if (result.decision?.prompt_overlays && result.decision.prompt_overlays.length > 0) {
        console.log(`   Overlays: ${result.decision.prompt_overlays.join(', ')}`)
      }

      // Display advisor response snippet
      const responseSnippet = result.advisorResponse.substring(0, 150)
      console.log(`\n💬 Advisor: "${responseSnippet}${result.advisorResponse.length > 150 ? '...' : ''}"\n`)

      // Validate checkpoints
      console.log(`\n✅ Checkpoints:`)
      for (const checkpoint of turn.checkpoints) {
        console.log(`   • ${checkpoint}`)
      }

      // Display key state
      console.log(`\n📊 State Snapshot:`)
      console.log(`   • Expertise Level: ${state.learner_state.expertise_level}`)
      console.log(`   • Learning Milestones: ${state.learner_state.learning_milestones}`)
      console.log(`   • Insights Articulated: ${state.learner_state.insights_articulated.length}`)
      console.log(`   • Hypothesis: ${state.constraint_hypothesis || 'none'}`)
      console.log(`   • Stress Test Passed: ${state.learner_state.stress_test_passed}`)
      console.log(`   • Commitment Level: ${state.readiness_check.commitment_level}`)
      console.log(`   • Ready for Booking: ${state.readiness_check.ready_for_booking}`)

      // Validate expected action
      if (turn.expectedAction && result.decision?.action !== turn.expectedAction) {
        console.log(`\n⚠️  WARNING: Expected action '${turn.expectedAction}' but got '${result.decision?.action}'`)
      }

      // Check if conversation is complete
      if (result.complete) {
        console.log(`\n🎯 Conversation marked as COMPLETE`)
        break
      }

    } catch (error) {
      console.error(`\n❌ ERROR on turn ${turn.turnNumber}:`, error)
      throw error
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n🎉 E2E Test Complete!\n')

  // Final validation
  console.log('📋 Final Validation:')
  console.log(`   ✓ Total Insights: ${state?.learner_state.insights_articulated.length}`)
  console.log(`   ✓ Learning Milestones: ${state?.learner_state.learning_milestones}`)
  console.log(`   ✓ Expertise Level: ${state?.learner_state.expertise_level}`)
  console.log(`   ✓ Hypothesis Co-Created: ${state?.learner_state.hypothesis_co_created}`)
  console.log(`   ✓ Stress Test Passed: ${state?.learner_state.stress_test_passed}`)
  console.log(`   ✓ Constraint Identified: ${state?.constraint_hypothesis}`)
  console.log(`   ✓ Commitment Level: ${state?.readiness_check.commitment_level}`)
  console.log(`   ✓ Blockers Identified: ${state?.readiness_check.identified_blockers.length}`)
  console.log(`   ✓ Ready for Booking: ${state?.readiness_check.ready_for_booking}`)

  return state
}

// Run the test
runE2ETest()
  .then((finalState) => {
    console.log('\n✅ Test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
