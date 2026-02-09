# End-to-End Test Plan: Recursive Prompting Integration

## Test Objective

Validate that the recursive prompting architecture correctly:
1. Detects user signals and triggers appropriate actions
2. Makes learning visible through UI indicators
3. Builds user expertise through reflection and questioning
4. Reality-checks readiness before recommendations
5. Delivers personalized, learner-centered diagnosis

---

## Test Persona: Sarah Chen

**Background:**
- Leadership coach, 4 years in business
- Niche: Executives in tech transitioning to leadership roles
- Current clients: 8-10 one-on-one, mix of retainer and project-based
- Revenue: ~$120K/year, wants to scale to $200K+
- Located: San Francisco Bay Area

**Business Reality:**
- Has proven expertise and happy clients
- Clear market demand (waitlist of 3-4 potential clients)
- Strong word-of-mouth referrals
- BUT: Feels scattered across too many offerings
- Has 3 different program ideas but can't decide which to build
- Researches "how to scale" but doesn't launch anything
- Starting to burn out from constant one-on-one delivery

**Actual Constraint:** STRATEGY (Offer Clarity)
- She CAN execute (proven by current client success)
- She HAS energy (still excited about the work itself)
- She's UNCLEAR on positioning - which niche segment, which offer format, what to say

**Readiness Profile:**
- Clarity: Will start LOW, reach HIGH through conversation
- Confidence: MEDIUM (knows her stuff, but doubts decisions)
- Capacity: MEDIUM-HIGH (some time available, budget exists)
- Commitment Level: Should reach MEDIUM-HIGH (ready but has some blockers)

