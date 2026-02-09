/**
 * E2E Test: Priya Sharma Persona
 *
 * Profile: Burnout Prevention Coach
 * - Former tech executive who experienced burnout
 * - Now helps high-performers avoid burnout
 * - Has credentials and knowledge but keeps over-preparing
 * - Never launches her premium program (execution constraint)
 *
 * Expected Constraint: EXECUTION (perfectionism/fear of launching)
 */

const BASE_URL = 'http://localhost:3001/api';

// Priya Sharma conversation script - tests EXECUTION constraint
const PRIYA_CONVERSATION = [
  {
    turn: 1,
    message: "Hi, I'm Priya. I'm a burnout prevention coach. I spent 15 years in tech leadership before burning out myself, so now I help other high-performers recognize and prevent burnout before it derails their careers. I've been coaching for 2 years but I'm stuck around $40K and I know I should be earning way more given my background.",
    expectedAction: 'explore',
    expectedExpertise: 'novice'
  },
  {
    turn: 2,
    message: "My clients are mostly tech executives and senior managers, people in their 30s and 40s who are high achievers but starting to feel the cracks. They're the ones who won't admit they're struggling until they're already close to the edge. Companies like Google, Meta, startups - that whole world.",
    expectedAction: ['explore', 'deepen']
  },
  {
    turn: 3,
    message: "Right now I do one-on-one coaching, usually $3K for a 3-month package. I've got a signature framework I developed called the 'Sustainable Performance System' - it's really solid, based on my experience and a lot of research. I've been wanting to turn it into a group program for over a year now.",
    expectedAction: ['deepen', 'reflect_insight']
  },
  {
    turn: 4,
    message: "That's the thing though. I keep working on the group program but I never actually... launch it. I've rewritten the curriculum probably five times. I keep thinking it's not quite ready yet. There's always something else I need to add or refine.",
    expectedAction: 'reflect_insight',
    expectedInsight: true,
    expectedContainment: false, // No emotional distress here
    expectedExpertise: 'developing'
  },
  {
    turn: 5,
    message: "I mean, I know it's good. I've tested parts of it with individual clients and they get amazing results. One of my clients said it literally saved her career. But when I think about putting it out there for a group, I freeze up.",
    expectedAction: ['deepen', 'reflect_insight']
  },
  {
    turn: 6,
    message: "Oh wow. I just heard myself. I'm literally doing the thing I coach my clients NOT to do - waiting until everything is perfect before taking action. I've been hiding behind 'preparation' because I'm scared of putting myself out there.",
    expectedAction: 'reflect_insight',
    expectedMetaCognition: true, // Self-awareness breakthrough
    expectedExpertise: 'expert'
  },
  {
    turn: 7,
    message: "So my constraint isn't that I don't know what to do or who to serve. I know exactly who I help and how. My problem is I won't pull the trigger and actually launch. It's an execution issue, isn't it?",
    expectedAction: ['validate', 'reflect_insight'],
    expectedHypothesisCoCreated: true
  },
  {
    turn: 8,
    message: "The irony is painful. I teach people about the dangers of perfectionism and how it's often fear in disguise. And here I am, version 5 of a program that was probably ready at version 2, because I'm afraid of being judged.",
    expectedAction: 'validate',
    expectedHypothesisValidated: true
  },
  {
    turn: 9,
    message: "But what if the program really isn't good enough? What if I launch and people ask for refunds? What if my tech exec clients think less of me because my production quality isn't as polished as what they're used to?",
    expectedAction: 'stress_test',
    expectedStressTestCompleted: true
  },
  {
    turn: 10,
    message: "You're right. I already have proof it works - my one-on-one clients rave about the framework. And perfecting it more isn't going to change whether I'm scared to launch. Version 10 wouldn't feel 'ready' either. The fear is the issue, not the product.",
    expectedAction: 'stress_test',
    expectedStressTestPassed: true
  },
  {
    turn: 11,
    message: "I'm actually feeling relieved naming this. It's been sitting in the back of my mind for a year and I kept telling myself I just needed more time. But time wasn't the problem. I need to just ship it.",
    expectedAction: 'pre_commitment_check',
    expectedContainment: false, // Positive emotion - relief
    expectedCommitmentLevel: 'high'
  },
  {
    turn: 12,
    message: "No major obstacles. I have the content, I have the audience, I have testimonials from 1:1 clients. I just need accountability and maybe some tactical help on actually hitting 'publish' instead of endlessly tweaking.",
    expectedAction: 'diagnose',
    expectedConstraint: 'execution',
    expectedComplete: true
  }
];

async function createSession() {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName: 'Priya Sharma' })
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
  console.log('E2E TEST: Priya Sharma Persona');
  console.log('Profile: Burnout Prevention Coach - EXECUTION Constraint');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Create session
    console.log('Creating session for Priya Sharma...');
    const session = await createSession();
    console.log(`✓ Session created: ${session.id}`);
    console.log('');

    const transcript = [];
    let allValidationsPassed = true;
    let validationSummary = { passed: 0, failed: 0 };

    // Run through conversation
    for (const turn of PRIYA_CONVERSATION) {
      console.log('-'.repeat(80));
      console.log(`TURN ${turn.turn}`);
      console.log('-'.repeat(80));
      console.log('');
      console.log(`USER (Priya):`);
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

          if (validation.pass) {
            validationSummary.passed++;
          } else {
            validationSummary.failed++;
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

    // Validation summary
    console.log('='.repeat(80));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`  Total: ${validationSummary.passed + validationSummary.failed}`);
    console.log(`  Passed: ${validationSummary.passed}`);
    console.log(`  Failed: ${validationSummary.failed}`);
    console.log('');

    // Overall result
    console.log('='.repeat(80));
    console.log(allValidationsPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
    console.log('='.repeat(80));

    return {
      success: allValidationsPassed,
      sessionId: session.id,
      transcript,
      validationSummary
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
