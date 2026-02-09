# Automated Persona Testing Harness

This testing harness simulates realistic coach personas going through the entire advisor interview flow. It uses Claude to generate persona-appropriate responses and validates that the routing logic works correctly.

## How It Works

1. **Persona-Based Simulation**: Each persona has defined characteristics, business details, and expected outcomes
2. **AI-Generated Responses**: Claude generates realistic user responses based on the persona profile
3. **Real Edge Function**: Uses the actual deployed chat-orchestrator Edge Function
4. **Automated Validation**: Checks if the constraint identification and endpoint routing match expectations

## Personas

### 1. `strategy_gap` - Sarah
- **Profile**: Life coach with unclear positioning
- **Signals**: Low conversion, pricing nervousness, vague value prop
- **Expected**: Strategy constraint → EC endpoint
- **Readiness**: Medium (5-7 scores)

### 2. `execution_bottleneck` - Marcus
- **Profile**: Business coach drowning in manual work
- **Signals**: No systems, can't scale, admin overwhelm
- **Expected**: Execution constraint → EC endpoint (strategic process problem)
- **Readiness**: High (7-9 scores)

### 3. `execution_deliverable` - Jessica
- **Profile**: Health coach needs funnel built
- **Signals**: Knows what's needed, wants it built, specific deliverable
- **Expected**: Execution constraint → MIST endpoint (concrete deliverable)
- **Readiness**: High (7-9 scores)

### 4. `energy_drain` - Tom
- **Profile**: Executive coach feeling burned out
- **Signals**: Lost motivation, energy drain, isolation
- **Expected**: Energy constraint → EC endpoint (business restructuring)
- **Readiness**: Low (3-6 scores)

### 5. `not_ready` - Alex
- **Profile**: Early-stage career coach
- **Signals**: Overwhelmed, unclear, low confidence
- **Expected**: Strategy constraint → NURTURE endpoint (not ready)
- **Readiness**: Very low (<5 scores)

## Usage

### Run All Personas

Tests all 5 personas sequentially:

```bash
npm run test:personas
```

### Run Single Persona

Test a specific persona:

```bash
npm run test:persona strategy_gap
npm run test:persona execution_deliverable
npm run test:persona energy_drain
npm run test:persona execution_bottleneck
npm run test:persona not_ready
```

## Output

The harness outputs:

1. **Conversation Flow**: Shows each exchange between advisor and user
2. **Phase Transitions**: Tracks progression through phases (context → exploration → diagnosis → readiness → routing)
3. **Final Results**:
   - Constraint category identified
   - Endpoint selected
   - Readiness scores collected
4. **Validation**:
   - ✅ PASS if routing matches expectations
   - ❌ FAIL if routing is incorrect
5. **Session Links**: URLs to view the full conversation in the UI

## Example Output

```
================================================================================
TESTING PERSONA: Jessica - Needs Funnel Built
Expected: execution constraint → MIST endpoint
================================================================================

📝 Session created: abc-123-def

[CONTEXT] Advisor: Hey Jessica! I'm here to help you identify...

[CONTEXT] User: I'm a health coach specializing in nutrition...

[EXPLORATION] Advisor: Got it. What's working well in how people discover you?

[EXPLORATION] User: My webinar converts well, but the registration funnel is broken...

...

================================================================================
RESULTS FOR: Jessica - Needs Funnel Built
================================================================================
Final Phase: routing
Constraint Category: execution
Endpoint Selected: MIST

Readiness Scores:
  Clarity: 8/10
  Confidence: 8/10
  Capacity: 9/10

────────────────────────────────────────────────────────────────────────────────
VALIDATION:
  Expected constraint: execution ✅
  Expected endpoint: MIST ✅

🎉 PASS: Routing worked correctly!

View full conversation: http://localhost:5173/chat/abc-123-def
View summary: http://localhost:5173/summary/abc-123-def
================================================================================
```

## Key Validations

The test harness validates:

1. **Constraint Identification**: Does the AI correctly identify strategy/execution/energy constraints?
2. **Endpoint Routing**: Does the routing logic send users to the right endpoint (EC/MIST/NURTURE)?
3. **MIST vs EC Distinction**: Does it correctly distinguish strategic problems (EC) from deliverable needs (MIST)?
4. **Readiness Scoring**: Are readiness scores factored into routing decisions?
5. **Phase Progression**: Does the conversation flow through all phases correctly?

## Requirements

- Server must be running (`npm run dev:server`)
- Edge Function must be deployed
- ANTHROPIC_API_KEY must be set in .env

## Tips

- **Watch the conversation**: The output shows how the AI interprets persona signals
- **Check for misrouting**: If personas route incorrectly, it indicates prompt issues
- **Adjust personas**: Modify persona characteristics to test edge cases
- **Add new personas**: Create additional personas to test specific scenarios

## Troubleshooting

**"Max turns reached"**: Conversation didn't complete in 30 turns
- Check if AI is stuck in a loop
- Review phase transition logic

**"Endpoint not selected"**: Routing phase didn't call select_endpoint tool
- Check routing phase prompt
- Verify tool is available in that phase

**Incorrect routing**: Persona routed to wrong endpoint
- Review conversation log to see where AI interpreted signals incorrectly
- Adjust routing phase logic or persona characteristics