**Expected Endpoint:** EC (Expert Call for Strategy)
- High clarity + High confidence + Medium capacity = EC recommendation
- Should NOT recommend MIST (she can execute)
- Should NOT send to NURTURE (she's ready to act)

---

## Test Flow: Expected Conversation Journey

### Phase 1: CONTEXT (Turns 1-4)

**Turn 1: Opening**
```
Advisor: "Hey Sarah! I'm here to help you identify what's really holding your business back. Let's start: Tell me about your coaching business - who do you work with and what do you help them with?"

Sarah: "I work with tech executives who are new to leadership - first-time VPs, directors stepping into bigger roles. I help them navigate the transition from being an individual contributor to leading teams."
```

**Expected State:**
- Phase: context
- Signals: clarity_level = medium (clear on what she does)
- Action: explore (continue context gathering)

**Turn 2: Scale & Model**
```
Advisor: "Got it, so you help first-time tech leaders with the IC-to-manager transition. Tell me more about the business itself - how many clients are you working with? Is it one-on-one, group programs, a mix?"

Sarah: "Right now it's mostly one-on-one, 8-10 clients at a time. Mix of monthly retainers and 3-month project work. I've been thinking about doing a group program but haven't launched anything yet."
```

**Expected State:**
- Signals: capacity_signals detected ("thinking about but haven't launched")
- First hint of execution hesitation vs. strategy confusion
- Action: explore

**Turn 3: Trajectory & Acquisition**
```
Advisor: "And how are most of your clients finding you? What's your main source of leads?"

Sarah: "Honestly, it's all word-of-mouth. I have a waitlist of 3-4 people right now, which is great, but I feel like I should be building something more scalable. I just... I'm not sure what that looks like yet."
```

**Expected State:**
- Signals: contradiction_detected ("waitlist" + "not sure what to build")
- emotional_markers: "I just..." (hesitation)
- Phase should transition to exploration after Turn 4

### Phase 2: EXPLORATION (Turns 5-10)

**Turn 5: Pattern Emerging**
```
Sarah: "I've been researching different models - group coaching, online courses, a mastermind. I could do any of them technically, I have the expertise. But I keep spinning on which one is the 'right' choice. What if I pick the wrong one and waste 6 months building something nobody wants?"
```

**Expected State:**
- ⭐ KEY SIGNAL: contradiction_present ("could do any of them" + "keep spinning on which one")
- constraint_hypothesis: strategy (forming, confidence ~0.6)
- Signals: emotional_charge = moderate ("waste 6 months", "what if")
- Decision: **surface_contradiction**

**Expected UI:**
- No badge yet (hypothesis still forming)
- Progress: ~40% (6 turns, "Discovering" stage)

**Turn 6: Surface Contradiction (ACTION)**
```
Advisor: "I'm curious about something. You just said you could do any of these - group coaching, courses, mastermind - you have the expertise and skills. But you also said you keep spinning on which one to choose. I'm hearing both confidence about execution AND confusion about direction. Help me understand - what's clear and what's still foggy for you?"

Sarah: "That's exactly it. I know HOW to deliver great coaching. I'm not stuck on the doing part. I'm stuck on... who am I even serving? Like, am I for first-time VPs specifically? Or all tech leaders? And should I focus on the career transition piece, or the actual leadership skills? It feels like I'm trying to serve everyone and I don't know what I actually stand for."
```

**Expected State:**
- ⭐ INSIGHT ARTICULATED: "I'm not stuck on the doing part, I'm stuck on who am I serving"
- constraint_hypothesis: strategy (confidence now ~0.8)
- sub_dimension: "positioning" or "offer_clarity"
- Signals: insight_articulated = true, breakthrough_language = ["That's exactly it"]
- Decision: **reflect_insight**

**Expected UI:**
- 🎖️ LearningBadge appears: "Key Insight"
- InsightPanel populates: "I'm not stuck on the doing part, I'm stuck on who I'm serving"
- Progress: ~50% (7 turns, transitioning to "Discovering" stage)

**Turn 7: Reflect Insight (ACTION)**
```
Advisor: "Okay, pause for a second. You just said something really important: 'I'm not stuck on the doing part, I'm stuck on who I'm serving.' That's a completely different problem than what you started with. Five minutes ago you were talking about not knowing which program format to build, and now you're seeing that the real issue is clarity on positioning - who you serve and what you stand for. Do you see that shift? That's not a small thing - you just identified the actual constraint."

Sarah: "Yes! Oh my god, yes. I've been so focused on 'what should I build' that I didn't see I don't even know WHO I'm building it for. That's why every option feels both right and wrong - because I haven't decided on my positioning first."
```

**Expected State:**
- ⭐ MILESTONE: Learning milestone count += 1
- learner_state.hypothesis_co_created = true (she's building it herself)
- Signals: breakthrough_language = ["Yes! Oh my god, yes", "That's why"]
- hypothesis_validated = false (not yet asked directly)

**Expected UI:**
- Progress jumps to "Testing" stage
- Milestone count: 1 (shown in PhaseHeader)

**Turn 8-9: Deepening Understanding**
```
Advisor: "So when you think about your best clients - the ones where the work feels most alive and impactful - what's different about them? What do they have in common?"

Sarah: "They're all in hypergrowth startups, actually. The ones who got promoted because the company scaled fast and suddenly they're managing 20 people when six months ago they managed nobody. They're drowning in people problems while trying to keep up with product delivery. That's when they find me - when they're about to break."
```

**Expected State:**
- constraint_hypothesis: strategy = strong (confidence 0.85+)
- sub_dimension: positioning clarity
- Getting very specific
- Decision: build_criteria OR validate

### Phase 3: VALIDATION & TESTING (Turns 10-13)

**Turn 10: Validation**
```
Advisor: "I'm noticing a clear pattern here. You're not stuck on execution - you've proven you can deliver great coaching. And this doesn't sound like burnout - you still light up talking about the work. What I'm hearing is that you're stuck on direction: specifically, who you're positioned to serve and what makes your offer unique for them. The research paralysis, the spinning on program formats - those are symptoms of not being clear on your positioning first. Does that land for you?"

Sarah: "Yes. That's it exactly. I've been trying to solve a tactical problem - which program to build - when the real problem is strategic - who am I for and what do I say that makes them choose me?"
```

**Expected State:**
- hypothesis_validated = true (she confirms in her own words)
- validation_needed = false
- Decision: **stress_test** (next turn will reality-check)

**Turn 11: Stress Test (ACTION)**
```
Advisor: "Good. Now I want you to stress-test that with me before we commit to it. If you were going to argue against this diagnosis - if you were going to say 'No, that's not quite it' - what would you say? Where does this explanation fall apart?"

Sarah: "Hmm. I mean, there's definitely overwhelm too - like I AM doing everything myself, I don't have any team support. But you're right that building a team doesn't make sense if I don't know what I'm building it FOR. So no, I think the diagnosis holds. The positioning clarity has to come first."
```

**Expected State:**
- ⭐ STRESS TEST PASSED
- learner_state.stress_test_passed = true
- Signals: stress_test_passed = true ("I think the diagnosis holds")
- Decision: **pre_commitment_check**

**Expected UI:**
- Badge: "Reality Check" badge appears
- Progress: ~75% (11-12 turns, "Testing" stage nearly complete)

**Turn 12: Pre-Commitment Check (ACTION)**
```
Advisor: "Okay, so we've identified that your core constraint is clarity on positioning - who you serve and what makes you different. Before I tell you what I think the path forward is, I want to check something: if we identified the right solution today, what's your actual capacity to work on this right now? What's going on in your business and life that might make this hard to prioritize?"

Sarah: "Honestly, I have bandwidth. I'm not taking on new clients until I figure this out, so I actually have more time than usual. The blocker is more... I'm nervous about committing to a niche and 'losing' potential clients. Like what if I narrow down and I pick wrong?"
```

**Expected State:**
- Signals: blocker_mentioned = true ("nervous about committing")
- readiness_check.identified_blockers = ["Fear of choosing wrong niche"]
- Capacity = HIGH (she has time)
- Confidence = MEDIUM (still some doubt)
- Decision: continue pre_commitment or move to diagnose

**Turn 13: Commitment Level Assessment**
```
Advisor: "Okay, I hear that fear - that's real. And honestly, on a scale of 1-10, how ready do you feel to actually do something about this? Not 'should' or 'eventually', but really move forward?"

Sarah: "I'd say... 7 or 8. I'm definitely ready, I just need guidance on how to make that decision without it being a total guess."
```

**Expected State:**
- readiness_check.commitment_level = "high" (7-8 out of 10)
- readiness_check.ready_for_booking = true
- Decision: **diagnose** (all criteria met)

**Turn 14: Diagnosis & Closing**
```
Advisor: [Orchestrator generates closing message with EC recommendation]

Expected closing:
- Constraint: STRATEGY (Offer Clarity Gap)
- Summary: Focus on hypergrowth tech companies, first-time leaders drowning in people problems
- Readiness: High clarity, Medium-High confidence, High capacity
- Recommendation: EC (Expert Call) - strategic positioning session
- Why EC not MIST: She can execute; needs strategy clarity
- Acknowledge blocker: "I hear your fear about choosing wrong - that's exactly what we'll work through"
```

**Expected State:**
- Phase: complete
- Constraint identified and validated
- User navigates to Summary page

### Phase 4: SUMMARY PAGE

**Expected Summary Display:**

1. **Learning Narrative** (if backend extended):
   - Shows 2-3 key insights Sarah articulated
   - Her quote: "I'm not stuck on the doing part..."
   - Timeline showing her discovery journey

2. **Constraint Card:**
   - "Your Primary Constraint: Offer Clarity Gap"
   - Summary in her language about positioning confusion
   - Evidence from her words

3. **Readiness Profile:**
   - Clarity: HIGH
   - Confidence: MEDIUM-HIGH
   - Capacity: HIGH

4. **Personalized CTA:**
   - "Schedule Your Expert Call"
   - Pre-call prep: "Before we talk, start noticing: which client conversations give you the most energy?"
   - Acknowledge blocker: "We'll work through the 'what if I choose wrong' fear together"

5. **Next Steps:**
   - Primary: Book EC call
   - Alternative: Download positioning framework (if NURTURE selected)
   - Email capture (if not already provided)

---

## Test Scenarios & Expected Behaviors

### Scenario A: Happy Path (Described Above)
- ✅ Constraint correctly identified (STRATEGY)
- ✅ Insights reflected back
- ✅ Contradictions surfaced
- ✅ Stress test passed
- ✅ Readiness checked
- ✅ EC recommended
- ✅ UI indicators appear (badges, stages, insights panel)

### Scenario B: Overwhelm Detected

**Trigger Point:** Turn 7, Sarah responds with very long, scattered message showing multiple emotional markers

**Expected:**
- Decision: **contain**
- Containment overlay activates
- Advisor pauses exploration, validates feelings
- Simplifies focus to ONE thing
- No new concepts introduced
- Progress bar color/stage doesn't advance (staying safe)

**Recovery:**
- After 1-2 containment turns, emotional_charge reduces
- Resume exploration when state.turns_since_containment >= 2

### Scenario C: Hypothesis Redirect (Cross-Mapping)

**If Sarah said:** "I have the positioning clarity, I just can't get myself to launch. Every time I'm about to go live with something, I find another thing to fix."

**Expected:**
- Initial hypothesis: STRATEGY
- Signals show: knows what to build, just won't launch
- cross_map detects: execution (fear/avoidance), not strategy
- Decision: **cross_map**
- Advisor gently redirects: "I'm wondering if..."

### Scenario D: Low Commitment Level

**If Sarah said:** "Honestly I'm at like a 3 or 4 out of 10. I have a lot going on right now and I'm not sure I can prioritize this."

**Expected:**
- readiness_check.commitment_level = "low"
- readiness_check.ready_for_booking = false
- Closing message adjusts: "I hear you're at a 3 - timing might not be right yet"
- Recommendation: NURTURE path
- Alternative resources offered
- No pressure to book

### Scenario E: No Clear Insight Moments

**If conversation progresses without breakthrough moments:**

**Expected:**
- No learning badges appear
- Insights panel stays empty
- Progress bar uses turn-based calculation (no milestone boosts)
- Diagnosis still happens (doesn't require insights to complete)
- Summary shows standard constraint card without learning narrative

---

## Technical Validation Checklist

### Backend (Orchestrator)

- [ ] **Signal Detection**
  - [ ] insight_articulated detected when user articulates realization
  - [ ] breakthrough_language array populated with actual phrases
  - [ ] contradiction_present detected for internal contradictions
  - [ ] stress_test_passed detected when hypothesis survives challenge
  - [ ] commitment_language detected ("I'm ready", numbers on 1-10 scale)
  - [ ] blocker_mentioned detected

- [ ] **Decision Priority**
  - [ ] Containment triggers first (if overwhelm)
  - [ ] Reflect insight triggers on breakthrough (priority 2)
  - [ ] Surface contradiction triggers on tensions (priority 3)
  - [ ] Build criteria triggers before finalization (priority 4)
  - [ ] Stress test triggers after validation (priority 5)
  - [ ] Pre-commitment check triggers before diagnosis (priority 6)
  - [ ] Diagnosis only after stress test passed OR 15+ turns

- [ ] **State Tracking**
  - [ ] learner_state.insights_articulated populates
  - [ ] learner_state.learning_milestones increments
  - [ ] learner_state.hypothesis_co_created = true when user builds it
  - [ ] learner_state.stress_test_passed = true
  - [ ] readiness_check.commitment_level calculated correctly
  - [ ] readiness_check.identified_blockers array populates

- [ ] **Prompt Overlays**
  - [ ] reflect_insight overlay loads and uses user's exact words
  - [ ] surface_contradiction overlay uses "I'm noticing..." language
  - [ ] stress_test overlay invites counter-evidence
  - [ ] pre_commitment overlay asks 1-10 scale question
  - [ ] build_criteria overlay asks "what does success look like?"

### Frontend (UI)

- [ ] **PhaseHeader**
  - [ ] Learning stages appear: Exploring → Discovering → Testing → Ready
  - [ ] Stage colors change correctly (blue → teal → amber → emerald)
  - [ ] Milestone count displays when > 0
  - [ ] Progress bar fills based on stage + turn count

- [ ] **Learning Badges**
  - [ ] "Key Insight" badge (amber) appears on insight reflection
  - [ ] "Breakthrough" badge (emerald) appears on milestones
  - [ ] "Exploring Tension" badge (purple) appears on contradiction surfacing
  - [ ] "Reality Check" badge (orange) appears on stress test
  - [ ] Animations work (fade-in, zoom-in)

- [ ] **Insight Panel**
  - [ ] Panel appears when insights.length > 0
  - [ ] Insights display in chronological order
  - [ ] Turn numbers shown for each insight
  - [ ] Expandable/collapsible works
  - [ ] Timeline connectors render

- [ ] **Message Styling**
  - [ ] Insight messages have amber left border
  - [ ] Badges appear above advisor messages
  - [ ] ReactMarkdown renders correctly

- [ ] **Summary Page**
  - [ ] LearningNarrative displays user insights (when backend extended)
  - [ ] Constraint card shows co-created understanding
  - [ ] Next steps are personalized based on readiness

### Data Flow

- [ ] **API Response**
  - [ ] OrchestratorResult includes state.learner_state (when extended)
  - [ ] OrchestratorResult includes state.readiness_check
  - [ ] state.last_action passed to determine badge type
  - [ ] Frontend receives and updates UI accordingly

---

## Regression Testing

Ensure existing functionality still works:

- [ ] Context phase still gathers background (Turns 1-4)
- [ ] Exploration phase still identifies patterns
- [ ] Validation still happens before diagnosis
- [ ] Diagnosis phase still completes conversation
- [ ] Summary page still loads
- [ ] Email capture still works
- [ ] EC/MIST/NURTURE selection still functional
- [ ] Analytics tracking still fires
- [ ] Voice mode still works (parallel path)

---

## Performance Benchmarks

- [ ] Signal detection (LLM call) completes in < 2 seconds
- [ ] State inference (LLM call) completes in < 3 seconds
- [ ] Decision engine (code) executes in < 100ms
- [ ] Frontend renders new components without lag
- [ ] No memory leaks from insight tracking
- [ ] Page load time remains < 2 seconds

---

## Edge Cases

### 1. User Gives One-Word Answers

**Test:** User responds "Yes", "No", "Sure" repeatedly

**Expected:**
- Signals: response_length < 20
- Decision: deepen (ask for more specificity)
- Advisor: "Walk me through what that looks like..."
- No insights detected (not enough content)

### 2. User is Highly Experienced (Expert Level)

**Test:** User speaks with clear understanding from Turn 1

**Expected:**
- Faster progression to "Testing" stage
- hypothesis_co_created = true early
- expertise_level = 'expert' quickly
- Diagnosis happens faster (10-12 turns instead of 15)

### 3. User Disagrees with Hypothesis

**Test:** During stress test, user says "Actually no, that's not quite right"

**Expected:**
- stress_test_passed = false
- Decision: back to exploration or deepen
- Hypothesis adjusted based on feedback
- No diagnosis until new hypothesis validated + stress tested

### 4. Multiple Constraints Present

**Test:** Sarah shows both strategy AND energy signals

**Expected:**
- Cross-mapping detects upstream constraint
- Focuses on root cause (likely strategy in this case)
- Acknowledges symptoms without getting distracted
- Decision: cross_map triggers

### 5. Very High or Very Low Commitment

**High (10/10):** "I'm completely ready, let's do this now"
- readiness_check.commitment_level = "high"
- readiness_check.ready_for_booking = true
- Strong EC push

**Low (1-2/10):** "I'm just exploring, not ready to commit"
- readiness_check.commitment_level = "low"
- readiness_check.ready_for_booking = false
- Graceful NURTURE path
- No pressure tactics

---

## Success Criteria

Test is considered **PASSED** if:

1. ✅ All 14 turns lead to correct STRATEGY diagnosis
2. ✅ At least 2 insights captured and displayed
3. ✅ Learner journey visible through UI (badges, stages, panel)
4. ✅ Stress test successfully challenges hypothesis
5. ✅ Pre-commitment check surfaces blocker (fear of choosing wrong)
6. ✅ Readiness assessed as HIGH commitment
7. ✅ EC recommendation made (not MIST or NURTURE)
8. ✅ Summary page shows personalized content
9. ✅ No TypeScript errors
10. ✅ No runtime errors in browser console
11. ✅ All animations smooth (no jank)
12. ✅ State persists correctly through conversation

---

## Test Execution Steps

1. **Setup:**
   - Ensure server running with latest code
   - Clear browser cache and local storage
   - Open browser dev tools (check console for errors)
   - Start new session

2. **Execute:**
   - Play Sarah's role, responding as documented
   - Take screenshots at key moments (badges appearing, stage changes)
   - Monitor console for errors
   - Check network tab for API responses

3. **Verify:**
   - Check each checkpoint in conversation flow
   - Validate UI changes happen as expected
   - Inspect state in React DevTools
   - Review final summary page

4. **Document:**
   - Note any deviations from expected behavior
   - Screenshot any visual issues
   - Log console errors
   - Record actual vs. expected at each decision point

---

## Additional Test Personas (Quick Validation)

### Persona 2: Marcus - EXECUTION Constraint
- Knows exactly what to offer (group mastermind for B2B founders)
- Has positioning clarity
- BUT: Won't launch - perfectionism, fear of visibility
- Expected: Execution diagnosis, MIST recommendation (needs support)

### Persona 3: Jennifer - ENERGY Constraint
- Clear offer, actively selling
- BUT: Burned out, disconnected, running on empty
- Over-giving, no boundaries
- Expected: Energy diagnosis, either EC or MIST depending on capacity

---

## Notes for Manual Testing

- **Patience:** Take time with responses - this is about quality conversation
- **Authenticity:** Play the persona realistically - real hesitations, real fears
- **Observation:** Watch for UI changes - are they subtle but noticeable?
- **Feeling:** Does the conversation FEEL different? More collaborative? Learner-centered?
- **Value:** At the end, would Sarah feel like she discovered this herself?

---

## Automated Testing (Future)

Potential areas for automation:
- Signal detection unit tests (various input strings)
- Decision priority logic (mock states)
- State tracking updates
- Component rendering tests
- API response validation

For now: Manual E2E testing is most valuable for validating the conversational flow.
