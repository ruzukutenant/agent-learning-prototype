# Implementation Plan: Closing Sequence v2

## Danny's Feedback Summary

The current close is too abrupt - it combines "do you need help?" and "do you want our specific offering?" into one turn. Danny wants these separated with explicit agreement gates:

1. **Turn D (Agreement in Principle)**: "I think you need to talk to someone who specializes in this. Does that land? Would you want to explore getting that sort of help?"
2. **Turn D2 (Agreement to Our Offering)**: "We have specialists on staff. I can arrange a free exploratory call - no cost, no catch. Would you want me to arrange that?"
3. **Turn E (Facilitation)**: Only after both agreements → show booking link

---

## Phase 1: Add Closing-Specific Analysis

### 1.1 Create Closing Analysis Types

**File:** `server/src/orchestrator/core/types.ts`

```typescript
// Add to types
type ClosingAskType = 'agreement_in_principle' | 'agreement_to_offering'

type ClosingResponseType =
  | 'clear_agreement'
  | 'tentative_agreement'
  | 'hesitation'
  | 'objection'
  | 'off_topic'

type ObjectionType =
  | 'doesnt_need_help'      // "I can figure this out myself"
  | 'prefers_self_solve'    // "I'd rather find someone on my own"
  | 'not_our_offering'      // "I'm not sure about your service"
  | 'timing'                // "Not right now"
  | 'needs_more_info'       // "What would that involve?"

interface ClosingAnalysisResult {
  checking_for: ClosingAskType
  response_type: ClosingResponseType
  objection_type?: ObjectionType
  confidence: number
  reasoning: string
}
```

### 1.2 Create Closing Analysis Function

**File:** `server/src/orchestrator/core/closing-analysis.ts` (NEW)

Purpose: Analyze user response specifically in the context of what closing question we just asked.

```typescript
export async function analyzeClosingResponse(
  userMessage: string,
  askType: ClosingAskType,
  conversationContext: string // Recent turns for context
): Promise<ClosingAnalysisResult>
```

**Prompt structure:**
```
You are analyzing a user's response during a coaching conversation's closing sequence.

We just asked the user: [QUESTION BASED ON ASK TYPE]
- If agreement_in_principle: "Would you want to explore getting that sort of help?"
- If agreement_to_offering: "Would you want me to arrange that for you?"

User's response: [USER MESSAGE]

Classify their response:
1. clear_agreement - They clearly said yes or expressed enthusiasm
2. tentative_agreement - They agreed but with some reservation
3. hesitation - They're uncertain, asking questions, or hedging
4. objection - They pushed back or declined
5. off_topic - Response doesn't address the question

If objection, classify the type:
- doesnt_need_help: They don't think they need external help
- prefers_self_solve: They want help but not from us specifically
- not_our_offering: Concerns about our specific service
- timing: Not the right time
- needs_more_info: They want more details before deciding
```

### 1.3 Integrate into Orchestrator

**File:** `server/src/orchestrator/conversation/orchestrator.ts`

During closing phases (assert_and_align, offer_solution), run closing analysis in addition to unified analysis:

```typescript
// In processConversationTurn, when in closing sequence:
if (state.closing_sequence.phase === 'assert_and_align') {
  const closingResult = await analyzeClosingResponse(
    userMessage,
    'agreement_in_principle',
    recentContext
  )
  // Use closingResult to inform decision
}

if (state.closing_sequence.phase === 'offer_solution') {
  const closingResult = await analyzeClosingResponse(
    userMessage,
    'agreement_to_offering',
    recentContext
  )
  // Use closingResult to inform decision
}
```

---

## Phase 2: Update Closing Sequence Phases

### 2.1 Add New Phase

**File:** `server/src/orchestrator/core/types.ts`

```typescript
type ClosingPhase =
  | 'not_started'
  | 'reflect_implication'    // Turn A
  | 'reflect_stakes'         // Turn B
  | 'name_capability_gap'    // Turn C
  | 'assert_and_align'       // Turn D - agreement in principle ONLY
  | 'offer_solution'         // Turn D2 - NEW: offer our specific solution
  | 'facilitate'             // Turn E - show booking link

interface ClosingSequenceState {
  phase: ClosingPhase
  facilitation_offered: boolean
  closing_arc_complete: boolean
  // NEW: Track agreement at each gate
  agreed_needs_help?: boolean      // Set after Turn D agreement
  agreed_to_offering?: boolean     // Set after Turn D2 agreement
}
```

---

## Phase 3: Update Overlays

### 3.1 Modify Turn D Overlay (Agreement in Principle)

**File:** `server/src/orchestrator/core/prompt-builder.ts`

