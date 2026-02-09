// Test Persona: Alex - The Systemic Overwhelm Case
//
// Profile:
// - Leadership coach for tech executives
// - 3 years in business, inconsistent revenue ($8-15K/month)
// - SURFACE SYMPTOM: "marketing problem" (misleading)
// - CONTRADICTION: Says marketing problem but converts 70% of calls
// - EXECUTION CHAOS: Scattered tactics, everything breaking
// - OVERWHELM MOMENT: Will hit emotional peak around turn 5-6
// - TRUE CONSTRAINT: STRATEGY - unclear positioning (can't articulate value before calls)
// - EXPECTED ROUTING: MIST (high clarity but low capacity)
//
// This persona tests:
// - Cross-mapping detection (execution scattered → unclear strategy)
// - Containment activation (overwhelm detected)
// - Hypothesis validation (user confirms constraint)
// - Readiness evolution (low → medium → high for clarity)
// - Correct endpoint recommendation

export interface PersonaResponse {
  turn: number
  expectedQuestion: string
  userResponse: string
  notes: string
}

export const ALEX_PERSONA: PersonaResponse[] = [
  {
    turn: 1,
    expectedQuestion: 'Tell me about your coaching or consulting business—what do you do and who do you serve?',
    userResponse: `I'm a leadership coach for tech executives. Been doing this for about 3 years now. Help them with things like communication, team building, conflict resolution... that kind of stuff.`,
    notes: 'Vague positioning - "that kind of stuff" signals unclear offer clarity'
  },

  {
    turn: 2,
    expectedQuestion: 'What brought you here? / What\'s the challenge?',
    userResponse: `Honestly? I think I have a marketing problem. My revenue is all over the place—some months $15K, some months $8K. I need more consistent lead flow.`,
    notes: 'Surface symptom (marketing) - but this is misleading. Real issue is positioning.'
  },

  {
    turn: 3,
    expectedQuestion: 'How do most of your clients find you right now? / Tell me about your current marketing',
    userResponse: `Mostly referrals and LinkedIn. I post pretty regularly, do some DMs. When I get on calls, I close like 70% of them. But I just don't get enough calls, you know?`,
    notes: 'CONTRADICTION - 70% close rate is excellent. Problem is NOT marketing. Orchestrator should detect this.'
  },

  {
    turn: 4,
    expectedQuestion: 'What have you tried to get more calls? / Walk me through your LinkedIn approach',
    userResponse: `Oh man, I've tried everything. Webinars, lead magnets, cold outreach, SEO blog posts, email sequences... I'll do something for a few weeks and then it doesn't seem to work so I try something else. Nothing really sticks.`,
    notes: 'EXECUTION CHAOS signals - "tried everything", "nothing sticks". Should trigger cross-mapping check: execution scattered → unclear strategy?'
  },

  {
    turn: 5,
    expectedQuestion: 'When you say "doesn\'t work" - what does that look like? / Tell me more about that',
    userResponse: `I just... I don't know. I get some interest but not the RIGHT people, or they ghost me after the first call, or they want a discount. I'm honestly exhausted from trying so many things. It feels like I'm spinning my wheels.`,
    notes: 'OVERWHELM emerging - "exhausted", "spinning wheels". Emotional charge increasing. Should trigger containment soon if continues.'
  },

  {
    turn: 6,
    expectedQuestion: 'I hear you. That\'s a lot. What feels like the biggest issue right now?',
    userResponse: `[Emotional] I think... I think the issue is I don't actually know how to EXPLAIN what I do in a way that makes people want to work with me. Like, I know I'm good at what I do—my clients get amazing results. But when someone asks "what do you do?", I kind of fumble. I say "leadership coaching" and their eyes glaze over.`,
    notes: 'BREAKTHROUGH MOMENT - User self-identifies positioning issue. "Don\'t know how to explain what I do" = offer clarity gap. This is STRATEGY, not marketing.'
  },

  {
    turn: 7,
    expectedQuestion: 'When someone asks what you do, how do you explain it?',
    userResponse: `I usually say something like "I help tech executives become better leaders." And then they say "oh cool" and the conversation dies. I don't have a crisp way to say what makes ME different or why someone should choose me over any other leadership coach.`,
    notes: 'CLEAR POSITIONING PROBLEM - can\'t articulate differentiation. Strategy constraint confirmed. Hypothesis should be high confidence now.'
  },

  {
    turn: 8,
    expectedQuestion: 'I\'m hearing that strategy might be the core issue here—specifically around positioning. Does that resonate?',
    userResponse: `Yes. Exactly. That's exactly it. I've been so focused on "how do I get more leads" but the real problem is I don't have a clear message that attracts the RIGHT people. Everything I'm doing is scattered because I don't have that foundation.`,
    notes: 'VALIDATION - strong ownership language ("exactly", "that\'s exactly it"). Hypothesis validated. Ready for diagnosis.'
  },

  {
    turn: 9,
    expectedQuestion: '[AUTO-DIAGNOSIS - orchestrator generates closing message]',
    userResponse: `[User doesn't respond - orchestrator completes and shows closing message]`,
    notes: 'Orchestrator should detect readiness (validated hypothesis, high clarity, high confidence) and auto-generate closing message about STRATEGY constraint.'
  }
]

export const EXPECTED_DIAGNOSIS = {
  constraint: 'strategy',
  summary: 'Unclear positioning and messaging - can\'t articulate what makes their approach different or why someone should choose them',
  readiness: {
    clarity: 'high',
    confidence: 'high',
    capacity: 'low'  // Due to overwhelm signals
  },
  recommended_endpoint: 'MIST'  // High clarity but low capacity
}

export const ALEX_NAME = 'Alex'
