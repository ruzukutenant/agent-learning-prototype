# Integration Plan: Orchestrator → Full UX

## Overview

Integrate the orchestration prototype (currently standalone TypeScript) into the full CoachMira Advisor web application (React + Express + Supabase).

**Goal:** Replace prompt-based conversation with orchestration-driven intelligence while maintaining the existing UX flow.

---

## Current Architecture

### Prototype (Standalone)
```
orchestrator-prototype/
├── core/              # Signal detection, state inference, types
├── logic/             # Decision-making, readiness scoring, closing messages
├── conversation/      # Orchestrator (main controller)
└── test/             # Persona tests
```

### Production App
```
client/               # React app (Vite)
├── src/pages/Chat.tsx
├── src/pages/Summary.tsx
└── src/lib/api.ts

server/               # Express API
├── src/routes/
├── src/services/
└── src/index.ts

Database: Supabase
```

---

## Integration Strategy

### Phase 1: Backend Integration (4 hours)

**Move orchestrator into server**

1. **Copy orchestrator code to server** (30 min)
   ```
   server/src/orchestrator/
   ├── core/              # Copy from prototype
   ├── logic/             # Copy from prototype
   ├── conversation/      # Copy from prototype
   └── types.ts          # Shared types
   ```

2. **Create chat API endpoint** (1 hour)

   **File:** `server/src/routes/chat.ts`

   ```typescript
   POST /api/chat/message

   Request:
   {
     sessionId: string
     message: string
   }

   Response:
   {
     advisorResponse: string
     complete: boolean
     state: {
       constraint_hypothesis: string | null
       readiness: {clarity, confidence, capacity}
       phase: string
     }
   }
   ```

   **Implementation:**
   - Load session from database
   - Load conversation history
   - Call `processConversationTurn()` from orchestrator
   - Save new messages to database
   - Update session state
   - Return advisor response

