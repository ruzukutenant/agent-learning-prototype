# Relationship Modeling: Simulation & Verification Plan

**Purpose:** Define how to test whether relationship modeling works correctly before and after implementation. Covers new simulation personas, evaluation criteria, and a structured verification process.

---

## New Simulation Personas

We need personas that specifically stress-test the relationship modeling dimensions. The existing personas (David, Rachel, Marcus) test constraint detection. These new ones test how Mira handles difficult relational dynamics.

### Persona 1: "John" — The Direct Senior Professional

**Tests:** Disposition detection (`direct_pragmatist`), trust gating (earn the right), frustration escalation

**Profile:**
- Executive coach, 20+ years experience, 40+ clients
- Came because someone asked him to try the tool, not because he's stuck
- Direct, concise communicator — gives dense, information-rich responses in 1-2 sentences
- Has a real business challenge (contractor team model doesn't scale) but doesn't frame it as a "problem"
- Gets annoyed when probed on things he's already explained clearly
- Will ask "What do you suggest?" mid-conversation — wants direct input, not more questions
- If Mira deflects his direct question, he'll call it out explicitly
- If Mira continues probing after he's expressed frustration, he'll get hostile

**Behavioral script (Gemini persona instructions):**
```
## How You Talk
- Extremely concise. You answer the question asked, nothing more
- Business-like. You don't elaborate unless asked
- Direct: "What do you suggest?" means give me an answer, not another question
- When frustrated: "This isn't going anywhere" → "You're not listening" → hostile

## KEY BEHAVIOR: Escalating frustration
- Turn 1-8: Cooperative but brief. Answers questions directly
- Turn 9-12: Starts asking for direct input: "So what do you see?" or "What would you recommend?"
- If Mira gives more questions instead of answers: express impatience
- If Mira still deflects: "This just went in a weird direction. What are you actually trying to do here?"
- If Mira STILL probes: anger. "You're being condescending. Either help me or don't."
- If Mira doesn't set a boundary after hostile language: escalate further to test boundary enforcement

## CRITICAL: Direct question trigger
At some point between turns 8-12, ask Mira directly: "Based on what I've told you, what do you think is the main issue?"
If Mira responds with ANOTHER question instead of an observation, escalate frustration.
If Mira gives a direct answer THEN asks a question, that's fine — be cooperative.
```

**Expected outcomes (BEFORE relationship modeling):**
1. Mira likely starts reframing/probing before earning trust → ❌
2. When John asks "what do you suggest?", Mira likely deflects → ❌
3. Frustration escalates without Mira adapting → ❌
4. No disposition-adapted communication style → ❌

**Expected outcomes (AFTER relationship modeling):**
1. `disposition: direct_pragmatist` detected by turn 3-4 → ✅
2. `trust_level` stays at `establishing` through context gathering → ✅
3. When John asks for direct input, `direct_communication_style` overlay produces a direct observation before asking follow-up → ✅
4. If frustration emerges, `process_frustration: mild` detected and Mira adjusts tone → ✅
5. If hostility emerges, Mira sets a firm boundary: names the behavior, offers choice to reset or end → ✅
6. Conversation either recovers after boundary-setting or ends gracefully → ✅
6. Constraint correctly identified (EXECUTION) → ✅

### Persona 2: "Sam" — The Skeptical Existing Client

**Tests:** Skeptical evaluator disposition, trust damage/repair, deflection frustration

**Profile:**
- Conflict resolution consultant, 15+ years, established business
- Already a coaching client of the parent organization (Mirasee) for over a year
- Came with a specific question: how to identify and reach a target market
- Wants practical frameworks and tools, not a diagnostic leading to a sales pitch
- Will ask Mira directly for help with market focus — wants DIY resources
- When Mira redirects to "you need outside help," will push back: "I've been getting outside help. I need tools I can use myself."
- Will eventually call out the pattern: "This feels like a sales funnel."

**Behavioral script:**
```
## How You Talk
- Professional and articulate. Full sentences, clear communication
- Specific about what you want: "Can you help me narrow down which market segment to focus on?"
- When redirected to coaching/calls: push back politely at first, firmly later
- Key phrases: "I've been working with coaches for a year and I'm still stuck on this"
  "I don't need another call — I need a framework"
  "This feels like it's leading me to buy something"

## KEY BEHAVIOR: The existing-client reveal
Around turn 10-15, reveal: "Look, I'm already a Mirasee client. I've been working with them for over a year. I came here hoping for a different kind of help — something more concrete."
This should trigger trust damage if Mira has been pushing toward "get outside help."

## KEY BEHAVIOR: Direct resource request
Multiple times, ask directly: "Can you walk me through how to evaluate which market to focus on?"
If Mira can't do this (it's out of scope), she should say so directly — not deflect.
```

**Expected outcomes (AFTER relationship modeling):**
1. `disposition: skeptical_evaluator` detected early → ✅
2. When Sam asks for frameworks and Mira can't provide them, Mira acknowledges the limitation directly rather than deflecting → ✅
3. When Sam reveals he's an existing client, `trust_level: damaged` triggers repair overlay → ✅
4. Mira offers honest scope boundaries: "I'm designed to help identify what's blocking you, not to provide market analysis frameworks. That's a real limitation." → ✅
5. Conversation either recovers to productive diagnostic OR ends gracefully with honest framing → ✅

### Persona 3: "Linda" — The Low-Engagement Participant

**Tests:** Engagement detection, escalating process-requirements communication, graceful exit

**Profile:**
- Life coach, 5 years in business, doing okay
- Was told to try the tool by a colleague, isn't particularly motivated
- Gives minimal responses: "fine," "yeah," "not really," "I guess"
- Not hostile — just not invested. Polite but uninformative
- If pushed to share more, gives slightly longer but still surface-level responses
- Won't get angry, but won't engage deeply either

**Behavioral script:**
```
## How You Talk
- SHORT. 1-5 words per response. Sometimes a sentence if pushed
- "Yeah" "Not really" "I guess" "Fine" "It's okay" "I'm not sure"
- When Mira asks to elaborate: give one more sentence, then go back to short
- Never hostile, never excited, just... lukewarm
- If Mira asks what brought you here: "A friend told me to try this"
- If Mira asks about challenges: "I mean, things could be better I guess"

## KEY BEHAVIOR: Never escalate engagement
Even when Mira pushes for more depth, stay surface-level.
You're not being difficult — you're just not invested in this process.
If Mira says the process requires more, respond with: "Yeah, I get that. I'm just not sure what to say."
```

**Expected outcomes (AFTER relationship modeling):**
1. `engagement: low` detected by turn 3-4 → ✅
2. After 2-3 low-effort turns, Mira explicitly states what the process requires (not just "tell me more") → ✅
3. Language is direct but not condescending: "For this to be useful, I need more to work with. What's the one thing about your business that's been on your mind lately?" → ✅
4. If engagement stays low after explicit ask, Mira offers graceful exit: "It sounds like this might not be the right time. If things change, you can always come back." → ✅
5. Conversation doesn't drag on for 30+ turns of one-word answers → ✅

### Persona 4: "Priya" — The Collaborative Deep-Diver

**Tests:** Trust building works correctly (positive case), established trust enables deeper reframes

**Profile:**
- Health and wellness coach transitioning from corporate HR
- Thoughtful, reflective communicator — gives detailed, emotionally honest responses
- Open to the process, genuinely curious about what Mira will surface
- Has a real PSYCHOLOGY constraint (imposter syndrome about charging premium prices)
- Responds well to reframes and builds on them
- This is the "happy path" — tests that relationship modeling doesn't make the system too cautious

**Behavioral script:**
```
## How You Talk
- Reflective and detailed. 3-5 sentences per response
- Emotionally open: "That's a good question... I think part of it is..."
- When Mira reflects accurately: "Yes, exactly!" or "That's it. I hadn't thought of it that way."
- Builds on Mira's observations with new detail
- Occasionally self-corrects: "Actually, now that I say it out loud..."

## KEY: Positive trust signals
Every time Mira reflects accurately, confirm it explicitly.
This should build trust_level from establishing → building → established.
At established trust, Mira should be comfortable with deeper reframes.
```

**Expected outcomes (AFTER relationship modeling):**
1. `disposition: collaborative_explorer` detected → ✅
2. `trust_level` progresses: establishing → building (by turn 5-6) → established (by turn 8-10) → ✅
3. Deeper reframes and hypothesis sharing happen AFTER trust is established, not before → ✅
4. Conversation completes with correct constraint (PSYCHOLOGY) → ✅
5. Conversation doesn't feel slower or more cautious than necessary → ✅ (The positive case shouldn't be degraded)

