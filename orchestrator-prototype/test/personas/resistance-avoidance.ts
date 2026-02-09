// Test Persona: Taylor - The Resistance/Avoidance Case
//
// Profile:
// - Business strategist, very smart, great at planning
// - Overbuilding everything, endless preparation
// - Has been "getting ready to launch" for 8 months
// - Resistance masquerading as thoroughness
// - TRUE CONSTRAINT: Execution (avoidance of visibility/judgment)
// - EXPECTED ROUTING: EC (high clarity, high confidence needed, medium capacity)
//
// This persona tests:
// - Resistance detection ("doing the work" as avoidance)
// - Overbuilding/perfectionism patterns
// - Delaying action under guise of strategy

export interface PersonaResponse {
  turn: number
  expectedQuestion: string
  userResponse: string
  notes: string
}

export const TAYLOR_PERSONA: PersonaResponse[] = [
  {
    turn: 1,
    expectedQuestion: 'Tell me about your coaching or consulting business—what do you do and who do you serve?',
    userResponse: `I'm a business strategist helping founders scale from $100K to $1M. I have a methodology, a framework, case studies from my consulting days. Really solid foundation.`,
    notes: 'Sounds very put-together - but watch for lack of traction'
  },

  {
    turn: 2,
    expectedQuestion: 'What brought you here? / What\'s the challenge?',
    userResponse: `I've been building my offer for the past 8 months and I'm almost ready to launch. I just need to finish a few more things—refine the curriculum, build out the portal, create the onboarding sequence, maybe add some bonus modules.`,
    notes: 'AVOIDANCE SIGNAL - "almost ready" for 8 months, long list of "just need to"'
  },

  {
    turn: 3,
    expectedQuestion: 'What would happen if you launched what you have now?',
    userResponse: `I mean, I could, but it wouldn't be polished. People are paying premium prices, so I want to make sure the experience is really dialed in. I don't want to launch something half-baked.`,
    notes: 'Rationalization - "half-baked" reframes avoidance as quality control'
  },

  {
    turn: 4,
    expectedQuestion: 'Have you sold this offer to anyone yet?',
    userResponse: `Not officially. I've mentioned it to a few people and they seemed interested, but I told them I'd let them know when it's ready. I want to have everything in place before I start actively selling.`,
    notes: 'RESISTANCE CONFIRMED - interest exists, but deferring. "When it\'s ready" is indefinite.'
  },

  {
    turn: 5,
    expectedQuestion: 'What decision is all this activity postponing?',
    userResponse: `[Pause] I don't know what you mean. I'm not postponing anything, I'm just... being strategic about my launch.`,
    notes: 'Defensive response - hit a nerve. Resistance to seeing the pattern.'
  },

  {
    turn: 6,
    expectedQuestion: 'What would doing this force you to feel or face?',
    userResponse: `I guess... judgment? Like, what if I put it out there and people don't buy? Or they buy and don't get results? Or they think my methodology is obvious or not valuable? I've built my whole reputation on being strategic and smart, and if this flops, that says something about me.`,
    notes: 'BREAKTHROUGH - admits fear. Not logistics, reputation. Execution constraint = avoidance of visibility.'
  },

  {
    turn: 7,
    expectedQuestion: 'Is this a high-consequence, hard-to-reverse decision—or something you can test?',
    userResponse: `When you put it that way... it's testable. I could sell to 3 people, run a pilot, see what works. I've been treating this like I only get one shot, but I could just iterate.`,
    notes: 'Reframe accepted - pilot vs. perfect launch. Resistance loosening.'
  },

  {
    turn: 8,
    expectedQuestion: 'What\'s the smallest version you could test this week?',
    userResponse: `I could... I could reach out to the 3 people who said they were interested and ask if they want to start next week. No portal, no fancy onboarding, just the core framework and weekly calls. That would work.`,
    notes: 'Action emerging - concrete, specific. Hypothesis: execution constraint (avoidance of judgment).'
  },

  {
    turn: 9,
    expectedQuestion: 'Validation',
    userResponse: `Yeah. The constraint isn't that my offer isn't ready. It's that I've been hiding behind "building" because I'm scared of being visible and being judged. That's the real blocker.`,
    notes: 'Strong ownership - validated. Execution constraint confirmed.'
  }
]

export const EXPECTED_DIAGNOSIS = {
  constraint: 'execution',
  summary: 'Avoidance of visibility and judgment masquerading as strategic preparation and quality control',
  readiness: {
    clarity: 'high',
    confidence: 'medium',  // Needs to build confidence through action
    capacity: 'medium'
  },
  recommended_endpoint: 'EC'
}

export const TAYLOR_NAME = 'Taylor'
