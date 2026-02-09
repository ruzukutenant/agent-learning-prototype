# CLAUDE.md - CoachMira Advisor

## Launch Checklist (Pre-Launch TODOs)

**Target Launch: ~1 week from Jan 15, 2026**

### Waiting on Mirasee

- [x] **YouCanBookMe webhook setup** - Matthew confirmed configured on both YCBM forms (Jan 20, 2026)

### Completed ✅

- [x] **Booking URLs from Matthew** - Received and configured:
  - MIST: https://cma-mist.youcanbook.me (Execution constraint)
  - EC: https://cma-ec.youcanbook.me (Strategy/Psychology constraint)

- [x] **Booking URLs in Render** - `VITE_MIST_BOOKING_LINK` and `VITE_EC_BOOKING_LINK` set

- [x] **Webhook secret in Render** - `BOOKING_WEBHOOK_SECRET` configured and tested

- [x] **Ontraport CRM integration** - Leads sync to Mirasee's CRM
  - API credentials configured in Render
  - Creates contact + Note object with assessment data
  - Tested and verified working (Contact ID 47550)

- [x] **Email validation** - Client + server side validation

- [x] **Privacy Policy & Terms links** - Added to Landing page footer
  - Links to https://mirasee.com/privacy-policy/
  - Links to https://mirasee.com/terms-conditions/

- [x] **50-turn conversation limit** - Graceful close with custom overlay

- [x] **Model updates** - All Claude models updated to latest (Sonnet 4.5, Haiku 4.5)

- [x] **Prompting optimizations** - Temperature tuning, XML tags, chain-of-thought, prefill

- [x] **Daily health check cron** - Runs at 9am EST, emails report to abe@ruzuku.com

### Before Go-Live (Our Side)

- [x] **Test full funnel end-to-end** - Tested, live with real production users

- [x] **Clear test data** - Done before launch

---

## Post-Launch TODOs

- [x] **Add env vars to daily health check cron** - Completed Jan 21, 2026
  - `SUPABASE_URL`, `SUPABASE_SECRET_KEY` added
  - `RESEND_API_KEY` needs manual update in Render dashboard
  - *If daily reports aren't useful, can shut down the cron to save $7/month*

- [x] **Refocus daily health reports on errors/anomalies** - Reworked to alert-only: no email unless issues found. Checks for zero sessions, low completion rate, stuck sessions (30+ turns), CRM sync failures, sessions with zero messages. Can shut down the cron ($7/month) if alerts aren't useful

- [ ] **Migrate to Structured Outputs (Beta)** - Needs investigation and planning before implementation. Anthropic's structured outputs feature guarantees schema-compliant JSON

  **Where we parse JSON from LLMs today:**
  1. `unified-analysis.ts` - Critical path, returns signals/hypothesis/readiness
  2. `reportGenerator.ts` - Had markdown code block parsing issues (fixed with stripping)
  3. Constraint summarizer, closing synthesis - Various structured responses

  **Benefits:**
  - No more `JSON.parse()` failures
  - Guaranteed schema compliance - no missing fields, wrong types
  - No retry logic needed

  **Trade-offs:**
  - Beta feature (may have edge cases)
  - First request latency for grammar compilation (cached 24h)
  - Slight token cost increase from injected system prompt

  **Implementation:**
  - Add beta header: `anthropic-beta: structured-outputs-2025-11-13`
  - Use `output_format` with JSON schema for responses
  - Use `strict: true` on tools for validated parameters
  - Works with Pydantic (Python) or Zod (TypeScript) for schema definition

  **Priority files to migrate:**
  1. `server/src/orchestrator/core/unified-analysis.ts`
  2. `server/src/services/ai/reportGenerator.ts`

- [x] **Configure Resend email domain** - Completed Jan 21, 2026
  - Domain: `mail.coachmira.ai` configured in Resend
  - `RESEND_FROM_EMAIL` set to `Mira <mira@mail.coachmira.ai>` in Render
  - Code updated to use new domain as default fallback

---

## Project Overview

CoachMira Advisor is an AI-powered diagnostic tool that helps coaches and consultants identify their core business constraint through a conversational interview. The system detects one of three constraint types (STRATEGY, EXECUTION, PSYCHOLOGY) and routes users to appropriate next steps.

## Architecture

### Core Components

