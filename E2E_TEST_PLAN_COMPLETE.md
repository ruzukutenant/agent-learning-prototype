# End-to-End Test Plan: Complete Recursive Prompting Integration

**Date:** 2026-01-01
**Branch:** `feat/recursive-prompting-integration`
**Test Type:** Manual E2E with realistic persona
**Purpose:** Validate complete system including all bug fixes and Phase 5-7 features

---

## Test Persona: Marcus Chen

### Background
- **Name:** Marcus Chen
- **Business:** Executive coaching for mid-level managers
- **Stage:** 3 years in business, inconsistent revenue ($60-90K/year)
- **Surface challenge:** "I have clients, but I can't seem to grow beyond a certain point"
- **Actual constraint:** Strategy (unclear positioning, serving too broad an audience)
- **Commitment level:** High (ready to invest in solution)
- **Capacity level:** Medium (not mentioned as low)

### Expected Routing (EC vs MIST)
**Marcus should route to EC (Expert Strategist), NOT MIST:**
- **EC Routing Logic:** Strategy/Energy constraints OR Execution + high capacity
- **MIST Routing Logic:** Execution constraint + low capacity ONLY
- **Marcus has:** Strategy constraint → EC Strategist
- **Commitment level:** Affects language/urgency of CTA, NOT which service

### Why This Persona?
- **Realistic:** Common scenario for consultants/coaches
- **Tests strategy constraint:** Most common type
- **Clear learning journey:** Will have multiple insights
- **High commitment:** Should trigger EC booking CTA
- **Stress-testable hypothesis:** Can validate against alternatives

### Expected Conversation Trajectory
1. **Context** (Turns 1-4): Establish business, gather symptoms
2. **Exploration** (Turns 5-8): Surface insights about positioning
3. **Discovery** (Turns 9-11): Co-create hypothesis, stress test
4. **Commitment** (Turn 12): Pre-commitment check
5. **Diagnosis** (Turn 13): Recommend EC, personalized CTA

---

## Test Script: Turn-by-Turn

### Turn 1: Initial Context
**User (Marcus):**
> "Hi, I'm Marcus. I run an executive coaching practice focused on helping mid-level managers become better leaders. I've been doing this for about 3 years now. My challenge is that I seem to have hit a ceiling around $70-80K per year, and I can't figure out how to break through."

**Expected Behavior:**
- Action: `explore`
- Expertise: `novice`
- Learning milestones: 0
- No badges displayed yet

**Validation:**
- [ ] Response asks about who he serves
- [ ] Warm, conversational tone
- [ ] No containment (no overwhelm)

---

### Turn 2: Audience Description
**User (Marcus):**
> "I work with managers across different industries - tech, healthcare, finance. Mostly people who've been promoted to management for the first time and are struggling with the transition. Ages range from late 20s to early 40s."

**Expected Behavior:**
- Action: `explore` or `deepen`
- Gathering more context
- Building hypothesis (strategy constraint emerging)

**Validation:**
- [ ] Response probes into specificity
- [ ] Asks about positioning or differentiation
- [ ] No badges yet

---

### Turn 3: Revenue Model
**User (Marcus):**
> "I do 1:1 coaching mostly, some group workshops. Packages range from $2K to $8K depending on length. I get most clients through referrals and some LinkedIn outreach."

**Expected Behavior:**
- Action: `deepen` or first `reflect_insight`
- Hypothesis forming: strategy constraint (too broad)

**Validation:**
- [ ] Response might surface the breadth issue
- [ ] Asks about conversion or ideal client
- [ ] Possible insight badge if breakthrough language detected

---

### Turn 4: First Tension
**User (Marcus):**
> "Honestly, I feel like I'm just guessing when I talk to potential clients. Like, I know I can help them, but I don't have a clear... I don't know, framework? It feels like I'm reinventing the wheel every time."

