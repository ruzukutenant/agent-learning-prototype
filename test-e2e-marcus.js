/**
 * E2E Test: Marcus Chen Persona
 * Following E2E_TEST_PLAN_COMPLETE.md
 */

const BASE_URL = 'http://localhost:3001/api';

// Marcus Chen conversation script from E2E test plan
const MARCUS_CONVERSATION = [
  {
    turn: 1,
    message: "Hi, I'm Marcus. I run an executive coaching practice focused on helping mid-level managers become better leaders. I've been doing this for about 3 years now. My challenge is that I seem to have hit a ceiling around $70-80K per year, and I can't figure out how to break through.",
    expectedAction: 'explore',
    expectedExpertise: 'novice'
  },
  {
    turn: 2,
    message: "I work with managers across different industries - tech, healthcare, finance. Mostly people who've been promoted to management for the first time and are struggling with the transition. Ages range from late 20s to early 40s.",
    expectedAction: ['explore', 'deepen']
  },
  {
    turn: 3,
    message: "I do 1:1 coaching mostly, some group workshops. Packages range from $2K to $8K depending on length. I get most clients through referrals and some LinkedIn outreach.",
    expectedAction: ['deepen', 'reflect_insight']
  },
  {
    turn: 4,
    message: "Honestly, I feel like I'm just guessing when I talk to potential clients. Like, I know I can help them, but I don't have a clear... I don't know, framework? It feels like I'm reinventing the wheel every time.",
    expectedAction: 'reflect_insight',
    expectedInsight: true,
    expectedContainment: false, // BUG #2 TEST
    expectedExpertise: 'developing'
  },
  {
    turn: 5,
    message: "Right. I mean, I market myself as helping 'new managers' but that could be anyone. A new manager in tech has completely different challenges than one in healthcare.",
    expectedAction: ['deepen', 'reflect_insight']
  },
  {
    turn: 6,
    message: "Oh wait. I just realized something. I don't know who I'm building my programs FOR. I keep trying to create content and frameworks, but I haven't actually decided on my ideal client first. That's backwards!",
    expectedAction: 'reflect_insight',
    expectedMetaCognition: true, // BUG #6 TEST
    expectedExpertise: 'expert' // Should upgrade immediately
  },
  {
    turn: 7,
    message: "So I think my problem is I'm trying to serve everyone, which means I'm not really positioned for anyone specifically. Is that a strategy issue?",
    expectedAction: ['validate', 'reflect_insight'],
    expectedHypothesisCoCreated: true // BUG #5 TEST
  },
  {
    turn: 8,
    message: "Yeah, that makes total sense. When I think about my most successful clients - the ones who got the best results and referred others - they were all tech managers. First-time engineering managers specifically.",
    expectedAction: 'validate',
    expectedHypothesisValidated: true
  },
  {
    turn: 9,
    message: "But wait, if I narrow down to just engineering managers, won't I lose potential clients? What about the healthcare managers or finance managers I've worked with?",
    expectedAction: 'stress_test',
    expectedStressTestCompleted: true
  },
  {
    turn: 10,
    message: "Actually, you're right. My 'broad' approach hasn't gotten me past $80K in 3 years. And my best clients - the ones who paid more and referred others - were the specific ones. So narrowing down is probably less risky than staying broad and stuck.",
    expectedAction: 'stress_test',
    expectedStressTestPassed: true // BUG #5 TEST
  },
  {
    turn: 11,
    message: "I'm excited about this clarity. I can already see how I'd redo my LinkedIn profile, my website, my pitch. This feels like the breakthrough I needed.",
    expectedAction: 'pre_commitment_check', // BUG #1 TEST - NOT diagnose
    expectedContainment: false, // BUG #2 TEST - positive emotion
    expectedCommitmentLevel: 'high' // BUG #3 TEST
  },
  {
    turn: 12,
    message: "No major blockers. I have the time and budget to work on this. I just need guidance on HOW to make this strategic shift without losing momentum.",
    expectedAction: 'diagnose', // NOW it should diagnose
    expectedConstraint: 'strategy',
    expectedComplete: true
  }
];

async function createSession() {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'Marcus Chen' })
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }

  const data = await response.json();
  return data.session;
}

