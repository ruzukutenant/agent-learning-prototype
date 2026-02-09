# Playwright Test Guide - Orchestrator Version

## Overview
The Playwright test script has been updated to test the new orchestrator-powered conversation flow.

## What Changed

### Old Flow (Pre-Orchestrator)
1. Chat conversation → "Continue to Assessment" button appears
2. User clicks button → navigates to `/assess/` page
3. Assessment page runs its own AI conversation
4. Eventually redirects to `/summary/` page

### New Flow (Orchestrator)
1. Chat conversation powered by orchestrator
2. When orchestrator completes (`complete: true` flag):
   - Email collector modal appears (if no email)
   - User enters email
   - Immediately navigates to `/summary/` page
3. Summary displays constraint and readiness scores

## Test Updates

### Persona Changed
- **Old**: MIST persona (execution constraint, deliverable need)
- **New**: Alex persona (strategy constraint, unclear direction)

**Alex Profile:**
- Marketing coach, 3 years experience
- Wants to grow but unclear which direction (group programs, 1-on-1, courses)
- Feels overwhelmed by choices
- Expected constraint: **STRATEGY**
- Expected readiness: clarity=medium, confidence=low, capacity=low
- Expected endpoint: **EC** (Expert Call for strategy guidance)

### Code Changes
1. **URL updated**: `localhost:5173` → `localhost:5174` (new dev server port)
2. **Removed**: Assessment page logic (no longer exists)
3. **Removed**: "Continue to Assessment" button logic (no longer used)
4. **Added**: Email collector modal detection
5. **Updated**: Input field selectors (textarea instead of input)
6. **Updated**: Summary validation (checks for orchestrator constraint detection)

## How to Run

### Prerequisites
```bash
# Ensure both servers are running
cd /Users/abecrystal/Dev/new-advisor/server
npm run dev  # Backend on port 3001

cd /Users/abecrystal/Dev/new-advisor/client
npm run dev  # Frontend on port 5174
```

### Install Dependencies
```bash
cd /Users/abecrystal/Dev/new-advisor
npm install playwright
```

### Run Test
```bash
node test-adaptive-playwright.js
```

## What the Test Validates

1. ✅ **Orchestrator conversation flow**
   - Adaptive responses from Claude Haiku persona
   - Multi-turn conversation with context preservation

2. ✅ **Signal detection**
   - Detects emotional markers (overwhelm, indecision)
   - Tracks clarity, confidence, capacity levels

3. ✅ **Constraint identification**
   - Correctly identifies STRATEGY constraint for Alex persona
   - Validates against expected constraint type

4. ✅ **Email collection**
   - Modal appears when conversation completes
   - Email submission triggers navigation to summary

5. ✅ **Summary page**
   - Displays correct constraint category
   - Shows readiness scores
   - Recommends appropriate endpoint (EC for strategy)

## Expected Output

```
🌐 Starting Orchestrator UI Test with Playwright + Claude Haiku...

Testing Alex persona (Strategy Constraint):
  Expected: Unclear which direction to take (group programs, 1-on-1, courses)
  Expected constraint: STRATEGY
  Expected endpoint: EC (strategy + medium readiness)

📱 Opening app at http://localhost:5174
✍️  Entering name: Alex
🖱️  Starting assessment
💬 Entering adaptive conversation mode...

[Loop 1]
💬 Mira: "Hey Alex! I'm here to help you identify..."
🤔 Generating response with Claude Haiku...
✍️  User: "I help small business owners with marketing..."

[Loop 2]
💬 Mira: "Nice! Three years is a solid foundation..."
✍️  User: "I want to grow but I'm not sure which direction..."

... [conversation continues] ...

✅ Email collector appeared - conversation complete!
📧 Entering email to proceed to summary...

✅ Conversation complete - redirected to summary page!

📊 Orchestrator Results:
✅ STRATEGY constraint detected (CORRECT for Alex persona)
✅ EC endpoint recommended (expected for strategy + medium readiness)

📝 Session ID: abc-123-def
📈 Total messages exchanged: 8

✅ Orchestrator UI test complete!
📸 Screenshots saved to screenshots/ folder

Test validated:
  ✓ Orchestrator conversation flow
  ✓ Signal detection and state inference
  ✓ Constraint identification
  ✓ Email collection on completion
  ✓ Navigation to summary page
```

## Screenshots

Screenshots are saved to `screenshots/` folder:
- `pw-01-name.png` - Name entry screen
- `pw-02-chat-start.png` - Chat screen initial state
- `pw-03-exchange.png` through `pw-XX-exchange.png` - Each message exchange
- `pw-97-email-collector.png` - Email collection modal
- `pw-99-summary.png` - Final summary page
- `pw-error.png` - Error state (if test fails)

## Troubleshooting

### Test doesn't find input field
- Check that the frontend is running on port 5174
- Verify the input field exists on the page (check console)

### Conversation doesn't complete
- Check server logs for orchestrator output
- Verify the orchestrator is detecting signals correctly
- Check if `complete` flag is being set to true

### Email modal doesn't appear
- Verify the Chat component's `handleSendMessage` checks for `response.complete`
- Check that the session doesn't already have an email

### Summary page shows wrong constraint
- Review server logs to see what the orchestrator detected
- Check signal detection and state inference output
- Verify the persona's responses match expected patterns

## Next Steps

To add more persona tests:
1. Copy the test file
2. Update the `PERSONA` object with new persona details
3. Update expected constraint and endpoint
4. Run the test

Example personas to test:
- **Morgan** (Execution constraint): Knows what to do but avoiding it
- **Jamie** (Energy constraint): Burned out, depleted
- **Taylor** (Strategy constraint with different sub-dimension)