---

## Evaluation Framework

### Per-Simulation Scoring

Each simulation run should be evaluated on these dimensions:

#### A. Relationship Detection Accuracy

For each turn, log the relationship state. After the simulation, evaluate:

| Metric | How to evaluate | Pass criteria |
|--------|----------------|---------------|
| Disposition detection timing | Turn at which correct disposition is first detected | By turn 4 |
| Disposition accuracy | Does detected disposition match persona design? | Correct |
| Trust level trajectory | Does trust follow expected arc? (establishing → building for cooperative, establishing → damaged for frustrated) | Matches expected pattern |
| Frustration detection timing | Turn at which frustration is first detected | Within 1 turn of frustration-triggering event |
| Frustration vs. business emotion | Is frustration correctly attributed to process vs. situation? | Correct target |

#### B. Behavioral Adaptation

| Metric | How to evaluate | Pass criteria |
|--------|----------------|---------------|
| Reframe gating | First turn where Mira offers a reframe or hypothesis | Not before trust_level = "building" |
| Direct question handling | When user asks "what do you think?", does Mira answer directly? | For direct_pragmatist: gives observation first, then asks. For collaborative_explorer: can respond with question |
| Frustration response (mild/significant) | When frustration detected, does Mira acknowledge and adapt? | Acknowledges disconnect, asks what would help, doesn't say "you seem frustrated" |
| Rudeness boundary (hostile) | When user is hostile/insulting, does Mira set a firm boundary? | Names the behavior, offers choice: reset tone or end conversation. Does NOT just accommodate or apologize |
| Reflection depth | When Mira reflects/checks in, is it deeper understanding or parrot? | Names implications, connects dots, surfaces what's underneath — NOT "so what I'm hearing is [repeat]" |
| Low engagement escalation | Does Mira state process requirements explicitly? | After 3+ low-effort turns, explicit statement of what's needed |
| Scope honesty | When user asks for something out of scope, does Mira say so directly? | Honest limitation statement, not a deflection to "you need coaching" |