**Expected Behavior:**
- Action: `reflect_insight` (FIRST INSIGHT)
- **BUG #2 TEST:** Should NOT trigger containment (positive emotion + clarity moment)
- Learning milestones: 1
- Expertise: `developing`

**Validation:**
- [ ] **CRITICAL:** No containment triggered (this is positive emotion, not overwhelm)
- [ ] Badge appears: "Key Insight"
- [ ] Insight captured: "I'm just guessing"
- [ ] Response mirrors back the realization
- [ ] Expertise upgraded to `developing`

---

### Turn 5: Digging Deeper
**User (Marcus):**
> "Right. I mean, I market myself as helping 'new managers' but that could be anyone. A new manager in tech has completely different challenges than one in healthcare."

**Expected Behavior:**
- Action: `deepen` or `reflect_insight`
- Hypothesis strengthening: strategy constraint
- Possible second insight

**Validation:**
- [ ] Response validates the realization
- [ ] Asks about specificity or niche focus
- [ ] Possible second badge if insight articulated

---

### Turn 6: Breakthrough Moment #1
**User (Marcus):**
> "Oh wait. I just realized something. I don't know who I'm building my programs FOR. I keep trying to create content and frameworks, but I haven't actually decided on my ideal client first. That's backwards!"

**Expected Behavior:**
- Action: `reflect_insight` (SECOND INSIGHT)
- Learning milestones: 2
- **BUG #6 TEST:** Meta-cognition detected ("I just realized... that's backwards")
- Expertise: `expert` (immediate upgrade)

**Validation:**
- [ ] **CRITICAL:** Meta-cognition signal detected
- [ ] **CRITICAL:** Expertise immediately upgraded to `expert`
- [ ] Badge appears: "Key Insight"
- [ ] Insight captured: "I don't know who I'm building FOR"
- [ ] Response celebrates the realization
- [ ] Possible hypothesis co-creation flag set

---

### Turn 7: Exploring the Hypothesis
**User (Marcus):**
> "So I think my problem is I'm trying to serve everyone, which means I'm not really positioned for anyone specifically. Is that a strategy issue?"

**Expected Behavior:**
- Action: `validate` or `reflect_insight`
- Hypothesis forming: strategy constraint
- hypothesis_co_created: true (user articulated it themselves)

**Validation:**
- [ ] **BUG #5 TEST:** Insight "trying to serve everyone" captured
- [ ] Response validates hypothesis
- [ ] Asks for confirmation or counter-evidence
- [ ] hypothesis_co_created flag set

---

### Turn 8: Hypothesis Validation
**User (Marcus):**
> "Yeah, that makes total sense. When I think about my most successful clients - the ones who got the best results and referred others - they were all tech managers. First-time engineering managers specifically."

**Expected Behavior:**
- Action: `validate`
- hypothesis_validated: true
- Clear hypothesis: strategy constraint (positioning too broad)

**Validation:**
- [ ] Response confirms hypothesis
- [ ] Captures evidence (tech managers, engineering specifically)
- [ ] Prepares for stress test

---

### Turn 9: Stress Test Setup
**User (Marcus):**
> "But wait, if I narrow down to just engineering managers, won't I lose potential clients? What about the healthcare managers or finance managers I've worked with?"

**Expected Behavior:**
- Action: `stress_test`
- Testing hypothesis against reality
- stress_test_completed: true

**Validation:**
- [ ] Response frames this as a good test
- [ ] Asks Marcus to evaluate: does his current broad approach work?
- [ ] No defensive response - welcomes the challenge

---

### Turn 10: Stress Test Pass
**User (Marcus):**
> "Actually, you're right. My 'broad' approach hasn't gotten me past $80K in 3 years. And my best clients - the ones who paid more and referred others - were the specific ones. So narrowing down is probably less risky than staying broad and stuck."

**Expected Behavior:**
- **BUG #5 TEST:** Stress test passed
- stress_test_passed: true
- stress_test_completed: true
- Expertise: `expert` (if not already from meta-cognition)

