# Phases 5-7 Implementation TODO

## Phase 5: Enhanced Summary Page (3-4 days)

### Components to Create:

**1. PortableFramework.tsx** (NEW)
- Visual framework users can reference independently
- Questions for ongoing self-assessment
- Signals to watch for their specific constraint type
- Downloadable/printable format

**2. PersonalizedCTA.tsx** (NEW)
- Context-aware booking CTA based on:
  - Readiness level (HIGH/MEDIUM/LOW from readiness_check)
  - Constraint type
  - Identified blockers
- Different CTAs for EC vs. MIST vs. NURTURE paths
- Pre-call prep prompts for high-readiness users

**3. AlternativePath.tsx** (NEW)
- For medium/low readiness users
- Constraint-specific resources and exercises
- "Not ready now? Work on this first" guidance
- Path back to booking when ready

**4. Enhanced NextStepOptions.tsx**
- Update to use readiness_check.commitment_level
- Show different options based on true readiness
- Include blocker acknowledgment
- Personalized next steps based on constraint + readiness

**5. Enhanced ConstraintCard.tsx**
- Include user quotes showing their discovery
- "Together we identified..." language (co-creation)
- Show evidence from their own words

### Summary.tsx Updates:
- Import and integrate new components
- Conditional rendering based on learner_state
- Order: LearningNarrative → ConstraintCard → ReadinessReality → PortableFramework → PersonalizedCTA/AlternativePath → EmailCapture

---

## Phase 6: Email Enhancements (2 days)

### Email Templates to Create/Update:

**1. Enhanced Learning Summary Email**
```
Subject: Your Discovery: [Constraint Type]

Body:
- "Here's What You Discovered" section with key insights
- Portable framework visual/link
- Personalized next steps based on readiness
- Booking link (if ready) OR resources (if not ready)
```

**2. Pre-Call Prep Email** (NEW)
```
Sent after EC/MIST booking

Body:
- Reflection prompts to prepare
- Questions to consider before call
- Build momentum for the conversation
```

**3. Nurture Track Series** (NEW)
```
For low-readiness users who select NURTURE:

Email 1 (immediate): Framework deep-dive
Email 2 (+3 days): Relevant case study
Email 3 (+7 days): Self-assessment exercise
Email 4 (+14 days): Re-engagement check-in
```

### Files to Update:
- `server/src/services/email/resend.ts`
- Create new email templates (HTML + text versions)
- Update email sending logic to check readiness_check.commitment_level

---

## Phase 7: Copy Updates (0.5 days)

### Landing Page (`client/src/pages/Landing.tsx`)

**Current Focus:** "Get diagnosed"
**New Focus:** "Discover your constraint"

Updates:
- Hero headline: "Discover What's Really Holding Your Business Back"
- Subheadline: Add "...and build clarity you can act on"
- Feature bullets: Emphasize learning/discovery, not just diagnosis
- "What You'll Learn About Yourself" preview section
- Social proof: Include quotes about clarity gains, not just diagnoses

### Name Collection (`client/src/pages/NameCollection.tsx`)

**Current:** Basic name input
**New:** Expectation-setting

Updates:
- Add brief copy: "In the next 10-15 minutes, you'll discover..."
- Frame as collaborative: "We'll work together to..."
- Minimize changes - just add 1-2 sentences

---

## Backend API Extension Required

To fully enable Phases 4-5 frontend features, extend the orchestrator API:

### `server/src/services/orchestratorService.ts`

Update `OrchestratorResult` interface:
```typescript
export interface OrchestratorResult {
  advisorMessage?: Message
  session: Session
  complete: boolean
  state: {
    constraint_hypothesis: string | null
    readiness: {
      clarity: string
      confidence: string
      capacity: string
    }
    phase: string

    // ADD THESE:
    learner_state?: {
      insights_articulated: string[]
      learning_milestones: number
      expertise_level: string
      hypothesis_co_created: boolean
      stress_test_passed: boolean
    }

    readiness_check?: {
      stress_test_completed: boolean
      identified_blockers: string[]
      commitment_level: string
      ready_for_booking: boolean
    }

    last_action?: string // For determining which badge to show
  }
}
```

### Frontend Type Extension

Update `client/src/types/index.ts` to match backend types.

---

## Priority Order for Implementation

**HIGH PRIORITY (Core user experience):**
1. Backend API extension (exposes learner_state to frontend)
2. PersonalizedCTA.tsx (drives conversions based on true readiness)
3. Enhanced Learning Summary Email
4. Landing page copy updates

**MEDIUM PRIORITY (Enhanced experience):**
5. PortableFramework.tsx
6. AlternativePath.tsx
7. Enhanced ConstraintCard with user quotes
8. Pre-Call Prep Email

**LOW PRIORITY (Nice to have):**
9. Nurture email series
10. Name collection expectation-setting

---

## Testing Checklist

When implementing:

- [ ] Insights appear in InsightPanel as user has breakthroughs
- [ ] Learning stages progress correctly (Exploring → Discovering → Testing → Ready)
- [ ] Badges appear on appropriate message types
- [ ] Summary page shows LearningNarrative with user's insights
- [ ] CTA changes based on commitment_level (HIGH/MEDIUM/LOW)
- [ ] Alternative path shown for low-readiness users
- [ ] Email templates render correctly with personalized data
- [ ] Landing page copy emphasizes discovery over diagnosis

---

## Estimated Total Time: 6-7 days

- Backend API Extension: 0.5 days
- Phase 5 Components: 3-4 days
- Phase 6 Emails: 2 days
- Phase 7 Copy: 0.5 days
- Testing & Polish: 0.5 days