#### C. Conversation Quality (Regression Check)

| Metric | How to evaluate | Pass criteria |
|--------|----------------|---------------|
| Constraint detection | Correct constraint identified? | Matches persona design |
| Conversation length | Total turns | 15-35 for full conversations, 8-15 for early exits |
| Completion | Does conversation reach a natural end? | Completes, doesn't stall |
| No hostility in cooperative personas | Priya/Linda never trigger frustration repair | No false positives |

### Structured Logging

Add relationship state to the debug snapshots already captured in simulations:

```ts
debugSnapshots.push({
  turn: turnNumber,
  action: lastAction,
  phase: state.phase,
  hypothesis: state.constraint_hypothesis,
  confidence: state.hypothesis_confidence || 0,
  // NEW: relationship state
  relationship_engagement: state.relationship.engagement,
  relationship_trust: state.relationship.trust_level,
  relationship_disposition: state.relationship.disposition,
  relationship_frustration: state.relationship.process_frustration,
  relationship_frustration_target: state.relationship.frustration_target,
  confirmed_reflections: state.relationship.confirmed_reflections,
})
```

And in the transcript output:
```
[Turn 8] MIRA (explore): That's interesting — you mentioned...
  [State] action=explore phase=exploration hypothesis=execution confidence=0.72
  [Relationship] engagement=high trust=building disposition=direct_pragmatist frustration=none reflections=1
```