async function sendMessage(sessionId, message) {
  const response = await fetch(`${BASE_URL}/chat/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function getSession(sessionId) {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error(`Failed to get session: ${response.status}`);
  }

  return await response.json();
}

function validateTurn(turnData, expectedData, conversationState) {
  const validations = [];

  // Action validation
  if (expectedData.expectedAction) {
    const expectedActions = Array.isArray(expectedData.expectedAction)
      ? expectedData.expectedAction
      : [expectedData.expectedAction];

    const actualAction = conversationState?.last_action;
    const actionMatch = expectedActions.includes(actualAction);

    validations.push({
      test: 'Action',
      expected: expectedActions.join(' OR '),
      actual: actualAction,
      pass: actionMatch
    });
  }

  // Containment validation
  if (expectedData.expectedContainment !== undefined) {
    const containmentTriggered = conversationState?.turns_since_containment === 0;
    validations.push({
      test: 'Containment',
      expected: expectedData.expectedContainment ? 'triggered' : 'NOT triggered',
      actual: containmentTriggered ? 'triggered' : 'NOT triggered',
      pass: containmentTriggered === expectedData.expectedContainment
    });
  }

  // Expertise validation
  if (expectedData.expectedExpertise) {
    const actualExpertise = conversationState?.learner_state?.expertise_level;
    validations.push({
      test: 'Expertise Level',
      expected: expectedData.expectedExpertise,
      actual: actualExpertise,
      pass: actualExpertise === expectedData.expectedExpertise
    });
  }

  // Commitment level validation
  if (expectedData.expectedCommitmentLevel) {
    const actualCommitment = conversationState?.readiness_check?.commitment_level;
    validations.push({
      test: 'Commitment Level',
      expected: expectedData.expectedCommitmentLevel,
      actual: actualCommitment,
      pass: actualCommitment === expectedData.expectedCommitmentLevel
    });
  }

  // Hypothesis co-created validation
  if (expectedData.expectedHypothesisCoCreated) {
    const actual = conversationState?.learner_state?.hypothesis_co_created;
    validations.push({
      test: 'Hypothesis Co-Created',
      expected: true,
      actual: actual,
      pass: actual === true
    });
  }

  // Stress test passed validation
  if (expectedData.expectedStressTestPassed) {
    const actual = conversationState?.learner_state?.stress_test_passed;
    validations.push({
      test: 'Stress Test Passed',
      expected: true,
      actual: actual,
      pass: actual === true
    });
  }

  // Constraint validation
  if (expectedData.expectedConstraint) {
    const actualConstraint = conversationState?.constraint_hypothesis?.category;
    validations.push({
      test: 'Constraint Category',
      expected: expectedData.expectedConstraint,
      actual: actualConstraint,
      pass: actualConstraint === expectedData.expectedConstraint
    });
  }

  return validations;
}

async function runE2ETest() {
  console.log('='.repeat(80));
  console.log('E2E TEST: Marcus Chen Persona');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Create session
    console.log('Creating session for Marcus Chen...');
    const session = await createSession();
    console.log(`✓ Session created: ${session.id}`);
    console.log('');

    const transcript = [];
    let allValidationsPassed = true;

    // Run through conversation
    for (const turn of MARCUS_CONVERSATION) {
      console.log('-'.repeat(80));
      console.log(`TURN ${turn.turn}`);
      console.log('-'.repeat(80));
      console.log('');
      console.log(`USER (Marcus):`);
      console.log(`"${turn.message}"`);
      console.log('');

      // Send message
      const response = await sendMessage(session.id, turn.message);

      console.log(`ADVISOR:`);
      console.log(`"${response.advisorMessage.message_text}"`);
      console.log('');

      // Get updated session state
      const sessionData = await getSession(session.id);
      const conversationState = sessionData.session.conversation_state;

      // Store transcript
      transcript.push({
        turn: turn.turn,
        user: turn.message,
        advisor: response.advisorMessage.message_text,
        state: conversationState
      });

      // Validate expectations
      if (Object.keys(turn).length > 2) { // Has expectations beyond turn and message
        console.log('VALIDATIONS:');
        const validations = validateTurn(turn, turn, conversationState);

        for (const validation of validations) {
          const symbol = validation.pass ? '✓' : '✗';
          const status = validation.pass ? 'PASS' : 'FAIL';
          console.log(`  ${symbol} ${validation.test}: ${status}`);
          console.log(`    Expected: ${validation.expected}`);
          console.log(`    Actual: ${validation.actual}`);

          if (!validation.pass) {
            allValidationsPassed = false;
          }
        }
        console.log('');
      }

      // Show key state
      console.log('STATE SNAPSHOT:');
      console.log(`  Action: ${conversationState?.last_action || 'N/A'}`);
      console.log(`  Expertise: ${conversationState?.learner_state?.expertise_level || 'N/A'}`);
      console.log(`  Insights: ${conversationState?.learner_state?.insights_articulated?.length || 0}`);
      console.log(`  Commitment: ${conversationState?.readiness_check?.commitment_level || 'N/A'}`);
      console.log(`  Hypothesis Co-Created: ${conversationState?.learner_state?.hypothesis_co_created || false}`);
      console.log(`  Stress Test Passed: ${conversationState?.learner_state?.stress_test_passed || false}`);
      console.log('');

      // Wait a bit between turns to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final session state
    console.log('='.repeat(80));
    console.log('FINAL SESSION STATE');
    console.log('='.repeat(80));
    console.log('');

    const finalSession = await getSession(session.id);
    const finalState = finalSession.session.conversation_state;

    console.log('Constraint:', finalSession.session.constraint_category);
    console.log('Summary:', finalSession.session.constraint_summary);
    console.log('');
    console.log('Learner State:');
    console.log('  Expertise:', finalState?.learner_state?.expertise_level);
    console.log('  Insights:', JSON.stringify(finalState?.learner_state?.insights_articulated, null, 2));
    console.log('  Milestones:', finalState?.learner_state?.learning_milestones);
    console.log('  Hypothesis Co-Created:', finalState?.learner_state?.hypothesis_co_created);
    console.log('  Stress Test Passed:', finalState?.learner_state?.stress_test_passed);
    console.log('');
    console.log('Readiness Check:');
    console.log('  Commitment Level:', finalState?.readiness_check?.commitment_level);
    console.log('  Ready for Booking:', finalState?.readiness_check?.ready_for_booking);
    console.log('  Identified Blockers:', JSON.stringify(finalState?.readiness_check?.identified_blockers, null, 2));
    console.log('');

    // Summary URL
    console.log('Summary Page URL:');
    console.log(`http://localhost:3001/summary/${session.id}`);
    console.log('');

    // Overall result
    console.log('='.repeat(80));
    console.log(allValidationsPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
    console.log('='.repeat(80));

    return {
      success: allValidationsPassed,
      sessionId: session.id,
      transcript
    };

  } catch (error) {
    console.error('');
    console.error('ERROR:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run the test
runE2ETest().then(result => {
  process.exit(result.success ? 0 : 1);
});
