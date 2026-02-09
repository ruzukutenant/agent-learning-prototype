# How Routing & Offers Work in CoachMira

> **Update (Jan 2025):** Medium readiness now triggers exploration instead of immediate routing. See "Medium Readiness Protocol" section below.

---

# Architecture Improvements (Jan 2025)

## Summary for Danny

We've made significant architectural improvements to address issues found in simulation testing. Here's what changed and why.

### Problem 1: Constraint Detection Was Brittle

**Before:** Separate LLM calls for signals, inference, and consent detection. Each could contradict the others, and the system relied on regex-like phrase detection for things like "user is ready."

**After:** Single unified analysis call that returns everything in one structured response. The LLM now explicitly separates:
- **Inferred signals** (what we think is true based on patterns)
- **Explicit statements** (what they actually said)

**Why it matters:** When Rachel said "I think booking something makes sense," the old system might not catch this. Now explicit statements like this automatically override inferred signals.

### Problem 2: ENERGY Constraint Was Too Narrow

**Before:** Three constraints: STRATEGY, EXECUTION, ENERGY. The ENERGY category only covered burnout/exhaustion.

**After:** Renamed ENERGY → PSYCHOLOGY. Now covers:
- Burnout and exhaustion (old energy)
- Fear of judgment
- Imposter syndrome
- Self-doubt
- Permission issues ("who am I to...")
- Avoidance patterns driven by emotion

**Why it matters:** Rachel's issue (fear of being judged, imposter syndrome) was being misclassified as either EXECUTION or ENERGY because it didn't fit cleanly. Now PSYCHOLOGY captures all internal blocks, while EXECUTION is strictly for systems/delegation needs.

### Problem 3: Constraint Hypothesis Drifted

**Before:** Each turn could flip the hypothesis based on new signals. A conversation might start detecting STRATEGY, shift to EXECUTION, then ENERGY.

**After:** "Sticky hypothesis" logic requires +15% confidence to change once established. This prevents flip-flopping while still allowing correction if we get strong counter-evidence.

### Problem 4: explore_readiness Loop Got Stuck

**Before:** When diagnosis was delivered and readiness was medium, the system would keep asking "what's behind the hesitation?" even when the user explicitly said they were ready.

**After:** Explicit ready detection. If the user says "I'm ready" or "let's do this," we detect that as an explicit statement and bypass the readiness exploration loop.

### Problem 5: Closing Responses Were Too Long

**Before:** The `complete_with_handoff` action sometimes generated 80+ sentence responses with frameworks and theory.

**After:** Hard enforcement of 15 sentence max for closing. The prompt now has explicit length limits and the validator enforces them.

---

## Constraint Categories (Updated)

| Category | What It Means | Example Signals |
|----------|---------------|-----------------|
| **STRATEGY** | Unclear on direction, positioning, who to serve | "I don't know which offer to build", "not sure who my ideal client is" |
| **EXECUTION** | Need systems, delegation, operational help | "I'm doing everything myself", "things fall through the cracks", "I can't scale" |
| **PSYCHOLOGY** | Internal blocks preventing action | "I'm afraid of being judged", "who am I to...", "I'm burned out", "I know what to do but don't do it" |

**Key distinction:** If someone knows what to do but doesn't do it due to FEAR or SELF-DOUBT, that's PSYCHOLOGY. If they don't do it because they need SYSTEMS or HELP, that's EXECUTION.

---

## Validated with Dynamic Simulations

We tested with two contrasting personas:

### Rachel (Psychology Constraint)
- Leadership coach with imposter syndrome
- Knows what to do, but fear of judgment blocks her
- System correctly identified: **PSYCHOLOGY** ✅

### David (Execution Constraint)
- Fitness coach, operationally maxed out
- Clear on his niche, not afraid of visibility
- Just needs systems and delegation
- System correctly identified: **EXECUTION** ✅

Both simulations:
- Completed naturally (25-29 turns)
- Delivered diagnosis appropriately
- Checked blockers before closing
- No constraint drift during conversation

---

## Technical Changes

| File | Change |
|------|--------|
| `unified-analysis.ts` | NEW - Single LLM call for all analysis |
| `types.ts` | ENERGY → PSYCHOLOGY in ConstraintCategory |
| `decision-engine.ts` | Explicit ready detection, sticky hypothesis |
| `response-validator.ts` | Hard length enforcement for closing |
| 14+ other files | Updated constraint definitions and labels |

---

## Overview

After the diagnostic conversation identifies a user's constraint, CoachMira guides them through two final steps:

1. **Readiness Assessment** - Collects clarity, confidence, and capacity scores (0-10)
2. **Routing** - Recommends an appropriate next step based on their scores and expressed preferences

---

## Current Flow

