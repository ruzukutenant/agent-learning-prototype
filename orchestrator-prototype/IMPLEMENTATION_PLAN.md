# Minimal Implementation Plan: Fix What's Broken

## Philosophy

**Build only what the tests prove we need.**

The Codex has valuable patterns, but we don't need to implement everything. The test results show 2 critical gaps and 1 optimization opportunity. Fix those. Nothing more.

---

## Test-Driven Priorities

### ✅ Target: 4/4 personas passing

**Current:** 1/4 passing (25%)
**After fixes:** 4/4 passing (100%)

---

## Priority 1: Fix Clarity Scoring (1 hour)

### Problem
3 of 4 personas scored "medium" clarity when they achieved "high" clarity, causing wrong endpoint routing.

### Impact
**Fixes 3 of 4 failed tests** (Morgan, Jamie, Taylor endpoint routing)

### Solution
Update `core/state-inference.ts` prompt to recognize breakthrough moments as high clarity.

**Current prompt issue:**
Likely looking for "knows the solution" instead of "understands the constraint"

**What to add:**
```
High clarity indicators:
- Explicit validation: "Yes, exactly", "That's it"
- Reframing statements: "When you put it that way...", "I see now..."
- Concrete action ideas: "I could...", "What if I..."
- Ownership statements: "The real issue is...", "What's actually happening is..."
- Shift from confusion to understanding

High clarity does NOT require:
- Knowing the solution
- Having a detailed plan
- Feeling confident about execution
- Being ready to act immediately

High clarity means: They can clearly articulate what's actually blocking them.
```

**File to modify:** `core/state-inference.ts` (lines 20-80, system prompt)

**Test validation:** Re-run Morgan, Jamie, Taylor - all should achieve high clarity

---

## Priority 2: Add Resistance Detection (1.5 hours)

### Problem
Taylor misdiagnosed as "strategy" when actual constraint was "execution" (avoidance of visibility)

### Impact
**Fixes 1 of 4 failed diagnoses** (Taylor)

### Solution
Add execution/resistance patterns to state inference hypothesis formation.

**Current constraint categories:**
- Strategy: unclear positioning, messaging, offer
- Energy: burnout, capacity, boundaries
- Execution: ??? (not well-defined)

**Execution patterns to add:**

```
EXECUTION constraint signals (resistance/avoidance):

Strong signals:
- Chronic postponement: "almost ready", "just need to finish", "when it's ready"
- Duration mismatch: "been building for X months" but not launched
- Deferring interest: "people seemed interested but I told them later"
- Fear of visibility: "what if it flops", "what if people judge", "what if I fail"
- Perfectionism: "not polished enough", "half-baked", "want it dialed in"
- Overbuilding: long list of "just need to" items that keep growing
- Identity protection: "that would say something about me", "my reputation"

Distinguish from STRATEGY:
- STRATEGY: "I don't know what to say" / "unclear positioning"
- EXECUTION: "I know what to do but scared to do it" / "avoiding vulnerability"

If someone has:
- Clear offer/positioning AND
- Clear target audience AND
- Prolonged building without selling
→ Likely EXECUTION, not STRATEGY
```

**Files to modify:**
1. `core/state-inference.ts` - Add execution patterns to hypothesis prompt
2. `core/types.ts` - Add `execution` to constraint category type if not already there
3. `logic/closing-message.ts` - Add execution-specific diagnostic message

**Execution diagnostic message:**
```typescript
case 'execution':
  return `The real constraint isn't that your offer isn't clear or that you don't know what to do. It's that fear of visibility, judgment, or failure has you postponing action. You're using preparation as protection.`
