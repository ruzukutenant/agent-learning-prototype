# How CoachMira Uses LLMs to Run the Conversation

Hey Danny - here's how the system actually works under the hood. This should help you give more specific feedback on the prompting and routing.

---

## Overview: Multiple LLM Calls Per Turn

Each time the user sends a message, we make **3-4 LLM calls** (some in parallel):

```
User Message Arrives
        ↓
┌───────────────────────────────────────┐
│  PARALLEL LLM CALLS (for speed)       │
│                                       │
│  1. Signal Detection (Gemini Flash)   │
│     - Emotional state, clarity level  │
│     - Overwhelm, breakthroughs        │
│                                       │
│  2. State Inference (Gemini Flash)    │
│     - Constraint hypothesis           │
│     - Diagnosis readiness             │
│     - Validation status               │
└───────────────────────────────────────┘
        ↓
   Decision Engine (JavaScript logic)
   - Decides: explore? validate? diagnose? contain?
   - Selects which prompt overlays to use
        ↓
   Build Dynamic System Prompt
   - Base identity + selected overlays + current context
        ↓
   3. Conversation Response (Claude Sonnet)
   - Generates the actual advisor reply
        ↓
   (Optional) 4. Memory Update (Gemini Flash)
   - Tracks topics covered to prevent loops
```

---

## The Dynamic Prompt System

The prompt Claude sees is **dynamically assembled** based on what the decision engine decides. It looks like:

```
[BASE IDENTITY]
+
[OVERLAY 1: Phase-specific guidance]
+
[OVERLAY 2: Action-specific guidance (if triggered)]
+
[CURRENT CONTEXT: What we've learned so far]
+
[DECISION GUIDANCE: What to do this turn]
```

---

## Example: What Claude Actually Sees

**Scenario:** User is in exploration phase, has been talking about feeling scattered, and a "strategy" constraint hypothesis is forming with medium confidence.

The system prompt Claude receives would be:

```
═══════════════════════════════════════════════════════════
SECTION 1: BASE IDENTITY (always included)
═══════════════════════════════════════════════════════════

You are CoachMira, an expert business advisor helping coaches and
consultants identify what's really holding their business back.

Your role is to have a natural conversation that helps them discover
their core constraint - not to lecture or diagnose prematurely.

[... tone guidance, communication style, etc ...]

───────────────────────────────────────────────────────────
SECTION 2: EXPLORATION OVERLAY (based on current phase)
───────────────────────────────────────────────────────────

## EXPLORATION MODE

Continue natural, curious exploration. Build understanding AND
momentum toward clarity.

**Your approach:**
1. Follow their lead and energy
2. Reflect and deepen - use the reflect → insight → question structure
3. Notice patterns and occasionally hint they're solvable
4. Build rapport

**Handling Brief Responses:**
If user gives a short response:
- Don't assume that's all the context you need
- Gently invite them to say more: "Tell me more about that..."

**Insightful questions for exploration:**
- "Tell me more about that - what does that look like for you?"
- "How long has this been going on?"
- "What have you already tried?"

**Plant seeds that solutions exist:**
- "I'm starting to see a pattern here, and this is actually really common..."
- "That makes sense - and the good news is this kind of thing is solvable..."

───────────────────────────────────────────────────────────
SECTION 3: CURRENT CONTEXT (state-specific)
───────────────────────────────────────────────────────────

## Current Context & What You've Learned

Phase: EXPLORATION
Turn: 6 (4 in current phase)

**What you've learned so far:**
- Pattern emerging: Stuck on direction/clarity about who they serve
- Not yet validated with them
- They seem unclear on their situation, uncertain or doubting themselves

Build on this understanding - reference what you've learned, connect
dots, show you remember.

**Topics already covered (don't repeat):**
- Business model and client work
- Current marketing approaches
- Feelings of being scattered

───────────────────────────────────────────────────────────
SECTION 4: DECISION GUIDANCE (what to do THIS turn)
───────────────────────────────────────────────────────────

## Orchestrator Decision

Action: DEEPEN
Reasoning: Strategy hypothesis forming at medium confidence. Need
more specificity about their offer clarity before validating.

Guidance: Ask for more specificity or examples.
Focus area: offer_clarity
```

---

## How the Prompt Changes Based on Decision

The decision engine picks different overlays and guidance based on what's happening:

| Decision | Overlays Added | Guidance |
|----------|---------------|----------|
| `explore` | exploration | "Continue natural exploration, follow their lead" |
| `deepen` | depth_inquiry | "Ask for concrete examples, one question at a time" |
| `validate` | validation | "Name the pattern, check if it resonates, don't force it" |
| `contain` | containment | "Slow down, acknowledge feelings, simplify focus to ONE thing" |
| `reflect_insight` | reflect_insight | "Mirror back their breakthrough, use their exact words" |
| `surface_contradiction` | surface_contradiction | "Gently name the tension you're seeing" |
| `request_diagnosis_consent` | diagnosis_consent | "Ask permission before sharing diagnosis" |
| `diagnose` | diagnosis_delivery | "Name constraint in human terms, ask if it resonates" |
| `complete_with_handoff` | closing_handoff | "Acknowledge journey, warm transition to next step" |