Rename/update `closing_assert_and_align`:

```typescript
overlays.set('closing_assert_and_align', `## CLOSING TURN D: GET AGREEMENT IN PRINCIPLE

**Your goal:** Get agreement that they need external help from someone who specializes in this.
DO NOT mention our specific offering yet.

**CRITICAL - DO NOT INCLUDE:**
- Any mention of "our staff" or "our team" or "we have people"
- "Free session" or "complimentary call" or booking
- Any CTA or link language
- [Click below] or similar

**WHAT TO DO:**
1. Based on the constraint identified, name the TYPE of help they need
2. Explain that there are people/specialists whose expertise is exactly this
3. Ask if getting that kind of help would land for them
4. End with a clear question checking alignment

**Danny-inspired example (adapt to their constraint):**

"Based on everything we've uncovered, I think what you really need is to talk to someone
who specializes in [these strategic decisions / these internal blocks / building systems
that scale]. There are people whose whole focus is helping with exactly this kind of
[positioning clarity / mindset work / operational scaling].

Does that land for you? Would you want to explore getting that sort of help?"

**Response MUST:**
- End with a question
- NOT mention our specific offering
- NOT include booking/CTA language
`)
```

### 3.2 Add Turn D2 Overlay (Offer Our Solution)

**File:** `server/src/orchestrator/core/prompt-builder.ts`

```typescript
overlays.set('closing_offer_solution', `## CLOSING TURN D2: OFFER OUR SPECIFIC SOLUTION

**Context:** They just agreed they need external help. Now offer our specific solution.

**Your goal:** Offer our free exploratory call with a specialist on staff.

**STRUCTURE:**
1. Brief acknowledgment that they can find help elsewhere
2. Mention we have specialists on staff who focus on exactly this
3. Offer to arrange a free exploratory call
4. Include FREE framing: "no cost, no catch", "free exploratory call"
5. Ask for agreement before showing booking link

**CRITICAL - DO NOT INCLUDE:**
- [Click below] or booking links yet
- Assuming they'll say yes
- Pressure or urgency

**Danny-inspired example:**

"Of course, you can search for professionals who do this kind of work. But we actually
have some specialists on staff who focus exactly on [this kind of strategic clarity /
these internal blocks / operational scaling].

I can arrange a free exploratory call for you - no cost, no catch, just an opportunity
to see if they can help you chart a path forward.

Would you want me to arrange that for you?"

**Response MUST:**
- Include FREE framing (no cost, no catch, free, complimentary)
- End with a question asking for agreement
- NOT include booking link or [Click below] yet
`)
```

### 3.3 Update Turn E Overlay (Facilitation)

**File:** `server/src/orchestrator/core/prompt-builder.ts`

```typescript
overlays.set('closing_facilitate', `## CLOSING TURN E: FACILITATION

**Context:** They agreed to our offering. Now show the booking link.

**Your goal:** Brief acknowledgment + the system will show the booking component.

**KEEP IT SHORT - they've already agreed. Don't oversell.**

**Example:**

"Perfect. Here's your summary with everything we covered, plus the link to book that call.

Looking forward to seeing what you build once you've got that [direction/support/clarity]."

**Response should be 2-3 sentences max. The component does the rest.**
`)
```

---

## Phase 4: Update Decision Engine

### 4.1 New Phase Transition Logic

**File:** `server/src/orchestrator/core/decision-engine.ts`

```typescript
// In shouldEnterClosingSequence or closing sequence handling:

function getNextClosingAction(
  state: ConversationState,
  closingAnalysis: ClosingAnalysisResult
): DecisionResult {
  const phase = state.closing_sequence.phase

  // TURN D: Assert need for help
  if (phase === 'assert_and_align') {
    if (closingAnalysis.response_type === 'clear_agreement' ||
        closingAnalysis.response_type === 'tentative_agreement') {
      // They agreed they need help → progress to offering our solution
      return {
        action: 'closing_offer_solution',
        reasoning: 'User agreed in principle to needing help',
        // Update state: agreed_needs_help = true
      }
    } else if (closingAnalysis.response_type === 'hesitation') {
      // Explore the hesitation
      return {
        action: 'explore_hesitation',
        reasoning: `User hesitant: ${closingAnalysis.objection_type}`,
      }
    } else if (closingAnalysis.response_type === 'objection') {
      // Handle objection based on type
      return handleTurnDObjection(closingAnalysis.objection_type)
    }
  }

  // TURN D2: Offer our solution
  if (phase === 'offer_solution') {
    if (closingAnalysis.response_type === 'clear_agreement' ||
        closingAnalysis.response_type === 'tentative_agreement') {
      // They agreed to our offering → facilitate
      return {
        action: 'closing_facilitate',
        reasoning: 'User agreed to our offering',
        // Update state: agreed_to_offering = true, closing_arc_complete = true
      }
    } else if (closingAnalysis.response_type === 'hesitation') {
      // Answer questions or explore hesitation
      return {
        action: 'explore_hesitation',
        reasoning: `User needs more info: ${closingAnalysis.objection_type}`,
      }
    } else if (closingAnalysis.response_type === 'objection') {
      // Graceful close - don't push if they don't want our offering
      return handleTurnD2Objection(closingAnalysis.objection_type)
    }
  }

  // TURN E: Facilitate
  if (phase === 'facilitate' && state.closing_sequence.closing_arc_complete) {
    return {
      action: 'complete_with_handoff',
      reasoning: 'Closing sequence complete, user agreed to offering',
    }
  }
}
```