### Step 1: Constraint Identified
After the conversation validates their core constraint (Strategy, Execution, or Energy), the system records it and transitions to assessment.

### Step 2: Readiness Assessment
The user rates themselves on three dimensions via slider UI:
- **Clarity** - "How clear are you about what needs to happen next?"
- **Confidence** - "How confident are you that you could tackle this?"
- **Capacity** - "Do you have the time and bandwidth right now?"

### Step 3: Routing Decision
Based on their scores, CoachMira recommends one of three endpoints:

| Endpoint | When Selected | Current Language |
|----------|---------------|------------------|
| **ec** (Expert Call) | High readiness + wants strategy | "I'll send you a summary along with a link to book time with a strategist. They'll help you [specific outcome]." |
| **mist** (Implementation) | High readiness + wants implementation | "I'll send you a summary and information about our implementation team. They specialize in [relevant deliverable]." |
| **nurture** (Follow-up) | Low readiness, OR user wants to go independent | "I'll send you a summary of what we uncovered. You've got a clear direction. Reach out anytime if you want support." |
| **explore** (NEW) | Medium readiness | Continue conversation for up to 3 turns to understand hesitation before routing |

### Step 4: Email Collection & Summary
User's email is collected, and they receive a personalized summary with their constraint and recommended next step.

---

## Medium Readiness Protocol (NEW)

**Previous behavior:** Medium readiness defaulted to `ec` (expert call).

**New behavior:** Medium readiness triggers an exploration phase (up to 3 turns) before routing.

### How It Works

1. **Detect mixed signals** - If any readiness dimension (clarity, confidence, capacity) is "medium" and they're not high across all three, exploration triggers.

2. **Identify the gap** - The system identifies which dimension is lowest and guides Mira to ask about it:
   - Low/medium **clarity**: "What piece still feels unclear?"
   - Low/medium **confidence**: "What's the hesitation about?"
   - Low/medium **capacity**: "What's competing for your attention?"

3. **Explore (max 3 turns)** - Mira has a conversation to understand what's behind the hesitation. This is exploration, not persuasion.

4. **Check for shift** - After exploring, Mira asks: "Does the path forward feel any clearer now?"

5. **Route based on outcome:**
   - Readiness improves → route to appropriate endpoint
   - User asks for help → route to ec
   - User wants to wait → route to nurture gracefully
   - No movement after 3 turns → route honestly ("timing might not be right")

### Why This Is Better

- **More enrollment-like** - An enrollment professional wouldn't immediately route someone with mixed signals; they'd explore what's going on
- **Surfaces real blockers** - Often the blocker is something addressable ("I'm traveling next week" → "Would 3 weeks from now work?")
- **Respects autonomy** - If they're genuinely not ready, we acknowledge it rather than pushing them into a call they'll no-show
- **Hard cap prevents dragging** - Maximum 3 turns, then route regardless

### Example Conversation Flow

```
Mira: "You've identified the constraint clearly, but I'm sensing some hesitation. What's the doubt about?"

User: "I just don't know if I have bandwidth right now. Things are crazy."

Mira: "That makes sense. What would need to shift for you to have bandwidth to address this?"

User: "Honestly, after this launch wraps up in 3 weeks, things should calm down."

Mira: "Got it - so the constraint is clear, but timing is the issue. Would it make sense to book something for after your launch, so you have it on the calendar?"

User: "Yeah, actually that would be good."

[Routes to ec with context about timing]
```

### Prompt Overlay (What Mira Sees)

The AI receives this guidance when medium readiness is detected:

```
## MEDIUM READINESS EXPLORATION

Their readiness is mixed. Before routing, explore what's behind the hesitation.

1. Identify the gap - Ask about the lowest dimension
2. Explore, don't solve - Listen for the real obstacle
3. Check for shift - "Does the path forward feel clearer?"
4. Route based on response - Match their energy

Key principles:
- This is EXPLORATION, not persuasion
- 3 turns maximum
- Never push past hesitation
```

---

## The "Sell Moment" Philosophy

The current instructions are designed to be **anti-pushy**:

- Always ask permission before advancing ("Are you ready to discuss next steps?")
- Never use urgency, scarcity, or pressure tactics
- Respect "not yet" as a valid answer
- Let the user choose between options rather than prescribing

**Consent gates** are built in at key transitions:
- Before going deeper into a topic
- Before offering a direct perspective
- Before sharing diagnosis
- Before discussing next steps

---

## Can Offers Be Dynamic? Yes!

**Current state:** The three endpoints (ec, mist, nurture) and their descriptions are hard-coded in the system prompt.

**Proposed solution:** Create a separate `offers.txt` (or `offers.json`) file that CoachMira reads at runtime. This would let you:

1. **Update offer details** without editing the main prompt
2. **Add time-sensitive offers** (launches, events, limited cohorts)
3. **Remove or pause offers** that aren't currently available
4. **A/B test different offer language**