**Validation:**
- [ ] **CRITICAL:** stress_test_passed flag set to true
- [ ] stress_test_completed flag set to true
- [ ] Response acknowledges the validation
- [ ] Prepares for diagnosis

---

### Turn 11: Commitment Signals
**User (Marcus):**
> "I'm excited about this clarity. I can already see how I'd redo my LinkedIn profile, my website, my pitch. This feels like the breakthrough I needed."

**Expected Behavior:**
- **BUG #1 TEST:** Action should be `pre_commitment_check`, NOT `diagnose`
- **BUG #2 TEST:** Should NOT trigger containment ("excited" is positive emotion)
- **BUG #3 TEST:** commitment_level should update to `high`
- readiness_check.commitment_level: `high`

**Validation:**
- [ ] **CRITICAL:** Action is `pre_commitment_check` (not diagnose)
- [ ] **CRITICAL:** No containment triggered
- [ ] **CRITICAL:** commitment_level updates to `high`
- [ ] pre_commitment_checked flag set to true
- [ ] Response asks about blockers or readiness
- [ ] ready_for_booking: true

---

### Turn 12: No Blockers
**User (Marcus):**
> "No major blockers. I have the time and budget to work on this. I just need guidance on HOW to make this strategic shift without losing momentum."

**Expected Behavior:**
- Action: `diagnose` (NOW it can trigger, after pre_commitment)
- Diagnosis: Strategy constraint
- Recommendation: EC (Expert Catalyst)

**Validation:**
- [ ] **CRITICAL:** Action is `diagnose` (diagnosis gate finally opens)
- [ ] Diagnosis confirms: Strategy constraint
- [ ] Response recommends Expert Catalyst
- [ ] Conversation marked as complete
- [ ] Prepares for summary page

---

## Summary Page Validation

### State Expected at Summary
```javascript
{
  constraint_category: 'strategy',
  constraint_summary: 'Positioning too broad, unclear ideal client',

  learner_state: {
    insights_articulated: [
      "I'm just guessing",
      "I don't know who I'm building FOR",
      "trying to serve everyone"
    ],
    learning_milestones: 3,
    expertise_level: 'expert',
    hypothesis_co_created: true,
    stress_test_passed: true,
    contradictions_surfaced: 0
  },

  readiness_check: {
    stress_test_completed: true,
    commitment_level: 'high',
    identified_blockers: [],
    ready_for_booking: true
  }
}
```

### Component Rendering Checks

#### 1. LearningNarrative Component
**Should Display:**
- [ ] "What You Discovered" heading
- [ ] 3 insights listed
- [ ] Emphasizes "Together we identified..."
- [ ] Shows learning progression

#### 2. ConstraintCard Component
**Should Display:**
- [ ] Strategy constraint badge
- [ ] Custom summary with positioning language
- [ ] Marcus's evidence (tech managers success)

#### 3. PortableFramework Component
**Should Display:**
- [ ] "Your Strategy Constraint Framework" title
- [ ] Marcus's 3 key realizations
- [ ] 4 weekly assessment questions
- [ ] 4 signals for slipping back
- [ ] 4-step 30-day action plan
- [ ] Download button functional

#### 4. PersonalizedCTA Component (High Commitment)
**Should Display:**
- [ ] "You're Ready: Book Your Strategy Call" heading
- [ ] Direct EC booking link
- [ ] Pre-call prep prompts:
  - "What would success look like 90 days from now?"
  - "What have you already tried to solve this strategy constraint?"
  - "What's the cost of staying stuck for another 6 months?"
- [ ] No blockers acknowledged (none identified)

**Should NOT Display:**
- [ ] MIST option (Marcus needs strategy, not implementation)
- [ ] Nurture track (commitment is high)
- [ ] AlternativePath component

#### 5. EmailCapture Component
**Should Display:**
- [ ] Email input field
- [ ] Submit button
- [ ] Promise of summary email

---