### 4.2 Objection Handling

```typescript
function handleTurnDObjection(objectionType: ObjectionType): DecisionResult {
  switch (objectionType) {
    case 'doesnt_need_help':
      // Re-explore the capability gap - they may not have fully accepted it
      return {
        action: 'closing_name_capability_gap', // Go back to Turn C
        reasoning: 'User objects to needing help - revisit capability gap',
      }
    case 'timing':
      // Acknowledge, don't push, close gracefully
      return {
        action: 'graceful_close',
        reasoning: 'User has timing concerns - close without pressure',
      }
    default:
      return {
        action: 'explore_hesitation',
        reasoning: `Explore objection: ${objectionType}`,
      }
  }
}

function handleTurnD2Objection(objectionType: ObjectionType): DecisionResult {
  switch (objectionType) {
    case 'prefers_self_solve':
    case 'not_our_offering':
      // They want help but not from us - that's fine, close gracefully
      return {
        action: 'graceful_close',
        reasoning: 'User prefers other options - close without pushing our offering',
      }
    case 'needs_more_info':
      // Answer their question, then re-offer
      return {
        action: 'answer_and_reoffer',
        reasoning: 'User needs more information about our offering',
      }
    default:
      return {
        action: 'graceful_close',
        reasoning: `User declined offering: ${objectionType}`,
      }
  }
}
```

### 4.3 Disable Fast Close Skipping D→D2→E

Currently fast close skips to Turn D. Update to ensure it never skips D → D2 → E:

```typescript
// In fast close logic:
if (strongAlignment && noHesitation) {
  // Can skip A, B, C if user is already clearly aligned with diagnosis
  // But NEVER skip D → D2 → E - these are the key agreement gates
  if (phase === 'not_started') {
    return { action: 'closing_assert_and_align' } // Start at D, not skip past it
  }
}
```

---

## Phase 5: Add Graceful Close Path

### 5.1 New Overlay for Graceful Close

For when user declines at Turn D2 - don't push, close warmly:

```typescript
overlays.set('graceful_close', `## GRACEFUL CLOSE

**Context:** User declined our specific offering but may still want help. Close warmly without pressure.

**Your goal:** Acknowledge their preference, leave door open, end positively.

**Example:**

"Totally understand. The clarity you've gained today about [the real block] is valuable
regardless of what comes next. If you ever want to explore working with someone on this,
you know where to find us.

Wishing you the best with [their specific goal]."

**Keep it warm, brief, no pressure.**
`)
```

---

## Implementation Order

1. **Phase 1**: Add closing analysis (types + function + integration)
2. **Phase 2**: Update closing phase types
3. **Phase 3**: Update/add overlays (D, D2, E, graceful close)
4. **Phase 4**: Update decision engine with new logic
5. **Phase 5**: Test with simulations

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/src/orchestrator/core/types.ts` | Add ClosingAnalysisResult, ObjectionType, update ClosingPhase, ClosingSequenceState |
| `server/src/orchestrator/core/closing-analysis.ts` | NEW FILE - closing-specific analysis |
| `server/src/orchestrator/core/prompt-builder.ts` | Update Turn D, add Turn D2, update Turn E, add graceful close |
| `server/src/orchestrator/core/decision-engine.ts` | New phase transitions, objection handling, disable fast close skip |
| `server/src/orchestrator/conversation/orchestrator.ts` | Integrate closing analysis during closing phases |

---

## Success Criteria

1. Turn D asks for agreement in principle WITHOUT mentioning our offering
2. Turn D2 only appears after clear agreement at Turn D
3. Booking link only appears after clear agreement at Turn D2
4. Hesitation at any gate triggers exploration, not progression
5. Objections are handled gracefully based on type
6. FREE consultation framing appears in Turn D2 (not Turn D)