```
server/src/orchestrator/
├── core/
│   ├── unified-analysis.ts    # Single LLM call for all signal detection
│   ├── decision-engine.ts     # Selects next action based on signals
│   ├── prompt-builder.ts      # Composes prompts with overlays
│   ├── response-validator.ts  # Validates LLM responses match intent
│   ├── response-variety.ts    # Prevents repetitive language
│   ├── conversation-memory.ts # Tracks explored topics
│   └── types.ts               # Core type definitions
├── prompts/
│   └── base-identity.ts       # Mira's persona and conversational style
├── conversation/
│   └── orchestrator.ts        # Main conversation loop
└── logic/
    └── closing-message.ts     # Closing/transition message generation
```

### How It Works

1. **User message arrives** → Orchestrator receives it
2. **Unified analysis** → Single LLM call detects signals, constraint hypothesis, readiness, consent
3. **Decision engine** → Selects action (explore, validate, diagnose, etc.)
4. **Prompt builder** → Composes base identity + relevant overlays
5. **LLM generates response** → Using composed prompt
6. **Response validator** → Ensures response matches action intent
7. **Response returned** → User sees Mira's message

### Constraint Categories

| Category | What It Means | Example Signals |
|----------|---------------|-----------------|
| **STRATEGY** | Unclear on direction, positioning, who to serve | "not sure which offer", "don't know my ideal client" |
| **EXECUTION** | Need systems, delegation, operational help | "doing everything myself", "can't scale", "things fall through cracks" |
| **PSYCHOLOGY** | Internal blocks preventing action | "afraid of being judged", "burned out", "I know what to do but don't do it" |

**Key distinction:** If someone knows what to do but doesn't do it due to FEAR or SELF-DOUBT, that's PSYCHOLOGY. If they don't do it because they need SYSTEMS or HELP, that's EXECUTION.

## Key Files to Understand

| File | Purpose |
|------|---------|
| `server/src/orchestrator/core/prompt-builder.ts` | All overlay definitions (exploration, validation, diagnosis, closing, etc.) |
| `server/src/orchestrator/prompts/base-identity.ts` | Mira's persona, tone, conversational style |
| `server/src/orchestrator/core/unified-analysis.ts` | Signal detection prompt and parsing |
| `server/src/orchestrator/core/decision-engine.ts` | Action selection logic, sticky hypothesis |
| `server/data/system-prompt.txt` | Alternative XML-format system prompt |
| `docs/annotated-simulation-david.md` | Annotated transcript showing orchestrator in action |
| `docs/routing-and-offers-for-danny.md` | Architecture overview for stakeholder review |

## Testing with Simulations

### Running Simulations

```bash
# David - tests EXECUTION constraint detection
npx tsx server/src/scripts/simulate-david-dynamic.ts

# Rachel - tests PSYCHOLOGY constraint detection
npx tsx server/src/scripts/simulate-rachel-dynamic.ts

# Marcus - tests STRATEGY constraint detection
npx tsx server/src/scripts/simulate-marcus-dynamic.ts
```

Simulations output to `/tmp/[name]-dynamic-[timestamp].log`

### Simulation Personas

| Persona | Constraint | Key Characteristics |
|---------|------------|---------------------|
| **David** | EXECUTION | Fitness coach, 12 clients @ $800, drowning in custom work, tried hiring VAs but no documented processes |
| **Rachel** | PSYCHOLOGY | Leadership coach, knows what to do but fear of judgment blocks her, imposter syndrome |
| **Marcus** | STRATEGY | Business coach, unclear positioning, too many potential niches, can't commit to direction |

### What to Check in Simulations

1. **Constraint detected correctly** - Did it identify the right category?
2. **No constraint drift** - Did hypothesis stay stable throughout?
3. **Breakthrough reflected** - When user has insight, did Mira mirror it?
4. **Consent gates used** - Asked permission before diagnosis?
5. **Closing appropriate** - Not too long, no premature CTAs?
6. **Language variety** - No repetitive openers or patterns?

## Browser Testing with Agent Browser

Agent Browser is a headless browser automation CLI that Claude Code can use to test the live app. It's useful for verifying UI fixes, testing user flows, and debugging user-reported issues.

### Installation

```bash
npm install -g agent-browser
```

### Key Commands