3. **Update database schema** (1 hour)

   **Add to sessions table:**
   ```sql
   ALTER TABLE sessions ADD COLUMN conversation_state JSONB;
   ALTER TABLE sessions ADD COLUMN constraint_hypothesis TEXT;
   ALTER TABLE sessions ADD COLUMN readiness_clarity TEXT;
   ALTER TABLE sessions ADD COLUMN readiness_confidence TEXT;
   ALTER TABLE sessions ADD COLUMN readiness_capacity TEXT;
   ALTER TABLE sessions ADD COLUMN phase TEXT DEFAULT 'context';
   ALTER TABLE sessions ADD COLUMN turns_total INTEGER DEFAULT 0;
   ```

   **Create messages table:**
   ```sql
   CREATE TABLE messages (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     session_id UUID REFERENCES sessions(id),
     role TEXT NOT NULL,  -- 'user' or 'assistant'
     content TEXT NOT NULL,
     turn INTEGER NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

4. **Create session initialization endpoint** (30 min)

   **File:** `server/src/routes/chat.ts`

   ```typescript
   POST /api/chat/start

   Request:
   {
     name: string
   }

   Response:
   {
     sessionId: string
     greeting: string
   }
   ```

   **Implementation:**
   - Create new session in database
   - Initialize conversation state with `initializeState(name)`
   - Return greeting message
   - Save greeting as first assistant message

5. **Add environment variables** (15 min)

   Update `.env`:
   ```
   ANTHROPIC_API_KEY=...
   DATABASE_URL=...
   ```

6. **Test backend endpoints** (45 min)

   Create integration tests:
   - Start session → returns greeting
   - Send message → returns response
   - Complete conversation → marks session complete
   - Load session → retrieves state correctly

---

### Phase 2: Frontend Integration (3 hours)

**Update Chat page to use orchestrator**

1. **Update Chat component** (1.5 hours)

   **File:** `client/src/pages/Chat.tsx`

   **Changes:**
   - Remove old LLM prompt logic
   - Add state management for conversation
   - Call `/api/chat/start` on mount
   - Call `/api/chat/message` when user sends message
   - Display advisor responses
   - Navigate to Summary when `complete: true`

   **State to track:**
   ```typescript
   const [messages, setMessages] = useState<Message[]>([])
   const [sessionId, setSessionId] = useState<string | null>(null)
   const [conversationState, setConversationState] = useState<any>(null)
   const [isLoading, setIsLoading] = useState(false)
   ```

   **Message flow:**
   ```typescript
   // On component mount
   const startSession = async () => {
     const { sessionId, greeting } = await api.startChat(userName)
     setSessionId(sessionId)
     setMessages([{role: 'assistant', content: greeting}])
   }

   // When user sends message
   const sendMessage = async (userMessage: string) => {
     setMessages(prev => [...prev, {role: 'user', content: userMessage}])

     const response = await api.sendChatMessage(sessionId, userMessage)

     setMessages(prev => [...prev, {role: 'assistant', content: response.advisorResponse}])
     setConversationState(response.state)

     if (response.complete) {
       navigate(`/summary/${sessionId}`)
     }
   }
   ```

2. **Update API client** (30 min)

   **File:** `client/src/lib/api.ts`

   Add functions:
   ```typescript
   export async function startChat(name: string): Promise<{sessionId: string, greeting: string}>
   export async function sendChatMessage(sessionId: string, message: string): Promise<ChatResponse>
   ```

3. **Update Summary page** (1 hour)

   **File:** `client/src/pages/Summary.tsx`

   **Changes:**
   - Load session by ID
   - Display constraint_hypothesis
   - Display readiness scores
   - Show recommended endpoint
   - Include email capture (already implemented in Phase 4 plan)

   **Data to display:**
   ```typescript
   const session = await api.getSession(sessionId)

   // Show:
   - session.constraint_hypothesis → "Your core constraint is STRATEGY"
   - session.readiness_clarity → Clarity score
   - session.readiness_confidence → Confidence score
   - session.readiness_capacity → Capacity score
   - Recommended endpoint (calculate from readiness)
   ```

---

### Phase 3: Testing & Validation (2 hours)

1. **Port persona tests to integration tests** (1 hour)

   **File:** `server/test/integration/persona-tests.ts`

   For each persona:
   - Start session via API
   - Send each turn's message via API
   - Validate final diagnosis
   - Validate final endpoint
   - Validate readiness scores

   **Example:**
   ```typescript
   test('Alex persona - Systemic Overwhelm', async () => {
     const { sessionId, greeting } = await startChat('Alex')

     for (const turn of ALEX_PERSONA) {
       const response = await sendMessage(sessionId, turn.userResponse)
       // Validate intermediate state if needed
     }

     const session = await getSession(sessionId)
     expect(session.constraint_hypothesis).toBe('strategy')
     expect(recommendEndpoint(session)).toBe('MIST')
   })
   ```

2. **Manual testing** (30 min)

   Test full flow in browser:
   - Start chat with test name
   - Have conversation as each persona
   - Verify responses make sense
   - Confirm navigation to summary
   - Validate summary displays correctly

3. **Performance testing** (30 min)

   - Check response times (should be < 3 seconds per turn)
   - Ensure no memory leaks
   - Test concurrent sessions
   - Validate database queries are efficient

---

### Phase 4: Polish & Deploy (2 hours)

1. **Error handling** (45 min)

   Add graceful degradation:
   - If Anthropic API fails → retry with exponential backoff
   - If state inference fails → use defaults, continue conversation
   - If database write fails → retry, alert user if persists
   - Display friendly error messages to user

2. **Loading states** (30 min)

   - Show typing indicator while orchestrator processes
   - Disable input while waiting for response
   - Add skeleton loaders for Summary page

3. **Analytics hooks** (30 min)

   Track key events:
   - Session started
   - Containment triggered
   - Diagnosis reached
   - Endpoint recommended
   - Email sent

4. **Deploy** (15 min)

   - Update environment variables on Render
   - Deploy server + client
   - Run smoke tests in production
   - Monitor logs for errors

---

## Migration Checklist

### Before Starting
- [ ] Backup current production database
- [ ] Create feature branch: `feature/orchestrator-integration`
- [ ] Set up local development environment with Supabase

### Backend
- [ ] Copy orchestrator code to server/src/orchestrator/
- [ ] Create chat API routes
- [ ] Update database schema
- [ ] Add environment variables
- [ ] Write integration tests
- [ ] All tests passing

### Frontend
- [ ] Update Chat component
- [ ] Update API client
- [ ] Update Summary page
- [ ] Test locally with all 4 personas
- [ ] Fix any UX issues

### Testing
- [ ] All persona integration tests pass
- [ ] Manual testing complete
- [ ] Performance acceptable (< 3s per turn)
- [ ] Error handling works

### Deploy
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Smoke test staging
- [ ] Deploy to production
- [ ] Monitor for 24 hours

---

## Key Decisions

### 1. State Storage Strategy

**Option A: Store full state as JSONB**
- Pro: Simple, flexible
- Pro: Easy to query conversation state
- Con: Harder to query specific fields

**Option B: Flatten state into columns**
- Pro: Easy SQL queries
- Pro: Better for analytics
- Con: More columns

**Recommendation:** Use Option A (JSONB) for conversation_state, plus key columns (constraint_hypothesis, readiness_*, phase) for filtering.

### 2. Message Streaming

**Current:** Return full response after orchestration completes

**Future consideration:** Stream advisor responses for better UX
- Would require WebSocket or SSE
- Not critical for v1

**Recommendation:** Ship without streaming first, add if needed.

### 3. Conversation History Window

**Current:** Send last 10 messages to state inference

**Question:** Should we send full history or windowed history?

**Recommendation:** Keep 10-message window for state inference (faster, cheaper), but store full history in database for analytics.

### 4. Session Recovery

**Question:** What if user refreshes page mid-conversation?

**Solution:**
- Store sessionId in localStorage
- On Chat page mount, check for existing session
- If found, load messages and continue
- If complete, redirect to Summary

---

## File Structure After Integration

```
server/src/
├── orchestrator/
│   ├── core/
│   │   ├── types.ts
│   │   ├── signal-detector.ts
│   │   └── state-inference.ts
│   ├── logic/
│   │   ├── decision-maker.ts
│   │   ├── readiness-scoring.ts
│   │   └── closing-message.ts
│   └── conversation/
│       └── orchestrator.ts
├── routes/
│   ├── chat.ts          # NEW: Chat endpoints
│   ├── sessions.ts       # Existing session routes
│   └── email.ts         # Existing email routes
├── services/
│   ├── database.ts
│   └── email/resend.ts
└── index.ts