## Bug Fix Validation Checklist

### Bug #1: Pre-Commitment Check Catch-22
- [ ] Turn 11: pre_commitment_check fires (not diagnose)
- [ ] Turn 12: diagnose fires (after pre_commitment)
- [ ] Decision engine respects pre_commitment_checked gate

### Bug #2: Containment Over-Triggers
- [ ] Turn 4: "I'm just guessing" does NOT trigger containment
- [ ] Turn 11: "I'm excited" does NOT trigger containment
- [ ] Only actual overwhelm triggers containment

### Bug #3: Commitment Level Never Updates
- [ ] Turn 11: commitment_level updates to 'high'
- [ ] Summary page: Shows high-commitment CTA
- [ ] ready_for_booking: true

### Bug #4: build_criteria Never Triggers
- [ ] If Marcus articulates criteria ("Success would mean..."), flag sets
- [ ] shared_criteria_established: true by end

### Bug #5: Insights Not Always Captured
- [ ] All 3 insights captured in insights_articulated array
- [ ] Insights persist after reflect_insight stops triggering
- [ ] Summary shows all insights

### Bug #6: No Meta-Cognition Detection
- [ ] Turn 6: "I just realized... that's backwards" detected
- [ ] Expertise immediately upgraded to 'expert'
- [ ] Meta-cognition signal logged

---

## Phase 5-7 Feature Validation

### Frontend Components
- [ ] PersonalizedCTA renders with correct variant (high)
- [ ] PortableFramework shows strategy-specific content
- [ ] LearningNarrative displays journey correctly
- [ ] All lucide-react icons load

### Landing Page Copy
- [ ] Headline: "Discover What's Really Holding Your Business Back"
- [ ] Subhead mentions: "build clarity you can actually act on"
- [ ] Value props: "Guided discovery", "Build real clarity", "Know your next step"

### API Integration
- [ ] OrchestratorResult includes learner_state
- [ ] OrchestratorResult includes readiness_check
- [ ] conversation_state accessible in frontend

---

## Additional Test Scenarios

### Scenario 2: MIST Routing Test (Sarah - Execution + Low Capacity)
**Profile:** Execution constraint with low capacity

**Modified Constraint Discovery:**
- Turn 7: "My problem is I know WHAT to do, I just can't find time to execute it"
- Turn 8: "I'm completely swamped with client delivery, no time to build my website"
- Turn 11: "I'm excited about this clarity, but honestly I don't have bandwidth to build this myself"

**Expected State:**
- constraint_category: 'execution'
- capacity_score: < 5 (low)
- capacityLevel: 'low'
- commitment_level: 'high'

**Expected CTA:**
- **Should route to MIST (Implementation Services), NOT EC**
- Heading: "Ready to Get It Built?"
- Language: "would it help to have an expert team who could assist you in building this out?"
- Button: "Book Your Implementation Call"
- Pre-call prep: "What specifically do you need built? (website, funnel, course, etc.)"

---

### Scenario 3: Medium Commitment User (Rachel)
**Profile:** Strategy constraint, medium commitment

**Turn 11 Alternative:**
> "This makes sense, but I'm worried about time. I'm already stretched thin with current clients."

**Expected:**
- constraint_category: 'strategy'
- commitment_level: 'medium'
- identified_blockers: ["worried about time", "stretched thin"]
- Summary shows: PersonalizedCTA with medium variant (EC strategist, softer language)

---

### Scenario 4: Low Commitment User (Alex)
**Profile:** Needs resources first

**Turn 11 Alternative:**
> "I see the constraint, but I'm not ready to invest in coaching right now. Just trying to figure things out on my own first."

**Expected:**
- commitment_level: 'low'
- identified_blockers: ["Not ready for investment", "Prefers self-guided"]
- Summary shows: AlternativePath component with strategy toolkit

---

## Success Criteria