| Command | Description |
|---------|-------------|
| `agent-browser open <url>` | Navigate to a URL |
| `agent-browser snapshot` | Get accessibility tree with element refs (`@e1`, `@e2`) |
| `agent-browser snapshot -i` | Interactive elements only (buttons, inputs, links) |
| `agent-browser click <ref>` | Click element (e.g., `click e2` or `click @e2`) |
| `agent-browser fill <ref> <text>` | Clear field and type text |
| `agent-browser type <ref> <text>` | Type text without clearing |
| `agent-browser screenshot [path]` | Take screenshot |
| `agent-browser screenshot --full` | Full page screenshot |
| `agent-browser get text <ref>` | Get element's text content |
| `agent-browser set viewport <w> <h>` | Set viewport size |
| `agent-browser set device "iPhone 12"` | Emulate mobile device |

### Testing CoachMira Flows

**Test the landing page:**
```bash
agent-browser open https://advisor.coachmira.ai
agent-browser snapshot -i                    # See interactive elements
agent-browser screenshot /tmp/landing.png    # Visual check
agent-browser click e2                       # Click "Find My Next Step"
```

**Test name collection:**
```bash
agent-browser snapshot
agent-browser fill e2 "Test User"            # Fill name field
agent-browser click e3                       # Click "Start Assessment"
```

**Test mobile layout:**
```bash
agent-browser set device "iPhone 12"
agent-browser open https://advisor.coachmira.ai
agent-browser screenshot /tmp/mobile.png
```

**Test the admin panel:**
```bash
agent-browser open https://advisor.coachmira.ai/admin
agent-browser snapshot -i
agent-browser fill e2 "password"             # Fill password field
agent-browser click e3                       # Login
```

### When to Use Agent Browser

| Scenario | Use Agent Browser? |
|----------|-------------------|
| Verify a UI fix after deploy | Yes - click the element, take screenshot |
| Debug "button not clickable" reports | Yes - try clicking, check for overlaps |
| Test mobile responsiveness | Yes - use `set device` to emulate |
| Run full E2E regression | Maybe - good for spot checks, not CI |
| Test conversation logic | No - use simulations instead |

### Tips

- **Use `-i` flag** on snapshot to only see interactive elements (less noise)
- **Element refs persist** until the page changes - no need to re-snapshot between actions
- **Sessions are isolated** - use `--session <name>` for parallel testing
- **Headed mode** for debugging: `agent-browser --headed open <url>` shows the browser window
- **Record videos**: `agent-browser record start ./demo.webm` then `record stop`

### Debugging User Issues

When a user reports a UI problem:

1. Navigate to the page they reported
2. Take a screenshot to see current state
3. Use `snapshot -i` to see the element structure
4. Try the action they reported as broken
5. Check viewport/device settings if it's mobile-specific

## UI Feedback with Agentation

Agentation is a browser-based annotation tool for providing precise design feedback. It's installed in dev mode only and generates structured output that Claude Code can parse.

### How to Use

1. Start dev server: `npm run dev`
2. Open any page in the browser
3. Toggle annotation mode: `Cmd+Shift+A` (Mac) or `Ctrl+Shift+A`
4. Annotate using one of the modes:
   - **Text**: Select text for typos/copy changes
   - **Element**: Click an element for styling/layout feedback
   - **Multi-Select**: `Cmd+click` multiple elements
   - **Area**: Drag to select a region