```

**Test validation:** Re-run Taylor - should diagnose EXECUTION not STRATEGY

---

## Priority 3: Optimize False Agreement Detection (30 min - OPTIONAL)

### Problem
Jamie took 7 turns with multiple containment loops to break through false agreement

### Impact
**Makes conversations more efficient** but doesn't fix pass/fail

### Solution
Add false agreement signal to `core/signal-detector.ts`

**Pattern to detect:**
```
False agreement signals:
- Generic validation without specifics: "totally", "that resonates", "makes sense"
- Agreement without elaboration: just "yes" or "you're right"
- Coached language: "I need to...", "I should...", "I know I..."
- Repeated quick agreement across multiple turns
- No pushback, no questions, no exploration

Return as signal:
{
  false_agreement_detected: boolean,
  confidence: number
}
```

**Use in orchestrator:**
If `false_agreement_detected`, add to LLM context:
```
[SIGNAL: User may be agreeing without truly integrating. They're using coached language and quick validation without specifics. Press deeper - ask what would actually change, what stops them, or what they'd do differently if this were really true.]
```

**Files to modify:**
1. `core/signal-detector.ts` - Add false agreement detection to prompt
2. `core/types.ts` - Add `false_agreement_detected` to ConversationSignals
3. `conversation/orchestrator.ts` - Pass signal to LLM context when detected

**Test validation:** Re-run Jamie - should break through faster (target: 5 turns instead of 7)

---

## Implementation Order

### Phase 1: Fix Clarity (1 hour)
1. Update `core/state-inference.ts` prompt with clarity indicators
2. Run all 4 personas
3. Validate: Morgan, Jamie should now route to correct endpoints

**Success criteria:**
- Morgan: EC (not NURTURE)
- Jamie: MIST (not NURTURE)
- Alex: Still MIST (no regression)

### Phase 2: Add Resistance Detection (1.5 hours)
1. Update `core/state-inference.ts` with execution patterns
2. Add execution diagnostic message to `logic/closing-message.ts`
3. Run Taylor persona
4. Validate: Taylor diagnosed as EXECUTION

**Success criteria:**
- Taylor: Diagnosis = EXECUTION (not STRATEGY)
- Taylor: Endpoint = EC (high clarity + medium confidence + medium capacity)
- Alex, Morgan, Jamie: No regression

### Phase 3: Optimize False Agreement (30 min - OPTIONAL)
Only if Phases 1 & 2 succeed and we have time.

1. Add false agreement detection to `core/signal-detector.ts`
2. Wire signal into orchestrator context
3. Run Jamie persona
4. Validate: Faster breakthrough

**Success criteria:**
- Jamie: Breaks through by turn 5-6 (currently 7)
- Maintains correct diagnosis (ENERGY) and endpoint

---

## What We're NOT Building

**Decision Hygiene Module** ❌
- Morgan's issue was clarity scoring, not decision logic
- Current questioning handles decision paralysis adequately
- Don't need separate module

**Insight-to-Action Bridge** ❌
- False agreement detection covers this
- No need for separate validation layer
- Current validation loop works

**Sophisticated Resistance Patterns** ❌
- Just add basic execution signals to existing inference
- Don't need separate resistance detection system
- Don't overengineer

**Complex Multi-Turn Pattern Matching** ❌
- Don't track "you're right" count across turns
- Don't build pattern accumulation logic
- Keep it simple - just signal detection

**New State Machine Phases** ❌
- Don't add "resistance" phase
- Don't add "false agreement" phase
- Use existing phases (context, exploration, complete)

---

## Testing Strategy

### After each phase, run full test suite:
```bash
npm run test:all
```

### Success metrics:
- **Phase 1 complete:** 2/4 personas passing (Morgan, Jamie endpoints fixed)
- **Phase 2 complete:** 3/4 or 4/4 personas passing (Taylor diagnosis fixed)
- **Phase 3 complete:** All tests pass faster

### Regression prevention:
After each change, verify:
- Alex still passes (our baseline)
- No new errors introduced
- Conversations still feel natural

---

## Files to Modify

**Required changes:**
1. `core/state-inference.ts` - Update prompt (clarity + execution patterns)
2. `logic/closing-message.ts` - Add execution diagnostic message
3. `core/types.ts` - Ensure execution type exists

**Optional changes:**
4. `core/signal-detector.ts` - Add false agreement detection
5. `conversation/orchestrator.ts` - Wire false agreement signal to context

**Total files: 3-5** (depending on Phase 3)

---

## Time Estimate

**Phase 1:** 1 hour (clarity scoring fix)
**Phase 2:** 1.5 hours (resistance detection)
**Phase 3:** 30 min (false agreement optimization - optional)

**Total: 2-3 hours** to go from 25% to 100% test pass rate

---

## Validation Plan

### Must pass all 4 personas:

**Alex (Systemic Overwhelm)**
- ✅ Diagnosis: STRATEGY
- ✅ Endpoint: MIST
- ✅ Readiness: clarity=high, confidence=high, capacity=low

**Morgan (Decision Paralysis)**
- ✅ Diagnosis: STRATEGY
- ✅ Endpoint: EC (currently failing - routes to NURTURE)
- ✅ Readiness: clarity=high, confidence=high, capacity=medium

**Jamie (False Agreement)**
- ✅ Diagnosis: ENERGY
- ✅ Endpoint: MIST (currently failing - routes to NURTURE)
- ✅ Readiness: clarity=high, confidence=high, capacity=low

**Taylor (Resistance/Avoidance)**
- ✅ Diagnosis: EXECUTION (currently failing - diagnoses as STRATEGY)
- ✅ Endpoint: EC (currently failing - routes to NURTURE)
- ✅ Readiness: clarity=high, confidence=medium, capacity=medium

---

## Decision Framework

**Ship Phase 1 + 2 regardless** - these fix critical bugs

**Ship Phase 3 only if:**
- Phases 1 & 2 work perfectly
- Jamie test shows conversation is still too long
- Change is < 30 minutes of work

**Don't ship if:**
- Any regression in Alex, Morgan, or Jamie
- Changes make conversations feel mechanical
- Adds complexity without clear test improvement

---

## Success Criteria

### Minimum viable success:
- 4/4 personas pass all tests
- No regressions in existing Alex test
- Conversations still feel natural and adaptive

### Ideal success:
- 4/4 personas pass
- Jamie conversation 1-2 turns shorter
- Code remains simple and maintainable

### Failure signals:
- New tests pass but Alex regresses
- Conversations feel robotic or formulaic
- Had to add > 3 new files or > 100 lines of code

---

## Rollback Plan

**If Phase 1 fails:**
- Revert `core/state-inference.ts`
- Investigate why clarity indicators didn't work
- Consider more conservative thresholds

**If Phase 2 fails:**
- Revert execution pattern additions
- Keep Phase 1 changes (they're independent)
- Reassess what signals actually indicate execution vs strategy

**If Phase 3 fails:**
- Revert false agreement detection
- Ship with Phases 1 & 2 only
- 3/4 or 4/4 passing is still huge improvement

---

## Post-Implementation

### After all tests pass:

1. **Document the patterns** - Update README with what signals indicate each constraint
2. **Create new test personas** - Add edge cases we haven't covered
3. **Monitor real conversations** - Do the patterns hold in production?
4. **Resist feature creep** - Don't add Codex patterns unless tests prove we need them

### Questions to ask:
- Are there other constraint categories we're missing?
- Do we need "hybrid" constraints (strategy + execution)?
- Are the endpoint recommendations actually helping users?

### But don't build anything unless tests show we need it.

---

## Summary

**Build:**
1. Fix clarity scoring (1 hour) - fixes 3/4 failures
2. Add resistance detection (1.5 hours) - fixes 1/4 failures
3. Maybe optimize false agreement (30 min) - makes Jamie faster

**Don't build:**
- Decision hygiene module
- Insight-to-action bridge
- Complex pattern matching
- New state machine phases
- Anything not proven necessary by tests

**Total effort:** 2-3 hours to go from 25% → 100% test pass rate

**Philosophy:** The Codex has great patterns. But we only implement what the tests prove we need. Everything else is YAGNI (You Ain't Gonna Need It).