client/src/
├── pages/
│   ├── Chat.tsx         # UPDATED: Use orchestrator API
│   ├── Summary.tsx      # UPDATED: Display orchestrator results
│   └── Admin.tsx
└── lib/
    └── api.ts          # UPDATED: Add chat endpoints

Database:
├── sessions (table)     # UPDATED: Add orchestrator state columns
└── messages (table)     # NEW: Store conversation history
```

---

## Rollout Strategy

### Week 1: Backend Integration
- Day 1-2: Move orchestrator code, create API endpoints
- Day 3: Update database schema, test migrations
- Day 4-5: Write and run integration tests

### Week 2: Frontend Integration
- Day 1-2: Update Chat component
- Day 3: Update Summary page
- Day 4-5: Manual testing, bug fixes

### Week 3: Testing & Deploy
- Day 1-2: Comprehensive testing (all personas)
- Day 3: Polish, error handling
- Day 4: Deploy to staging
- Day 5: Deploy to production, monitor

---

## Success Metrics

**Technical:**
- [ ] All 4 persona tests pass in production
- [ ] Average response time < 3 seconds
- [ ] 0 critical errors in first week
- [ ] Database queries < 100ms

**Product:**
- [ ] Users complete conversations (don't drop off)
- [ ] Correct constraint diagnosis rate > 90%
- [ ] Correct endpoint routing rate > 90%
- [ ] User satisfaction with conversation quality

---

## Risks & Mitigations

**Risk 1: Anthropic API latency/failures**
- Mitigation: Retry logic, exponential backoff, graceful degradation
- Fallback: Store partial state, allow user to continue

**Risk 2: State inference inconsistency in production**
- Mitigation: Log all state inference results for monitoring
- Fallback: Manual review and correction if needed

**Risk 3: Database performance with JSONB queries**
- Mitigation: Index key fields (constraint_hypothesis, phase)
- Fallback: Denormalize if needed

**Risk 4: User refreshes page mid-conversation**
- Mitigation: Store sessionId in localStorage, resume on load
- Fallback: Show "resume conversation" option

---

## Post-Launch

**Monitoring:**
- Track diagnosis accuracy (manual review sample)
- Monitor API latency and error rates
- Watch for conversation abandonment patterns
- Collect user feedback

**Iteration:**
- Add new constraint categories if patterns emerge
- Refine readiness scoring based on real data
- Optimize prompts based on production conversations
- Consider A/B testing different orchestration strategies

**Documentation:**
- Create runbook for common issues
- Document how to add new constraint categories
- Write guide for interpreting orchestrator state
- Build admin tools for reviewing conversations

---

## Estimated Timeline

**Total: 11 hours of focused development**

- Backend Integration: 4 hours
- Frontend Integration: 3 hours
- Testing & Validation: 2 hours
- Polish & Deploy: 2 hours

**Calendar time:** 2-3 weeks with testing and iteration

**Critical path:** Backend → Frontend → Testing → Deploy

---

## Next Steps

1. Review this plan with stakeholders
2. Get approval for database schema changes
3. Set up feature branch and local environment
4. Start with Backend Integration Phase 1
5. Run persona tests after each phase
6. Ship to staging before production

**Philosophy:** Ship incrementally. Get backend working first, then frontend, then polish. Test with personas at each stage to prevent regressions.