5. Type feedback in the popup, click "Add"
6. Press `C` to copy all annotations
7. Paste into Claude Code chat

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+Shift+A` | Toggle on/off |
| `P` | Pause CSS animations |
| `H` | Hide/show markers |
| `C` | Copy all annotations |
| `X` | Clear all |
| `Esc` | Cancel/close |

### When to Use Agentation

| Scenario | Use Agentation? |
|----------|-----------------|
| Design feedback on UI changes | Yes - annotate specific elements with precise feedback |
| Reporting visual bugs | Yes - mark the element and describe the issue |
| Reviewing a new component | Yes - multi-select to compare alignment/spacing |
| Testing conversation logic | No - use simulations instead |
| Testing on production | No - dev mode only |

### Output Format

The copied output includes element paths that can be grepped in the codebase, making it easy to find the exact component to modify.

**Reminder for Claude:** When working on UI/design features, suggest using Agentation for testing and feedback iteration.

## Common Issues and Fixes

### Problem: CTA Language Leaking into Non-Closing Responses

**Symptom:** "Click below to see your summary" appears during `explore` or `reflect_insight` actions.

**Root cause:** Base identity or overlays contain CTA language that leaks.

**Fix:**
- Remove CTA language from `base-identity.ts`
- Add explicit anti-CTA instructions to non-closing overlays
- Use response validator to catch violations

### Problem: Constraint Hypothesis Drifts

**Symptom:** Conversation starts detecting STRATEGY, shifts to EXECUTION, then PSYCHOLOGY.

**Root cause:** Each turn re-evaluates without memory of prior hypothesis.

**Fix:** Sticky hypothesis in `decision-engine.ts` - requires +15% confidence to change once established.

### Problem: explore_readiness Doesn't Actually Explore

**Symptom:** Medium readiness triggers `explore_readiness` action but LLM generates closing CTAs.

**Root cause:** Overlay is "soft guidance" that LLM can ignore.

**Fix:**
- Add explicit MUST NOT sections to overlay
- Add "CRITICAL REQUIREMENT" prefix
- Require response ends with question mark

### Problem: Closing Responses Too Long

**Symptom:** `complete_with_handoff` generates 80+ sentence responses with frameworks.

**Fix:** Hard enforcement of 15 sentence max in overlay and response validator.

### Problem: Repetitive Language Patterns

**Symptom:** Every reflection starts with "Okay, that's significant..."

**Fix:** Variety tracker in `response-variety.ts` tracks used phrases and injects guidance to use different ones.

## Editing Prompts

### Overlays (Dynamic Behavior)

Edit overlays in `server/src/orchestrator/core/prompt-builder.ts` in the `loadPromptOverlays()` function.

Key overlays:
- `context_gathering` - Opening phase questions
- `exploration` - General exploration
- `validation` - Testing hypothesis with user
- `diagnosis_delivery` - Sharing the constraint
- `closing_handoff` - Transitioning to next steps
- `explore_readiness` - Medium readiness exploration

### Base Identity (Persona)

Edit `server/src/orchestrator/prompts/base-identity.ts` for:
- Tone and style guidelines
- Language to avoid (jargon, CTAs)
- Response structure (2-3 sentences max)
- How to ask insightful questions

### System Prompt (Alternative Format)

`server/data/system-prompt.txt` contains an XML-format system prompt with:
- Phase definitions
- Tool call requirements
- Consent gates
- Session closure templates

## Workflow for Prompt Changes

1. **Make the change** in relevant file
2. **Run a simulation** to test behavior
3. **Review the log** - check for issues listed above
4. **Create annotated transcript** if needed for stakeholder review
5. **Commit with descriptive message**

## For Danny (Stakeholder)

- `docs/annotated-simulation-david.md` - Shows how orchestrator works turn-by-turn
- `docs/routing-and-offers-for-danny.md` - Architecture overview and routing logic
- To change closing/transition language: Edit `closing_handoff` overlay in `prompt-builder.ts`

## Development Commands

```bash
# Start development servers
npm run dev

# Run TypeScript directly
npx tsx server/src/scripts/[script-name].ts

# Build
npm run build
```

## Environment Variables

Required in `.env`:
- `ANTHROPIC_API_KEY` - For Claude API
- `GOOGLE_API_KEY` - For Gemini (used in unified analysis)
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` - Database
- `RESEND_API_KEY` - Email sending

### Booking Links (CRITICAL for launch)
- `VITE_MIST_BOOKING_LINK` - Booking URL for execution constraint (implementation call)
- `VITE_EC_BOOKING_LINK` - Booking URL for strategy/psychology constraints

### Ontraport CRM Integration
- `ONTRAPORT_API_KEY` - Your Ontraport API key
- `ONTRAPORT_APP_ID` - Your Ontraport Application ID

All assessment data (constraint, summary, scores, recommended path, blockers) is stored in Ontraport's standard `notes` field as formatted text. No custom field setup required in Ontraport.

### Supabase Database
- **Project ref:** `gqelaotedbyvysatnnsx`
- **DB password:** `Zdbre0Txdw3hX7Yo`
- **Direct connection (IPv6 only):** `postgresql://postgres:Zdbre0Txdw3hX7Yo@db.gqelaotedbyvysatnnsx.supabase.co:5432/postgres`
- **Pooler connection (IPv4, used by Render):** `postgresql://postgres.gqelaotedbyvysatnnsx:Zdbre0Txdw3hX7Yo@aws-0-us-west-2.pooler.supabase.com:5432/postgres`
- **Render env var:** `SUPABASE_DB_URL` is set to the pooler connection string above

### YouCanBookMe Webhook (Call Tracking)
- `BOOKING_WEBHOOK_SECRET` - Secret for authenticating webhook requests

Tracks when users actually book a call (not just click the booking link). Mirasee uses YouCanBookMe for scheduling.

