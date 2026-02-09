# Adaptive Containment - Before & After

## Problem Identified

**Original containment message:**
```
"I hear you. That's a lot.

Let's take a step back—what feels like the biggest issue right now?"
```

**Issues:**
1. ❌ Asks overwhelmed user to synthesize/prioritize
2. ❌ Adds cognitive load instead of reducing it
3. ❌ Can trigger more overwhelm if they don't know the answer
4. ❌ No containment cooldown → got stuck in loops (turns 4-7)

---

## Solution Implemented

### **Adaptive Containment Strategy**

Three levels based on overwhelm severity:

#### **1. HIGH OVERWHELM**
*Triggered when: 3+ emotional markers OR 2+ capacity signals*

```
"I hear you. That's a lot.

It sounds like you've been trying everything, and that's exhausting.
Sometimes when we're in that mode, it's hard to see what's actually going on.

What does your gut tell you is really happening here?"
```

**Why better:**
- ✅ Validates their struggle ("trying everything, that's exhausting")
- ✅ Normalizes confusion ("hard to see what's going on")
- ✅ Lower-stakes question ("gut" vs "biggest issue")
- ✅ Exploratory, not diagnostic

---

#### **2. MEDIUM OVERWHELM + HYPOTHESIS FORMING**
*Triggered when: hypothesis exists (>0.5 confidence) + some overwhelm*

```
"I hear you. That's a lot of moving pieces.

Here's what I'm noticing: [observation based on hypothesis]

Does that land?"
```

**Examples by category:**

**STRATEGY hypothesis:**
> "Here's what I'm noticing: you're great at what you do (strong close rate), but the front-end—how people find you and understand your value—feels murky"

**EXECUTION hypothesis:**
> "Here's what I'm noticing: you know what to do, but the systems and capacity to deliver consistently aren't there yet"

**ENERGY hypothesis:**
> "Here's what I'm noticing: you're running on empty, and when your energy is drained, everything else feels harder"

**Why better:**
- ✅ You do the synthesis work for them
- ✅ Low-pressure check-in ("Does that land?")
- ✅ Shows you understand the pattern

---

#### **3. LIGHT OVERWHELM**
*Triggered when: some emotional markers but not severe*

```
"I hear you.

Forget about tactics for a second—what feels most stuck right now?"
```

**Why better:**
- ✅ Reframes away from overwhelm ("forget about tactics")
- ✅ Simpler question ("most stuck" vs "biggest issue")
- ✅ Brief, not verbose

---

### **Containment Cooldown**

**Added to prevent loops:**
```typescript
// Don't trigger containment if we just did it (need 2 turns minimum)
if (state.turns_since_containment < 2) {
  return false
}
```

**Before:** Containment triggered 4 times in a row (turns 4-7)
**After:** Containment triggered once (turn 6), then conversation progressed

---

## Test Results Comparison

### **Before Adaptive Containment:**

| Metric | Result | Status |
|--------|--------|--------|
| Diagnosis | STRATEGY | ✅ |
| Endpoint | EC (wrong) | ❌ |
| Containment loops | 4 consecutive | ❌ |
| Final capacity | medium | ❌ |
| Overall | FAILED | ❌ |

**Problems:**
- Got stuck in containment loop
- Lost capacity signals → wrong endpoint recommendation
- Repetitive, unhelpful containment messages

---

### **After Adaptive Containment:**

| Metric | Result | Status |
|--------|--------|--------|
| Diagnosis | STRATEGY | ✅ |
| Endpoint | MIST | ✅ |
| Containment loops | 0 (triggered once, progressed) | ✅ |
| Final capacity | low | ✅ |
| Overall | **PASSED** | ✅ |

**Improvements:**
- ✅ Containment triggered once at turn 6
- ✅ Used HIGH OVERWHELM strategy (3 emotional markers detected)
- ✅ Message asked gut-level question, not synthesis
- ✅ Cooldown prevented loop
- ✅ Conversation progressed naturally
- ✅ Correct endpoint recommendation (MIST)

---

## Conversation Transcript Excerpt

**Turn 6 - Containment Triggered:**

**ALEX:** "[Emotional] I think... I think the issue is I don't actually know how to EXPLAIN what I do in a way that makes people want to work with me..."

**[Orchestrator]:**
```
Containment level: {
  emotionalMarkers: 3,
  capacitySignals: 0,
  hypothesis: 'execution'
}
→ Using HIGH OVERWHELM strategy
```

**ADVISOR:** "I hear you. That's a lot.

It sounds like you've been trying everything, and that's exhausting. Sometimes when we're in that mode, it's hard to see what's actually going on.

What does your gut tell you is really happening here?"

**Turn 7 - Containment Cooldown Active:**

**ALEX:** "I usually say something like 'I help tech executives become better leaders.' And then they say 'oh cool' and the conversation dies..."

**[Orchestrator]:**
```
turns_since_containment: 1 (< 2 minimum)
→ Cooldown active, skip containment
→ Decision: DIAGNOSE (all criteria met)
```

**Result:** Auto-diagnosis triggered ✅

---

## Code Changes

### **1. Added adaptive message generator**
`logic/closing-message.ts`:
- 3-level containment strategy
- Category-specific observations
- Gut-level question for high overwhelm

### **2. Added containment cooldown**
`core/types.ts`:
- Added `turns_since_containment` field
- Added `last_action` tracking

`logic/containment.ts`:
- Cooldown check (minimum 2 turns between containment)

### **3. Programmatic containment messages**
`conversation/orchestrator.ts`:
- Generate containment messages in code (not LLM)
- Reset cooldown when containment triggered
- Track last action

---

## Architecture Benefits

This demonstrates the power of the orchestration approach:

**Problem identified:** 5-minute user feedback
**Solution designed:** 10 minutes
**Implementation:** 15 minutes
**Testing:** 5 minutes
**Total:** ~35 minutes

**If this were in a monolithic prompt:**
- ❌ Would need to rewrite entire prompt
- ❌ Harder to test different strategies
- ❌ No deterministic cooldown logic
- ❌ No structured logging of containment levels

**With orchestration:**
- ✅ Changed one function
- ✅ Added cooldown logic in code
- ✅ Easy to A/B test different strategies
- ✅ Full observability (logged emotional markers, hypothesis, containment level)

---

## Next Steps

### **Potential refinements:**

1. **Personalize containment messages**
   - Use user's name
   - Reference their specific business type

2. **Adjust cooldown based on severity**
   - High overwhelm: 3-turn cooldown
   - Medium: 2-turn cooldown
   - Light: 1-turn cooldown

3. **Add recovery detection**
   - If emotional_charge drops to neutral, allow containment sooner

4. **Test with more personas**
   - Energy constraint case
   - Execution constraint case
   - Quick diagnoser (low overwhelm)

5. **Track containment effectiveness**
   - Did emotional charge reduce after containment?
   - How many turns until validation/diagnosis?

---

## Conclusion

**The adaptive containment significantly improves the user experience:**

| Before | After |
|--------|-------|
| "What's the biggest issue?" | "What does your gut tell you?" |
| Adds cognitive load | Reduces pressure |
| Generic | Hypothesis-aware |
| Loops endlessly | Cooldown prevents loops |
| TEST FAILED | TEST PASSED ✅ |

**Philosophy validated:** When you control the intelligence in code, you can iterate fast and build sophisticated behavior that would be unreliable in prompts.
