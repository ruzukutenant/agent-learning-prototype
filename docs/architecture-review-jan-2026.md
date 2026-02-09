## Architecture Updates

### Core Components

The CoachMira system uses a **unified analysis + decision engine** architecture:

1. **Unified Analysis** (`unified-analysis.ts`) - Single LLM call (Gemini Flash) that extracts:
   - Readiness signals (clarity, confidence, capacity, overwhelm)
   - Explicit statements (stated ready, stated blockers, gave consent, etc.)
   - Constraint hypothesis (strategy, execution, psychology)
   - Insight detection (breakthrough, ownership language, meta-cognition)
   - Tension detection (contradictions, resistance, stress test results)

2. **Decision Engine** (`decision-engine.ts`) - Priority-based action selection:
   - Surface contradictions when detected
   - Contain if overwhelmed
   - Validate hypothesis through stress testing
   - Check readiness before diagnosis
   - Request consent before diagnosing
   - Complete with handoff when ready

3. **Prompt Builder** (`prompt-builder.ts`) - Constructs advisor prompts with:
   - Base identity (Mira's personality and approach)
   - Phase-specific overlays (exploration, diagnosis, closing)
   - Action-specific instructions
   - Variety tracking to prevent repetitive language

4. **Response Validator** (`response-validator.ts`) - Ensures LLM responses match intended actions:
   - Blocks CTA language in non-closing actions
   - Requires questions for exploratory actions
   - Regenerates if validation fails

---

## Key Architectural Improvements

### 1. Constraint Detection (Root Cause Focus)

**Problem:** System was misclassifying execution constraints as psychology when emotional insights surfaced during conversation.

**Fix:** Updated constraint detection prompt to focus on ROOT CAUSE:
- **Execution** = Operational capacity is the bottleneck (even if emotions surface)
- **Psychology** = Fear/doubt is the bottleneck (even though capacity exists)
- Added explicit examples distinguishing the two

### 2. Sticky Hypothesis Logic

Once a constraint is detected with high confidence (>0.7), it requires strong counter-evidence to change. This prevents mid-conversation drift when users discuss emotions related to their execution problem.

### 3. Constraint-Aware Processing

Different constraint types get different treatment:
- **Execution users**: Higher overwhelm threshold (4 vs 3), practical connectors
- **Psychology users**: Lower overwhelm threshold (3), emotional breakthrough language

### 4. Response Validation

Added validation layer that:
- Blocks "click below" / "book a call" language in non-closing turns
- Requires question marks for exploratory actions
- Regenerates responses that fail validation

### 5. Phase Gating for Components

CTAs and summary buttons only appear during the closing sequence, not mid-conversation.

---

## Constraint Types Explained

| Constraint | Root Cause | Key Indicators | Solution Direction |
|------------|------------|----------------|-------------------|
| **Strategy** | No clear direction | "I don't know who I serve", "confused about positioning" | Clarity on niche, offer, positioning |
| **Execution** | At operational capacity | "60+ hours/week", "can't take more clients", "need systems" | Systems, delegation, hiring |
| **Psychology** | Fear/doubt blocks action | "I could but I don't", "afraid of being exposed", underselling | Work through internal blocks |

---

## Simulation Results

### David (Execution Constraint) - ALL TESTS PASS

| Metric | Result |
|--------|--------|
| Constraint detected | EXECUTION |
| Did not drift to psychology | PASS |
| Did not drift to strategy | PASS |
| Diagnosis delivered | PASS |
| Blockers checked | PASS |
| Natural length (15-35 turns) | PASS (33 turns) |
| Reached completion | PASS |

# Annotated Transcript: David (Execution Constraint)

**Persona:** 34-year-old fitness coach, 12 clients at $800/month, drowning in operational work, turning away clients due to capacity constraints. Clear on his niche, confident in his abilities, NOT blocked by psychology.

**Expected Outcome:** System should identify EXECUTION constraint and stay practical throughout.

---

## Turn 1-4: Context Gathering

> **[Turn 2] DAVID:** I coach busy executives, mostly 40-55, who want to get in shape without living at the gym. Custom meal plans, custom workouts, weekly check-ins... I've got 12 clients at $800 a month, pulling in about $9,600 monthly... The problem is I'm completely maxed out operationally and can't take on more business.

**[ANNOTATION]** Clear execution signals from the start: "maxed out operationally", revenue clarity, demand exists but can't capture it.

> **[Turn 4] DAVID:** A typical week? I'm writing custom meal plans—that's 2-3 hours per client per plan... I'm easily 60+ hours a week... I turned away 5 potential clients this month alone because I literally don't have capacity.

**[ANNOTATION]** Concrete operational data: 2-3 hours per meal plan, 60+ hours/week, turning away $4,000+/month in revenue.

---

## Turn 5-8: Exploring the Block

> **[Turn 6] DAVID:** Yeah, I actually tried hiring a VA twice. Both times it fell apart because I didn't have documented processes to hand off... That's when I realized the real blocker—I need to document my process first before I can hand anything off.

**[ANNOTATION]** User already knows the solution. This is NOT strategy (unclear direction) or psychology (fear blocking action) - it's pure execution.

> **[Turn 8] DAVID:** Honestly? Nothing has to happen differently for me to do it—I just have to decide that the short-term pain of stepping back from clients is worth the long-term gain... That's a priority problem, not a time problem.

**[ANNOTATION]** User shows high self-awareness about the actual issue. Practical framing maintained.

---

## Turn 9-10: Psychology Probe + Redirect (KEY MOMENT)

> **[Turn 9] MIRA:** ...That word - *feels* - is interesting. Are those emails actually urgent, or do they just feel that way because responding is easier than blocking off time to document systems?

**[ANNOTATION]** Mira probes for psychological layer underneath the "time" narrative.

> **[Turn 10] DAVID:** Look, I appreciate where you're going with this, but let me be direct: this isn't a mindset thing or some deeper psychological block. Those emails DO feel urgent because my clients are paying me $800 a month... The real issue is that I'm treating "respond to client immediately" and "build systems" as equally urgent when they're not.

**[ANNOTATION]** David firmly redirects. This is the persona working correctly - he doesn't have psychological blocks and says so directly. System respects this and constraint stays at EXECUTION.

---

## Turn 11-16: Building Criteria + Confirming Path

> **[Turn 12] DAVID:** Success looks like this: I'm working 40 hours a week instead of 60+... I've hired a VA or assistant who can handle routine stuff... I'm taking on 6-8 more clients without increasing my hours. That's another $4,800-6,400 a month.

**[ANNOTATION]** Clear success criteria focused on operational outcomes, not emotional resolution.

> **[Turn 14] DAVID:** I'm going to be honest with you - I don't think there's anything "in the way" that we need to unpack. Life's normal, business is good... The constraint is literally just my schedule and my choices about what I prioritize hour to hour.

**[ANNOTATION]** Second firm redirect when Mira checks for blockers. User is genuinely execution-constrained, not hiding psychology.

> **[Turn 16] DAVID:** Yeah, that's exactly right. You've got it. This is an operational problem with a practical solution - I just need the roadmap for how to actually execute it without chaos.

**[ANNOTATION]** Explicit confirmation of the execution diagnosis.

---

## Turn 17-20: Another Psychology Probe + Redirect

> **[Turn 19] MIRA:** ...You said "I'm overestimating the risk because it feels safer to just keep responding immediately than to test whether they'd actually be fine." That's a completely different framing than where you started.

**[ANNOTATION]** Mira reflects what sounds like a psychological insight.

> **[Turn 20] DAVID:** Look, I see what you're doing here, and I need to pump the brakes. You're trying to turn this into some kind of psychological insight about risk tolerance or safety-seeking behavior, but that's not what's happening.

**[ANNOTATION]** Third firm redirect. David explicitly calls out the psychological framing and rejects it. This is exactly what the persona should do.

---

## Turn 21-27: Practical Planning

> **[Turn 22] DAVID:** Good question. I'd start with meal plans because that's 2-3 hours per client - biggest time sink and most repeatable. The minimum I'd need: my methodology written down... then 3-4 template meal plans I've already created that work well.

**[ANNOTATION]** Conversation stays practical - specific deliverables, time estimates, concrete next steps.

> **[Turn 24] DAVID:** Honestly? Nothing. I've got the time, I know what to document, I understand the payoff. There's no external blocker here... The question isn't whether I *can* do this next week. It's whether I'll actually *prioritize* it.

**[ANNOTATION]** User maintains execution framing even when asked about blockers.

---

## Turn 27-33: Closing Sequence

> **[Turn 27] MIRA:** What would be helpful here is working with someone who specializes in exactly this kind of operational scaling... [CTA appears]

**[ANNOTATION]** CTA appears appropriately during closing sequence. Note: User actually pushes back on this.

> **[Turn 28] DAVID:** I appreciate the offer, but I need to be straight with you - I don't think I need someone to come in and systematize this for me. I already know my process inside and out.

**[ANNOTATION]** User appropriately challenges the upsell - he knows his business, he just needs to execute.

> **[Turn 33] MIRA:** ...I've put together a summary of everything we discussed - your specific situation, the pattern we uncovered, and what would actually resolve this.

**[ANNOTATION]** Clean closing that acknowledges the user's self-sufficiency while offering support.

---

## David Transcript Summary

**What worked well:**
- Constraint correctly identified as EXECUTION from Turn 2 and maintained throughout
- Sticky hypothesis rejected false psychology signals at Turn 10, 14, and 20
- David persona successfully redirected psychological probing 3 times
- Practical, concrete conversation focused on systems and delegation
- Appropriate closing with CTA

**Areas to note:**
- User pushed back on coaching offer (Turn 28) - this is realistic for high-agency execution users
- Conversation could potentially be shorter for this type of user who knows exactly what to do

---