### Must Pass (P0)
- [x] All 6 bug fixes working as expected
- [ ] Turn sequence: stress test → pre_commitment → diagnose
- [ ] commitment_level updates correctly
- [ ] Insights captured throughout conversation
- [ ] Meta-cognition detected and expertise upgraded
- [ ] Summary page renders all new components

### Should Pass (P1)
- [ ] No containment false positives
- [ ] Co-created hypothesis detected
- [ ] Stress test validates properly
- [ ] CTA matches commitment level
- [ ] Portable framework constraint-specific

### Nice to Have (P2)
- [ ] Smooth UI animations
- [ ] Mobile responsive
- [ ] Print-friendly framework
- [ ] Email sent successfully

---

## Manual Test Instructions

### Setup
1. Clear browser cache and localStorage
2. Navigate to landing page
3. Click "Find My Next Step"
4. Enter "Marcus Chen" as name

### Execution
1. Follow turn-by-turn script above
2. Check console for state updates after each turn
3. Look for badges appearing in chat
4. Verify no errors in console
5. Complete conversation to summary page

### During Test
- Take screenshots of each badge appearing
- Copy final conversation_state to clipboard
- Note any unexpected behavior
- Time the conversation (should be 10-15 minutes)

### Summary Page
- Check each component renders
- Verify data accuracy
- Test download framework button
- Try booking link (opens Calendly)
- Submit email (verify sent)

---

## Reporting

### Test Results Template
```markdown
## Test Results: Marcus Chen Persona

**Date:** [date]
**Tester:** [name]
**Duration:** [X minutes]

### Bug Fixes
- Bug #1 (Pre-commitment): ✅ PASS / ❌ FAIL
- Bug #2 (Containment): ✅ PASS / ❌ FAIL
- Bug #3 (Commitment level): ✅ PASS / ❌ FAIL
- Bug #4 (Build criteria): ✅ PASS / ❌ FAIL
- Bug #5 (Insights capture): ✅ PASS / ❌ FAIL
- Bug #6 (Meta-cognition): ✅ PASS / ❌ FAIL

### Components
- PersonalizedCTA: ✅ PASS / ❌ FAIL
- PortableFramework: ✅ PASS / ❌ FAIL
- LearningNarrative: ✅ PASS / ❌ FAIL
- AlternativePath: N/A (high commitment)

### Issues Found
1. [Description of issue]
2. [Description of issue]

### Screenshots
- [Attach screenshots]

### Final State
```json
[paste conversation_state]
```

### Recommendation
✅ Ready for production
❌ Needs fixes (see issues above)
```

---

## Automated Test (Future)

### Playwright Test Outline
```typescript
test('Marcus Chen E2E Journey', async ({ page }) => {
  // Landing
  await page.goto('/');
  await page.click('text=Find My Next Step');

  // Name
  await page.fill('input[name="name"]', 'Marcus Chen');
  await page.click('text=Start');

  // Turns 1-12
  for (const turn of marcusTurns) {
    await page.fill('textarea', turn.message);
    await page.click('text=Send');
    await page.waitForSelector('[data-testid="advisor-message"]');

    // Validate state after each turn
    const state = await page.evaluate(() => window.__CONVERSATION_STATE__);
    expect(state).toMatchObject(turn.expectedState);
  }

  // Summary
  await page.waitForURL('/summary/*');
  await expect(page.locator('text=You\'re Ready')).toBeVisible();
  await expect(page.locator('[data-testid="portable-framework"]')).toBeVisible();
});
```

---

## Conclusion

This E2E test validates:
1. All 6 bug fixes from BUG_FIXES_SUMMARY.md
2. All Phase 5 components (PersonalizedCTA, PortableFramework, AlternativePath)
3. Phase 7 copy changes (Landing page)
4. Complete user journey from discovery to booking

**Estimated Test Time:** 20-30 minutes (manual)
**Frequency:** Run before every deployment
**Owner:** QA team + Product manager

---

🧪 Generated with [Claude Code](https://claude.com/claude-code)
