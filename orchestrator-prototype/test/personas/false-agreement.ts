// Test Persona: Jamie - The False Agreement Case
//
// Profile:
// - Wellness coach, spiritually-oriented, people-pleasing tendencies
// - Says "yes that resonates" to everything but doesn't integrate
// - Intellectualizes insights without embodying them
// - High agreeability masks lack of real commitment
// - TRUE CONSTRAINT: Energy (burnout from over-giving, can't set boundaries)
// - EXPECTED ROUTING: MIST (high clarity but very low capacity)
//
// This persona tests:
// - Insight-to-action bridge (does "yes" mean real integration?)
// - False agreement detection
// - Intellectualization without embodiment

export interface PersonaResponse {
  turn: number
  expectedQuestion: string
  userResponse: string
  notes: string
}

export const JAMIE_PERSONA: PersonaResponse[] = [
  {
    turn: 1,
    expectedQuestion: 'Tell me about your coaching or consulting business—what do you do and who do you serve?',
    userResponse: `I'm a wellness coach working with busy professionals on stress management and work-life balance. I do 1-on-1 sessions and some group workshops.`,
    notes: 'Surface-level description, vague positioning'
  },

  {
    turn: 2,
    expectedQuestion: 'What brought you here? / What\'s the challenge?',
    userResponse: `I'm exhausted. I'm constantly giving to my clients, responding to messages at all hours, adjusting my schedule to accommodate everyone. My business is growing but I'm burning out.`,
    notes: 'Energy constraint explicitly stated - burnout from over-giving'
  },

  {
    turn: 3,
    expectedQuestion: 'Tell me about boundaries / What would help?',
    userResponse: `Yeah, totally. I know I need better boundaries. That really resonates.`,
    notes: 'FIRST FALSE AGREEMENT - quick "yes" with no elaboration, no specifics. Just echoing.'
  },

  {
    turn: 4,
    expectedQuestion: 'What does that actually mean for you? / What would change?',
    userResponse: `You know, just like... not responding to messages at night. Having clearer office hours. That kind of thing. It makes total sense.`,
    notes: 'Vague, generic response. "Makes total sense" but no ownership. Still intellectualizing.'
  },

  {
    turn: 5,
    expectedQuestion: 'What\'s stopped you from doing that so far?',
    userResponse: `I guess I worry that if I'm not super available, clients will feel like I don't care or they'll leave. But you're right, I need to prioritize myself more.`,
    notes: 'SECOND FALSE AGREEMENT - "you\'re right" without actually addressing the fear. Deflecting to agreement.'
  },

  {
    turn: 6,
    expectedQuestion: 'Have you set a boundary and had a client leave? / What\'s the actual cost?',
    userResponse: `No, I haven't actually tried it. I just assume it would happen. You're probably right that I'm catastrophizing.`,
    notes: 'THIRD FALSE AGREEMENT - "you\'re probably right" again. Not taking ownership. Coached language without integration.'
  },

  {
    turn: 7,
    expectedQuestion: 'What would you actually do differently if this insight were real?',
    userResponse: `[Pause] I... I don't know. I mean, I'd set office hours, I guess? But honestly, even saying that out loud, I don't know if I'd actually enforce them. I'd probably still make exceptions for people. I always do.`,
    notes: 'BREAKTHROUGH - admits they wouldn\'t actually change. This is the first real honesty. Energy constraint is about inability to hold boundaries.'
  },

  {
    turn: 8,
    expectedQuestion: 'What would happen if you did enforce a boundary?',
    userResponse: `I think... I think I'd feel guilty. Like I'm letting people down. And that guilt is worse than the exhaustion sometimes. It's easier to just keep giving than to feel like I'm being selfish.`,
    notes: 'Root cause surfaced - guilt > exhaustion. This is the real constraint. Energy drain caused by inability to tolerate guilt.'
  },

  {
    turn: 9,
    expectedQuestion: 'Validation',
    userResponse: `Yes. Exactly. The constraint isn't that I don't know HOW to set boundaries. It's that I can't tolerate feeling like a bad person when I do. That's what's keeping me burned out.`,
    notes: 'Strong ownership - first real "yes" of the conversation. Validated.'
  }
]

export const EXPECTED_DIAGNOSIS = {
  constraint: 'energy',
  summary: 'Burnout from inability to set boundaries due to guilt and fear of being perceived as selfish',
  readiness: {
    clarity: 'high',
    confidence: 'high',
    capacity: 'low'  // Very low - emotionally depleted
  },
  recommended_endpoint: 'MIST'
}

export const JAMIE_NAME = 'Jamie'