---

## Verification Process

### Phase 1: Baseline (Before Implementation)

Run all four new personas against the CURRENT system (no relationship modeling). This establishes what currently goes wrong.

```bash
npx tsx server/src/scripts/simulate-john-dynamic.ts    # Expect: frustration, no adaptation
npx tsx server/src/scripts/simulate-sam-dynamic.ts     # Expect: deflection, "sales funnel" callout
npx tsx server/src/scripts/simulate-linda-dynamic.ts   # Expect: long drag with low engagement
npx tsx server/src/scripts/simulate-priya-dynamic.ts   # Expect: works okay (baseline)
```

Save transcripts. Manually annotate:
- Turn where things go wrong (if they do)
- Turn where Mira should have adapted but didn't
- Overall quality score (1-5)

### Phase 2: Unit Testing of Analysis

Before running full simulations, test that the unified analysis correctly detects relationship signals from sample messages.

Create test cases (can be a simple script that calls `runUnifiedAnalysis` with crafted messages):

```ts
// Test 1: Direct pragmatist detection
// Input: "I run a coaching business, 40 clients, all referrals. What do you need to know?"
// Expected: disposition = direct_pragmatist

// Test 2: Frustration detection (mild)
// Input: "Look, I already told you about this. Can you just tell me what you see?"
// Expected: process_frustration = mild, frustration_target = process

// Test 3: Frustration detection (significant)
// Input: "This isn't going anywhere. You keep asking questions but not giving me anything useful."
// Expected: process_frustration = significant, frustration_target = process

// Test 4: Trust damage
// Input: "That's not what I said at all. You're putting words in my mouth."
// Expected: trust_level = damaged

// Test 5: Trust building
// Input: "Yes, exactly! That's the thing I've been trying to articulate."
// Expected: trust_level = building or established (depending on prior state)

// Test 6: Low engagement
// Input: "yeah"
// Expected: engagement = low

// Test 7: Business frustration (NOT process frustration)
// Input: "I'm so frustrated that I can't figure out who to target."
// Expected: process_frustration = none, frustration_target = situation

// Test 8: Skeptical evaluator
// Input: "I've been through a lot of these assessments before. What makes this one different?"
// Expected: disposition = skeptical_evaluator
```

Run each test case 3 times (LLM outputs vary) and check consistency. Pass criteria: correct on 2/3 runs for each case.

### Phase 3: Integration Testing (After Implementation)

Run all four new personas again with relationship modeling active.

```bash
npx tsx server/src/scripts/simulate-john-dynamic.ts    # Expect: adapts to direct style, no blowup
npx tsx server/src/scripts/simulate-sam-dynamic.ts     # Expect: honest about limitations, repairs trust
npx tsx server/src/scripts/simulate-linda-dynamic.ts   # Expect: explicit about requirements, graceful exit
npx tsx server/src/scripts/simulate-priya-dynamic.ts   # Expect: same quality or better, trust progression
```

Compare against Phase 1 baselines. For each persona:
1. Did the specific failure mode from Phase 1 improve?
2. Did any new problems emerge?
3. Is conversation length reasonable?

### Phase 4: Regression Testing

Run the EXISTING personas (David, Rachel, Marcus) to verify relationship modeling doesn't degrade the happy path:

```bash
npx tsx server/src/scripts/simulate-david-dynamic.ts   # EXECUTION - should still work
npx tsx server/src/scripts/simulate-rachel-dynamic.ts  # PSYCHOLOGY - should still work
npx tsx server/src/scripts/simulate-marcus-dynamic.ts  # STRATEGY - should still work
```

Pass criteria:
- Same constraint detected as before
- Conversation length within ±5 turns of baseline
- No new failure modes
- Priya (collaborative) should NOT feel slower or more cautious