**Endpoint:** `POST /api/booking/youcanbook`

**YCBM Setup:**
1. Go to booking page settings > Notifications
2. Select "After a new booking made" trigger
3. Add notification > Select "Webhook"
4. URL: `https://coachmiraadvisor.onrender.com/api/booking/youcanbook`
5. Add header: `X-Webhook-Secret: <your secret>`
6. Payload:
```json
{
  "email": "{EMAIL}",
  "firstName": "{FNAME}",
  "lastName": "{LNAME}",
  "bookingId": "{REF}",
  "bookingDate": "{START-ISO-8601}",
  "duration": "{DURATION}",
  "appointmentType": "{BOOKING-PAGE-TITLE}",
  "phone": "{PHONE}"
}
```

## Database Migrations

Migrations run automatically on every deploy via the Supabase CLI. The Render build command is:

```
npm install && npx supabase db push --db-url "$SUPABASE_DB_URL" && npm run build
```

Migrations run before the app build, so a failed migration fails the deploy (the app won't start with a broken schema).

### Adding a New Migration

1. Create a SQL file in `supabase/migrations/` with a timestamp prefix:
   ```bash
   # Use the CLI to generate the timestamp:
   npx supabase migration new description_of_change
   # Or manually create: supabase/migrations/YYYYMMDDHHMMSS_description.sql
   ```
2. Write your SQL in the file (use `IF NOT EXISTS` / `IF EXISTS` for safety)
3. Commit and push to `main`
4. Render auto-deploys, applies the migration, then builds the app

### Migration File Naming

- Format: `<version>_<description>.sql` where version is a numeric timestamp
- The version prefix (everything before the first `_`) must be **unique** and **sort correctly** against all other migrations
- The Supabase CLI sorts versions numerically, so `20241230` sorts before `20241230001`
- **Do not** use a bare date like `20260203` if you also have `20260203001` — use `20260203000` instead to maintain correct sort order
- When in doubt, use `npx supabase migration new` which generates a 14-digit timestamp (`YYYYMMDDHHmmss`)

### Existing Migration Files

| Version | File | Description |
|---------|------|-------------|
| 20241229 | `20241229_create_orchestrator_logs.sql` | Orchestrator logging tables |
| 20241230000 | `20241230000_reference_spec_alignment.sql` | Reference spec alignment |
| 20241230001 | `20241230001_add_complete_phase.sql` | Add complete phase |
| 20241230002 | `20241230002_add_orchestrator_state.sql` | Add orchestrator state |
| 20250120 | `20250120_storage_rls_policy.sql` | Storage RLS policy |
| 20260129 | `20260129_create_invite_codes.sql` | Invite codes table |
| 20260130 | `20260130_create_split_tests.sql` | Split tests table |
| 20260201 | `20260201_create_email_events.sql` | Email events table |
| 20260202000 | `20260202000_add_resume_email_sent.sql` | Resume email sent flag |
| 20260202001 | `20260202001_add_booking_reminder_sent.sql` | Booking reminder sent flag |

### Troubleshooting Migrations

**"Remote migration versions not found in local migrations directory"**
- A version exists in the remote `supabase_migrations.schema_migrations` table but has no matching local file
- Usually caused by filename sort-order conflicts (e.g., `20241230` vs `20241230001`)
- Fix: rename the file so versions sort correctly, then repair the remote record:
  ```bash
  npx supabase migration repair --status reverted <old_version> --db-url "$SUPABASE_DB_URL"
  npx supabase migration repair --status applied <new_version> --db-url "$SUPABASE_DB_URL"
  ```

**Check migration status:**
```bash
npx supabase migration list --db-url "postgresql://postgres.gqelaotedbyvysatnnsx:Zdbre0Txdw3hX7Yo@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

**IPv6 connection errors from Render:**
- Render's build environment doesn't support IPv6
- The direct Supabase DB host (`db.gqelaotedbyvysatnnsx.supabase.co`) is IPv6-only
- Use the session-mode pooler connection (`aws-0-us-west-2.pooler.supabase.com`) which supports IPv4
- This is already configured in Render's `SUPABASE_DB_URL` env var

## Querying Supabase

The app uses Supabase (not Render Postgres) for its database. Query via the REST API using env vars from `.env`.

**Load env vars** (`.env` has parse issues with `source`, use grep):
```bash
export $(grep -E '^(SUPABASE_URL|SUPABASE_SECRET_KEY)=' .env | xargs)
```

**Example queries:**
```bash
# Count sessions by phase
curl -s "${SUPABASE_URL}/rest/v1/advisor_sessions?select=id&current_phase=eq.complete" \
  -H "apikey: ${SUPABASE_SECRET_KEY}" -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
  -H "Prefer: count=exact" -I 2>/dev/null | grep -i content-range

# Fetch sessions with filters
curl -s "${SUPABASE_URL}/rest/v1/advisor_sessions?select=id,user_name,user_email,total_turns,email_sent,current_phase&total_turns=gte.12&email_sent=eq.false&order=total_turns.desc" \
  -H "apikey: ${SUPABASE_SECRET_KEY}" -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" | python3 -m json.tool

# Check a specific session
curl -s "${SUPABASE_URL}/rest/v1/advisor_sessions?select=*&id=eq.<session-id>" \
  -H "apikey: ${SUPABASE_SECRET_KEY}" -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" | python3 -m json.tool
```

**Common filters:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `is.null`, `not.is.null`

## Render Deployment

### Service Details

- **Service Name:** coachmiraadvisor
- **Service ID:** `srv-d52n77i4d50c73fnsce0`
- **Primary URL:** https://advisor.coachmira.ai
- **Render URL:** https://coachmiraadvisor.onrender.com
- **Workspace:** Ruzuku Devs (`tea-c1ve81u1aaaccqlkfm2g`) — always select this workspace first via `mcp__render__select_workspace` when using Render MCP tools
- **Region:** Virginia
- **Runtime:** Node.js
- **Auto-deploy:** Enabled (triggers on push to `main`)

### Build Configuration

- **Build command:** `npm install; npm run build`
- **Start command:** `npm run start`
- **Build runs:** `npm run build --workspace=client && npm run build --workspace=server`

### Using Render MCP to Debug Deployments

The Render MCP server provides tools to monitor and debug deployments directly from Claude Code.

**1. Select workspace (required first):**
```
mcp__render__list_workspaces     # List available workspaces
mcp__render__select_workspace    # Select "Ruzuku Devs" workspace
```

**2. Check deployment status:**
```
mcp__render__list_services       # List all services
mcp__render__list_deploys        # List recent deploys for a service
mcp__render__get_deploy          # Get details of specific deploy
```

**3. View logs for debugging:**
```
mcp__render__list_logs           # View build/runtime logs
mcp__render__list_log_label_values  # Filter logs by type, level, etc.
```

**4. Monitor performance:**
```
mcp__render__get_metrics         # CPU, memory, HTTP metrics
```

### Common Deployment Issues

| Issue | How to Debug |
|-------|--------------|
| Build failed | Check `list_logs` with `type: ["build"]` for TypeScript/npm errors |
| Runtime crash | Check `list_logs` with `type: ["app"]` for startup errors |
| Slow response | Use `get_metrics` to check CPU/memory usage |
| 502 errors | Check if service is starting, review health check path |

### Deployment Workflow

1. Push to `main` branch - Render auto-triggers build
2. **Don't monitor every deploy** - most deploys succeed without issues
3. Only use Render MCP tools if there's a problem to debug
4. If build fails, use `list_logs` to see errors, fix locally, push again

## Weekly Git Log Summary

When asked for a weekly summary (or any period), run the following workflow:

1. **Pull the git log** for the requested period:
   ```bash
   git log --since="7 days ago" --oneline --no-merges
   ```

2. **Group commits by theme** (not chronologically). Common categories:
   - Conversation & AI improvements
   - Security & infrastructure
   - Email & CRM
   - UI/UX improvements
   - Bug fixes
   - Admin & analytics

3. **Write two versions:**
   - **Technical version** — commit-level detail, file references, useful for dev review
   - **Stakeholder version** — written for non-technical Mirasee business users. Focus on user-facing impact, avoid code/file references, use plain language. Frame changes as benefits ("Users now see..." not "Added component X").

4. **For the stakeholder version**, follow these guidelines:
   - Lead with the most impactful user-facing changes
   - Use categories like "Smarter Conversations", "Security & Reliability", "User Experience"
   - Explain *why* a change matters, not *how* it was implemented
   - Skip purely internal refactors unless they improve reliability
   - End with a brief "Coming Next" section if there are known upcoming items

## Code Style Notes

- TypeScript with ES modules (`.js` extensions in imports)
- Prompts use template literals for readability
- Overlays are stored as strings in a Map
- Keep responses concise - 2-3 sentences in exploration, 6-10 sentences in closing
