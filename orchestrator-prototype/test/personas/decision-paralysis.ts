// Test Persona: Morgan - The Decision Paralysis Case
//
// Profile:
// - Career transition coach, pivoting from corporate to entrepreneurs
// - STUCK between two offers: 1-on-1 intensive vs. group program
// - Has analyzed both to death, can't commit
// - Waiting for perfect information that doesn't exist
// - TRUE CONSTRAINT: Strategy (unclear on differentiation, trying to hedge)
// - EXPECTED ROUTING: EC (high clarity after decision, medium capacity)
//
// This persona tests:
// - Decision hygiene (our current system doesn't handle option comparison)
// - Waiting for certainty that won't come
// - Analysis paralysis masquerading as thoroughness

export interface PersonaResponse {
  turn: number
  expectedQuestion: string
  userResponse: string
  notes: string
}

export const MORGAN_PERSONA: PersonaResponse[] = [
  {
    turn: 1,
    expectedQuestion: 'Tell me about your coaching or consulting business—what do you do and who do you serve?',
    userResponse: `I'm a career transition coach. I used to work with corporate clients but now I'm pivoting to help entrepreneurs who are burned out and want to simplify their businesses.`,
    notes: 'Clear positioning stated - but watch for lack of commitment'
  },

  {
    turn: 2,
    expectedQuestion: 'What brought you here? / What\'s the challenge?',
    userResponse: `I'm trying to decide between two different offers and I'm completely stuck. I've been analyzing this for three months and I can't figure out which one is right.`,
    notes: 'DECISION PARALYSIS explicitly stated - needs decision hygiene'
  },

  {
    turn: 3,
    expectedQuestion: 'Tell me about the two offers',
    userResponse: `Option A is a 1-on-1 intensive—12 weeks, high-touch, premium pricing. Option B is a group program—cohort-based, 8 weeks, more affordable, more scalable. I've made spreadsheets comparing them, pros and cons lists, revenue projections. On paper, both could work.`,
    notes: 'Classic analysis paralysis - "both could work" = not a data problem'
  },

  {
    turn: 4,
    expectedQuestion: 'What would have to be true for A to be the right move? / What\'s making this hard?',
    userResponse: `Well, Option A would work if I can consistently fill my calendar with premium clients. Option B would work if I can build a strong community and get people results in a group setting. But I don't know which one I'm better at, and I don't know which one the market wants more. I feel like if I just had more data, I'd know.`,
    notes: 'Waiting for certainty - "if I just had more data" is avoidance signal'
  },

  {
    turn: 5,
    expectedQuestion: 'Is it plausible you\'ll have better information soon? / What would that data be?',
    userResponse: `I guess... not really? I mean, I could survey my audience, but they'll probably just tell me what I want to hear. Or I could test both, but that feels scattered. I just wish I could KNOW which one is the right strategic move before I commit.`,
    notes: 'Recognizes no data coming - but still avoiding decision. Hypothesis: strategy constraint (hedging = unclear differentiation)'
  },

  {
    turn: 6,
    expectedQuestion: 'What would happen if you picked one and it didn\'t work?',
    userResponse: `I'd feel like I wasted time and money. And I'd worry that I picked wrong because I didn't think it through enough. Like, what if I choose the 1-on-1 model and then realize I should have built the group program instead?`,
    notes: 'Risk perception is overblown - "wasted time" is not existential. Low-stakes decision treated as high-stakes.'
  },

  {
    turn: 7,
    expectedQuestion: 'Is this a high-consequence, hard-to-reverse decision—or something you can test?',
    userResponse: `When you put it that way... it's testable. I could run a pilot of one and see what happens. I guess I've been treating this like a fork in the road, but it's more like... I can just try one and adjust.`,
    notes: 'BREAKTHROUGH - reframes decision as test, not commitment. Clarity emerging.'
  },

  {
    turn: 8,
    expectedQuestion: 'If both options could succeed—what would you prefer to build?',
    userResponse: `Honestly? The 1-on-1 intensive. I love deep work with individuals. The group program feels like what I SHOULD do because it's more scalable, but the intensive is what actually excites me.`,
    notes: '"Should" vs. want revealed - strategy constraint confirmed: trying to build what\'s "smart" instead of differentiated'
  },

  {
    turn: 9,
    expectedQuestion: 'Validation or diagnosis',
    userResponse: `Yeah. I've been so focused on what would be most profitable or scalable that I forgot to ask what I actually want to be known for. The intensive is my thing. That's the constraint—I wasn't clear on my positioning, so I was hedging.`,
    notes: 'Strong ownership language - hypothesis validated'
  }
]

export const EXPECTED_DIAGNOSIS = {
  constraint: 'strategy',
  summary: 'Unclear differentiation and positioning - trying to hedge between what "should" work vs. what they actually want to build',
  readiness: {
    clarity: 'high',
    confidence: 'high',
    capacity: 'medium'
  },
  recommended_endpoint: 'EC'
}

export const MORGAN_NAME = 'Morgan'