---

## The Conversation Phases

The conversation moves through these phases:

```
CONTEXT → EXPLORATION → DIAGNOSIS → COMPLETE
```

**1. CONTEXT (2-4 turns)**
- Who they are, what they do, who they serve
- Business model, scale, how they get clients
- What's working, what brought them here

**2. EXPLORATION (4-8 turns)**
- Dig into the problems they're experiencing
- Follow emotional energy, notice patterns
- Form a hypothesis about their core constraint (strategy/execution/energy)

**3. DIAGNOSIS (2-4 turns)**
- Ask permission to share what we're seeing
- Deliver the diagnosis, ask if it resonates
- Check for blockers before handoff

**4. COMPLETE**
- Warm closing acknowledging their work
- Transition to summary page with booking CTA

---

## What the AI Actually Says at Key Moments

**Asking Permission to Diagnose:**
> "Okay, I think I'm seeing a clear pattern from everything you've shared - how you're spending your time, what's keeping you up at night, and what's been hard to figure out. Would you like me to share what I think is really going on?"

**Delivering the Diagnosis (example - strategy constraint):**
> "Based on everything you've shared, here's what I'm seeing: You're not stuck because you don't know HOW to build your business - you clearly have the skills. You're stuck because you're not clear on WHO you're really serving and what makes you different. That uncertainty is what's driving the overthinking, the research loops, and the feeling of being pulled in too many directions. Does that resonate?"

**Checking Blockers:**
> "Good - I'm glad that resonates. One more question before we wrap up: What would prevent you from actually working on this right now? Any blockers I should know about?"

**The Closing Handoff (current version):**
> "You've done real work here - you went from 'I need better marketing' to seeing that the real issue is you're doing everything yourself and there's no system keeping the pipeline moving. That's a significant shift.
>
> So here's what we've landed on: You need lightweight systems that keep visibility happening without depending on you remembering to do it. The next step is to book a call with someone who specializes in exactly this - they'll help you map out the simplest path forward.
>
> I'll show you a summary of everything we discussed and your personalized next step."

---

## The Key Prompts That Affect "Selling" (Point 3)

These are the overlays that determine how we frame the recommendation:

**1. VALIDATION OVERLAY** (when we first name the pattern):
```
"I'm noticing something across what you've been sharing. [Pattern].
Does that land for you? Or am I off track?"
```
→ Currently conversational but doesn't paint stakes or vision

**2. DIAGNOSIS DELIVERY OVERLAY** (when we share the diagnosis):
```
"Based on everything you've shared, here's what I'm seeing: [Diagnosis].
Does that resonate?"
```
→ Clear but doesn't create urgency or paint what's possible

**3. CLOSING HANDOFF OVERLAY** (the final transition):
```
"You've done real work here. [Summary of shift].
The next step is to book a call with someone who specializes in this.
I'll show you a summary of everything we discussed."
```
→ Warm but doesn't strongly "sell" why THIS call matters

---

## How Routing Currently Works (Point 4)

Routing is **not in the LLM prompts** - it's hardcoded in the frontend:

```javascript
// Summary.tsx - line 131
const isMIST = constraintType === 'execution'
const bookingLink = isMIST
  ? MIST_BOOKING_LINK
  : EC_BOOKING_LINK
```

**Current routing rule:**
| Constraint Identified | Where They Go |
|-----------------------|---------------|
| **Execution** (doing everything themselves, no systems) | → MIST booking link |
| **Strategy** (unclear positioning, audience, offer) | → EC booking link |
| **Energy** (burnout, disconnection) | → EC booking link |

**What we collect but don't use for routing:**
- `commitment_level`: 'low' | 'medium' | 'high'
- `identified_blockers`: string[] (e.g., "time", "money", "uncertainty")
- `readiness.clarity/confidence/capacity`: 'low' | 'medium' | 'high'

---

## Where Feedback Would Apply

### Point 3 - "Better sell the recommendations"

Options:
1. **Enhance the validation overlay** - Add stakes ("as long as this stays unclear, everything downstream stays stuck")
2. **Enhance the diagnosis overlay** - Add vision ("imagine six months from now...")
3. **Enhance the closing overlay** - Add social proof ("coaches like you typically get unstuck in one session")
4. **Add a "pre-close" step** - Before handoff, explicitly frame what the call will accomplish

### Point 4 - "Smarter branching logic"

Options:
1. **Use commitment level for routing** - Low → nurture, Medium → discovery call, High → full booking
2. **Use blockers for messaging** - If "money" blocker, mention payment options; if "time", emphasize it's 30 min
3. **Create nurture path** - Some users shouldn't get booking CTA at all
4. **Sub-constraint routing** - Different messaging for offer_clarity vs audience_targeting

---

## Questions for Danny

- Should I draft revised prompt language for the "sell" moments?
- Should I spec out what smarter routing logic would look like?
- What specific changes would you like to see in the closing flow?