### Example Structure

```
# Active Offers

## ec - Strategy Session
Name: "Clarity Call with a Strategist"
Description: A 45-minute session to map out your next 90 days
Best for: People who need help seeing the path forward
Current availability: Open
Link: [booking link]

## mist - Implementation Support
Name: "Done-With-You Implementation"
Description: Our team builds your systems while you focus on clients
Best for: People who know what they need but don't have time to build it
Current availability: Open
Link: [info page]

## nurture - Self-Guided Path
Name: "Summary + Resources"
Description: Your diagnostic summary plus curated resources for your constraint
Best for: People who want to tackle this independently for now
Current availability: Always available

## SPECIAL: Spring Cohort (time-limited)
Name: "Group Intensive - March 2024"
Description: 6-week cohort program for coaches ready to systematize
Best for: High readiness, wants community + accountability
Available until: March 1, 2024
Link: [cohort page]
```

### What This Enables

- Add a launch or event offer temporarily
- Update descriptions based on what's converting
- Pause an offer if capacity is full
- Include specific links and CTAs
- CoachMira would intelligently match users to the most relevant offer based on their constraint + readiness

---

## Questions for Danny

1. **What offers should exist?** Beyond ec/mist/nurture, what other paths might be relevant?

2. **How should time-limited offers work?** Should CoachMira mention them to everyone, or only when highly relevant?

3. **What language feels right?** The current closure templates are brief. Would you prefer more detail, more warmth, different framing?

4. **Routing logic:** Currently, medium readiness defaults to "ec" (strategist call). Is that the right default?

---

## Appendix: Current Routing Instructions

### Endpoint Selection Logic
```xml
<endpoint_selection_logic>
  <condition readiness="HIGH" wants="strategy">
    <endpoint>ec</endpoint>
    <reason>Needs planning, deeper strategic work</reason>
  </condition>

  <condition readiness="HIGH" wants="implementation">
    <endpoint>mist</endpoint>
    <reason>Knows what to do, needs it built</reason>
  </condition>

  <condition readiness="HIGH" wants="independent">
    <endpoint>nurture</endpoint>
    <reason>Ready to act alone</reason>
  </condition>

  <condition readiness="MEDIUM">
    <endpoint>ec</endpoint>
    <reason>Mixed scores, needs support</reason>
  </condition>

  <condition readiness="LOW">
    <endpoint>nurture</endpoint>
    <reason>Not ready, needs follow-up</reason>
  </condition>
</endpoint_selection_logic>
```

### Session Closure Templates
```xml
<session_closure_templates>
  <note>
    These templates are starting points. Always customize with specifics from
    the conversation—the constraint you identified, their language, and the
    outcome they want. Generic closures feel hollow after a deep conversation.
  </note>

  <after_strategist_routing endpoint="ec">
    Great. I'll send you a summary of what we discussed along with a link to
    book time with a strategist. They'll help you [SPECIFIC OUTCOME BASED ON
    THEIR CONSTRAINT]. Check your email shortly.
  </after_strategist_routing>

  <after_mist_routing endpoint="mist">
    Perfect. I'll send you a summary and information about our implementation
    team. They specialize in [RELEVANT DELIVERABLE FOR THEIR SITUATION].
    Check your email shortly.
  </after_mist_routing>

  <after_nurture_routing endpoint="nurture">
    I'll send you a summary of what we uncovered. You've got a clear direction—
    [RESTATE CONSTRAINT AND RECOMMENDED FOCUS IN THEIR LANGUAGE]. Reach out
    anytime if you want support.
  </after_nurture_routing>

  <after_user_declines_routing>
    No problem. I'll send you a summary of what we discussed today—[BRIEF
    RESTATE OF KEY INSIGHT]. When you're ready to take action, you'll know
    where to focus. What's your email?
  </after_user_declines_routing>
</session_closure_templates>
```

### Consent Gates (Ethical Safeguards)
```xml
<consent_gates>
  <gate context="before_going_deeper">Would you like to explore this further?</gate>
  <gate context="before_challenging">Can I offer a perspective that might feel direct?</gate>
  <gate context="before_diagnosis">Would you like me to share what I'm seeing?</gate>
  <gate context="before_routing">Are you ready to discuss next steps?</gate>
</consent_gates>
```

### Agency Protection Rules
```xml
<agency_protection label="NEVER VIOLATE">
  <never>Use urgency: "You need to fix this now"</never>
  <never>Use scarcity: "This opportunity won't last"</never>
  <never>Use pressure: "You're leaving money on the table"</never>
  <never>Assume permission: Always ask before advancing</never>
  <never>Override hesitation: "Not yet" is valid and respected</never>
</agency_protection>
```