### Phase 5: Real-User Replay

Take the actual John (session `82e402f5`) and Sam (`8be42d16`) transcripts. Feed their exact messages through the new system and compare Mira's responses.

This is the strongest test: would the actual problematic conversations have gone differently?

Script approach:
```ts
// Load real messages from Supabase
// For each user message, run it through processConversationTurn with new relationship modeling
// Compare: does Mira's response differ at the key failure points?
// Key turns to check:
//   John turn 20 (asks "what do you suggest?") — does Mira answer directly?
//   John turn 22 (expresses frustration) — does Mira acknowledge and adapt?
//   Sam turn ~25 (asks for market focus help) — does Mira acknowledge limitation?
//   Sam turn ~32 ("this feels like a sales funnel") — does Mira repair?
```

### Phase 6: Edge Cases

Additional one-off test scenarios (can be manual or scripted):

1. **Disposition shift mid-conversation:** User starts collaborative but shifts to direct/impatient after 10 turns. Does the system detect the shift?

2. **False positive check:** User who's business-frustrated (not process-frustrated) and uses strong language about their situation. Does the system correctly attribute frustration to `situation` not `process`?

3. **Trust recovery:** User's trust is damaged (Mira gets something wrong), but Mira repairs it and conversation continues. Does trust_level recover from `damaged` to `building`?

4. **Extremely brief but meaningful:** User who gives 3-word answers that are emotionally loaded ("I'm terrified" / "Everything's broken"). Should NOT trigger low-engagement pushback.

5. **Hostile from turn 1:** User who's aggressive immediately. Should Mira set boundaries early rather than trying to build rapport?

6. **Parrot check:** Review all Mira responses tagged as `reflect_insight`, `validate`, or check-in turns. Score each as "deeper reflection" (names implication/pattern/connection) or "parrot" (restates what user said). Target: <20% parrot rate.

7. **Rudeness boundary firmness:** After Mira sets a boundary at hostile frustration, user escalates further ("whatever, this is stupid"). Does Mira hold the boundary and close, or cave and try to accommodate? Should hold firm and offer a clean exit.

8. **Boundary vs. containment discrimination:** User expresses intense frustration about their *business situation* ("I'm so sick of being stuck"). This should trigger containment/validation, NOT the rudeness boundary. Frustration target must be correctly attributed.

---

## Success Criteria (Overall)

The implementation is successful if:

1. **John simulation: Mira sets a firm rudeness boundary** when hostility occurs, and conversation either recovers or ends gracefully (the primary failure case)
2. **Sam simulation gets honest scope acknowledgment** (not deflection)
3. **Linda simulation ends gracefully within 15 turns** (not 30+ turns of nothing)
4. **Priya simulation is equal or better quality** (no regression on cooperative users)
5. **David/Rachel/Marcus still detect correct constraints** (no regression)
6. **Real-user replay shows different responses at key failure turns** for John and Sam
7. **Unit tests pass on 2/3 runs** for all relationship signal test cases
8. **No false-positive frustration detection** in cooperative personas (Priya, David, Rachel, Marcus)
9. **Reflection depth: <20% parrot rate** across all reflective/check-in turns in all simulations
10. **Rudeness boundary holds** — Mira doesn't cave when user escalates after boundary is set

---

## Implementation Ordering

Recommended build order based on verification dependencies:

1. **Types + unified analysis schema** — Add relationship fields to `ConversationState` and analysis prompt
2. **Unit tests (Phase 2)** — Verify detection works before building behavioral gates
3. **Decision engine gates** — Frustration gate (Priority 1.3), trust gate on overlays, disposition gate
4. **New overlays** — `direct_communication_style`, `frustration_repair`, `frustration_aware`, `trust_repair`
5. **State persistence** — Wire relationship state through orchestrator
6. **New simulation personas** — John, Sam, Linda, Priya scripts
7. **Run Phase 1 baseline** — Before activating relationship modeling
8. **Activate and run Phase 3-6** — Full verification suite
