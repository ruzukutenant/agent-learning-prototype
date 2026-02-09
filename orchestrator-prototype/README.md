# Orchestration Prototype

**Architecture principle:** The orchestrator is the intelligence. The LLM is the interface.

## Overview

This prototype demonstrates an orchestration-driven conversation architecture where:

- ✅ **Intelligence lives in code** (not in prompts)
- ✅ **Zero tool calls by the LLM** (orchestrator manages all state)
- ✅ **Dynamic prompt composition** (modular overlays based on decision)
- ✅ **Continuous background analysis** (signals + state inference every turn)
- ✅ **Deterministic state transitions** (not probabilistic LLM decisions)
- ✅ **Observable & maintainable** (structured logging, clear decision paths)

## Architecture

```
User Message
    ↓
┌───────────────────────────────────────────────────────────┐
│ ORCHESTRATOR                                              │
│                                                           │
│  1. Signal Detection (Haiku - fast analysis)             │
│     - Emotional markers, clarity, confidence, capacity   │
│                                                           │
│  2. State Inference (Haiku - conversation analysis)      │
│     - Extract constraint hypothesis                      │
│     - Assess diagnosis readiness                         │
│                                                           │
│  3. Update State                                         │
│     - Readiness scoring (3-axis: clarity/confidence/capacity) │
│     - Emotional charge calculation                       │
│     - Complexity detection                               │
│                                                           │
│  4. Decision Engine                                      │
│     - Contain (if overwhelm)                             │
│     - Diagnose (if criteria met) → AUTO-CLOSE            │
│     - Validate (if hypothesis needs confirming)          │
│     - Cross-map (if upstream constraint suspected)       │
│     - Deepen (if need more info)                         │
│     - Explore (default)                                  │
│                                                           │
│  5. Prompt Builder                                       │
│     - Base identity + overlays based on decision         │
│     - NO TOOLS provided to LLM                           │
│                                                           │
│  6. LLM Call (Sonnet - conversation only)                │
│     - Just generate natural response                     │
│     - No meta-reasoning, no decisions, no tools          │
│                                                           │
└───────────────────────────────────────────────────────────┘
    ↓
Advisor Response
```

## Key Innovations

### 1. Tool-Free LLM Conversation

**Problem:** LLMs sometimes forget to call tools, call them at wrong times, or hallucinate tool calls.

**Solution:** The LLM never calls tools. The orchestrator detects when diagnosis criteria are met and automatically:
- Generates the closing message programmatically
- Transitions phase to 'complete'
- Updates constraint summary

### 2. Continuous Background Analysis

**Problem:** Waiting for the LLM to "notice" patterns is unreliable.

**Solution:** Every turn, the orchestrator runs:
- Signal detection (emotional markers, clarity, overwhelm)
- State inference (hypothesis extraction, readiness assessment)
- Readiness scoring (clarity/confidence/capacity)
- Cross-mapping checks (execution → strategy redirect)

All happening in parallel, every turn, deterministically.

### 3. Dynamic Prompt Composition

**Problem:** Monolithic prompts bloat context and reduce reliability.

**Solution:** Prompts assembled from modules:
- Base identity (lean, ~200 tokens)
- Overlays (containment, validation, cross-map, etc.)
- Context (current state, readiness, hypothesis)
- Decision guidance (what to do THIS turn)

Prompts stay focused and phase-specific.

### 4. Separation of Concerns

**Problem:** Asking LLM to both converse AND make diagnostic decisions creates conflicting objectives.

**Solution:**
- **LLM's job:** Have a natural, empathetic conversation
- **Orchestrator's job:** Analyze patterns, make decisions, manage state

Clear separation → better performance on each task.

## File Structure

```
orchestrator-prototype/
├── core/
│   ├── types.ts                  # All TypeScript interfaces
│   ├── signal-detector.ts        # Emotional/clarity signal analysis
│   ├── state-inference.ts        # Extract constraint hypothesis
│   ├── diagnosis-detector.ts     # Detect when ready to diagnose
│   ├── decision-engine.ts        # Determine next action
│   └── prompt-builder.ts         # Dynamic prompt composition
│
├── logic/
│   ├── cross-mapping.ts          # Upstream constraint detection
│   ├── readiness-scoring.ts      # 3-axis readiness (clarity/confidence/capacity)
│   ├── closing-message.ts        # Generate closing messages
│   └── containment.ts            # Containment protocol triggers
│
├── prompts/
│   └── base-identity.ts          # Lean core identity (~200 tokens)
│
├── conversation/
│   └── orchestrator.ts           # Main coordinator
│
└── test/
    ├── personas/
    │   └── systemic-coach.ts     # Alex test persona
    ├── test-harness.ts           # Conversation simulator
    └── run-test.ts               # Test runner
```

## Test Persona: Alex

**Profile:**
- Leadership coach for tech executives
- Surface symptom: "marketing problem" (misleading)
- Contradiction: Says marketing problem but converts 70% of calls
- True constraint: STRATEGY (unclear positioning)
- Tests: cross-mapping, containment, validation, readiness evolution

**Expected outcome:**
- Diagnosis: STRATEGY
- Endpoint: MIST (high clarity but low capacity)

## Setup & Run

1. **Install dependencies:**
   ```bash
   cd orchestrator-prototype
   npm install
   ```

2. **Set environment variable:**
   ```bash
   export ANTHROPIC_API_KEY='your-api-key'
   ```

3. **Run test:**
   ```bash
   npm test
   ```

## Expected Test Output

The test will simulate a full 8-turn conversation with Alex, showing:

- Turn-by-turn user responses
- Orchestrator decisions (explore, contain, validate, diagnose)
- Signal detection results
- State inference outputs
- Readiness score evolution
- Auto-diagnosis trigger
- Final validation (did it diagnose correctly?)

## Success Criteria

✅ **Correct diagnosis:** STRATEGY constraint identified

✅ **Correct endpoint:** MIST recommended (high clarity, low capacity)

✅ **Zero tool calls:** LLM never calls tools during conversation

✅ **Containment triggered:** Overwhelm detected around turn 5-6

✅ **Validation loop:** Hypothesis validated before diagnosing

✅ **Cross-mapping attempted:** Execution chaos traced to strategy gap

✅ **Programmatic closing:** Final message generated in code, not by LLM

## Key Observations

### What Gets Better

- **Reliability:** Deterministic state transitions, no missed tool calls
- **Observability:** Structured logging shows exactly why decisions were made
- **Maintainability:** Logic lives in code (version control, testing, refactoring)
- **Cost:** Smaller prompts, more efficient token usage
- **Latency:** Parallel analysis (signals + inference) vs sequential tool calls

### What Gets More Complex

- **More moving parts:** Multiple analysis modules vs single LLM call
- **Coordination:** Orchestrator must correctly sequence all analyses
- **Testing:** Need comprehensive test coverage of decision logic

## Integration Path

To integrate this into the main application:

1. **Backend orchestrator service**
   - Replace Supabase Edge Function's monolithic approach
   - Keep chat-orchestrator as HTTP endpoint
   - Call orchestration modules internally

2. **Database state tracking**
   - Add readiness scores to `advisor_sessions`
   - Track emotional charge, complexity level
   - Log orchestrator decisions for analytics

3. **Gradual rollout**
   - A/B test: monolithic prompt vs orchestration
   - Compare completion rates, diagnosis accuracy
   - Measure cost and latency differences

## Next Steps

1. **Run the test** - validate the architecture works end-to-end
2. **Analyze results** - check if diagnosis is accurate
3. **Iterate on decision logic** - tune thresholds, add edge cases
4. **Build additional personas** - test edge cases (energy constraint, execution constraint)
5. **Integration planning** - decide on deployment strategy

---

**Philosophy:** Move sophistication from prompts to code. The original 3,952-line prompt had deep diagnostic intelligence—this architecture preserves that intelligence while making it reliable, observable, and maintainable.
