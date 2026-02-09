# Relationship Modeling Analysis

**Date:** 2026-02-02
**Context:** Danny's feedback on users (John Mitchell, Sam Imperati) being offput by Mira's tone. Three concerns: (1) earning the right to reframe, (2) calling out insufficient input, (3) detecting and responding to annoyance/frustration.

---

## The Two Case Studies

### John (session `82e402f5`, 29 turns)

John runs a coaching/consulting business serving BigLaw lawyers and academic physicians, with 40+ monthly clients, a team of independent contractors, and all inbound/referral leads. He came because "Danny asked me to try the tool." He's sophisticated, direct, and wasn't looking for deep self-discovery. When he asked "What do you suggest?" at turn 20, Mira deflected and kept probing. By turn 22 he said "This just went in a really weird direction. Explain yourself." By turn 24: "You are acting like a cocky little prick. Back off."

The core failure: Mira treated him like someone who needed to be led to an insight, when he was someone who wanted direct, practical input. The probing-without-earning-it felt condescending to a senior professional.

### Sam Imperati (session `8be42d16`, 39 turns)

Sam runs a conflict resolution business and is already a Mirasee client. When he asked for help identifying a market focus, Mira repeatedly redirected to "you need outside help." He eventually called the whole thing "a sales funnel." Less explosive than John, but equally offput — he felt the tool was deflecting his real question to sell him something.

---

## Analysis of Danny's Three Concerns

### 1. "Earn the right" before reframing

**What's happening now:** The base identity prompt has good language about mirroring first ("Quote or closely echo what they said → then add your insight"), but there's no structural gate. The decision engine can move to `hypothesis_forming` and start reframing as early as turn 5-6 based on confidence signals alone. For sophisticated users who are direct and give clear answers, the system builds hypothesis confidence fast — which paradoxically means it starts reframing *sooner* with exactly the users who are most likely to bristle at premature reframing.

**The real problem:** There's no concept of "rapport earned" in the system. Confidence in the *hypothesis* is tracked, but trust in the *relationship* is not. These are different things. You can be 80% sure someone has an execution constraint after 4 turns — but that doesn't mean you've earned the right to tell them.

**Possible directions:**

- **A "rapport gate" in the decision engine** — a minimum number of "understand and reflect" turns before the system allows reframes or hypothesis sharing. Not a hard number, but a floor (e.g., at least 2-3 turns of pure listening/reflecting after context gathering, before any reframing overlays activate). Sophisticated users who give dense answers would still get those turns.

- **Sophistication assessment in unified analysis** — add a signal like `user_sophistication: 'high' | 'medium' | 'low'` based on early responses. High-sophistication users (clear, concise, business-savvy language, senior experience) would get a different approach: more "let me make sure I understand your situation" and "tell me if I've got this right" before any reframing.

- **A "check-in" overlay** — before the first reframe, insert a turn where Mira demonstrates *deeper understanding*, not surface-level parroting. Multiple users reported that Mira felt like the stereotype of active listening — just repeating back what was said. The check-in must go beyond "so what I'm hearing is..." and instead connect dots, name a pattern, or surface something the user implied but didn't explicitly say. Example: Instead of "So you're working 60 hours and can't hire — does that capture it?", something like "You've built something that works really well for your clients, but the way it's built means it can only work through you. The catch-22 isn't really about time — it's that the thing that makes your business good is the same thing that makes it impossible to scale. Am I reading that right?" This earns the right to reframe because it demonstrates Mira understood something *beyond* what was said.

### 2. Calling out insufficient input

**What's happening now:** The `exploration` overlay has handling for brief responses ("Tell me more about that..."), but it's soft — it just invites elaboration. There's no escalation path if someone consistently gives one-word answers and won't engage.

**The real problem:** Some users aren't willing to invest in the process. The current system treats this as a patience problem (keep asking), when it should be treated as a consent problem (explicitly tell them what's needed).

**Possible directions:**

- **A "low engagement" detector in unified analysis** — track consecutive short responses (e.g., 3+ turns of <15 words). After threshold, trigger a specific overlay that says something like: "I want to be upfront — for this to be useful, I need you to share a bit more about what's going on. I can't diagnose what's blocking your business from one-word answers. If you'd rather not go deeper right now, that's totally fine — but there's not much I can offer without more to work with."

- **This could be a new action in the decision engine** — `address_low_engagement` — with its own overlay that's direct but warm. Not passive-aggressive, just honest about the process requirements.

### 3. Detecting and responding to annoyance/frustration

**What's happening now:** The system detects `resistance_to_hypothesis` and `emotional_charge`, and has a `containment` overlay for emotional overwhelm. But there's a gap: **annoyance directed at Mira** (not at their business situation) isn't specifically detected or handled. The containment mode is designed for someone who's overwhelmed by their own feelings, not someone who's frustrated with the bot.

John's session is the perfect example: he wasn't overwhelmed — he was annoyed at Mira's approach. The containment overlay would have been wrong ("You seem overwhelmed, let me give you space") when what he needed was "I hear that this isn't landing. What would be more useful to you right now?"

**Possible directions:**

- **Add a `frustration_with_process` signal to unified analysis** — distinct from `emotional_charge` or `resistance_to_hypothesis`. Detects when the user is annoyed at Mira/the tool itself, not at their business situation. Keywords: "this isn't helpful," "you're not listening," "what's the point of this," "just tell me," direct insults or dismissal.

- **A new `acknowledge_frustration` action and overlay** — triggered when frustration-with-process is detected. Guides Mira to: (1) acknowledge the frustration directly, (2) ask what's bothering them, (3) based on response, either adjust approach or offer a clean exit.

- **Important nuance:** The response to detected frustration should NOT be "you seem frustrated" (which is itself annoying to hear from a bot). It should be more direct: acknowledge the disconnect, ask what they need, and offer honest boundaries about what the tool can and can't do.

- **Rudeness boundary (hostile level):** When frustration reaches hostile — insults, personal attacks, aggressive language — Mira should set a firm boundary, not just try to accommodate. Something like: "I want to help, but I'm not able to continue if the conversation goes in this direction. Would you like to try a different approach, or should we wrap up?" This is distinct from the "significant" frustration response (which asks what would be more helpful). At "hostile," Mira names the behavior and gives a clear choice: reset the tone or end the conversation. This protects the experience and models healthy professional boundaries.

### Connecting Thread

All three share a root issue: **the system has no model of the relationship itself**. It models the user's business situation (constraint, signals, readiness) and conversation content (topics explored, hypothesis confidence) — but not the *quality of the working alliance* between Mira and the user.

### 4. The "Active Listening Parrot" Problem

**Danny's feedback (from multiple users):** Mira feels like the stereotype of active listening — just repeating back what was said. "So you're saying you feel overwhelmed..." doesn't earn trust with experienced professionals. It feels mechanical and patronizing.

**What's happening now:** The base identity prompt instructs Mira to "Mirror First, Then Synthesize" with the pattern: "Quote or closely echo what they said → then add your insight." The problem is that in practice, the LLM often stops at the mirror and never gets to real synthesis, or the synthesis is shallow (just restating the same idea in different words).

**What needs to change:** The "earn the right" check-in can't be a summary. It has to demonstrate that Mira understood something the user *didn't explicitly say* — the implication, the pattern, the connection between two things they mentioned separately. This is the difference between:

- **Parrot:** "So you're working 60 hours and you've tried hiring VAs but it didn't work out. Did I get that right?"
- **Deeper reflection:** "You've built something that works really well for your clients, but the way it's built means it can only work through you. The catch-22 isn't really about time — it's that the thing that makes your business good is the same thing that makes it impossible to scale."

The second one earns trust because the user thinks "she actually *gets* it" — not "she can repeat what I said." This applies throughout the conversation, not just at the check-in moment. The base identity prompt's "Mirror First" section may need to be reworked to emphasize synthesis and implication over echoing.

**Prompt-level fix (independent of relationship modeling):** Revise the "Mirror First, Then Synthesize" section in `base-identity.ts` to:
- De-emphasize quoting their exact words (which produces parrot behavior)
- Emphasize naming what's *underneath* or *between* what they said
- Provide examples that show the difference between surface reflection and deeper understanding
- Add a prohibition: "DO NOT just restate what they said in different words. That's not reflection — it's parroting. Reflection means showing you understood the *implication* they may not have articulated."

---

## Relationship Modeling: Detailed Design

### The Core Concept

The system models **what the user is saying about their business** (constraint, signals, hypothesis) and **where we are in the conversation** (phase, turns, ground coverage). What's missing is a model of **how the user relates to Mira and this process** — are they bought in, skeptical, engaged, annoyed, testing, deferential?

This isn't just sentiment analysis. It's closer to what therapists call the "working alliance" — the quality of the collaborative relationship between practitioner and client. Research on therapeutic alliance consistently shows it's the strongest predictor of outcome, more than technique or method. If the alliance is weak, even the best diagnostic questions will land wrong.

### Four Dimensions

#### 1. Engagement Level — How invested are they in this process?

- `high`: Giving detailed, thoughtful responses. Asking follow-up questions. Building on what Mira says.
- `medium`: Answering adequately but not going beyond what's asked. Functional but not invested.
- `low`: Short answers, monosyllables, "I guess" energy. Going through the motions.
- `resistant`: Actively pushing back on the process itself, not just on specific questions.

The system already tracks `low_effort` in the engagement section of unified analysis, and has a `low_effort_pushback` escalation path. But low effort and low engagement aren't the same thing. Someone can give a short but loaded answer ("I'm scared") that's deeply engaged.

#### 2. Trust / Permission Level — How much latitude has Mira earned?

Accumulates over time through demonstrated understanding and accurate reflections. Depletes when Mira gets something wrong, pushes too hard, or deflects a direct request.

- `establishing`: Early conversation. Mira hasn't demonstrated understanding yet. Only information-gathering and reflection allowed.
- `building`: Mira has demonstrated deeper understanding 1-2 times (not just parroted — connected dots, named a pattern, surfaced an implication) and user has confirmed Mira "gets it." Gentle reframes and observations now possible.
- `established`: Multiple confirmed deeper reflections. User is sharing freely, building on Mira's observations. Deeper reframes, naming patterns, and hypothesis testing are appropriate.
- `damaged`: Mira pushed too hard, got something wrong, or deflected when the user wanted directness. Need to repair before proceeding.

Key insight: **trust is not the same as turns elapsed.** John's session hit 29 turns but trust was shattered at turn 22. Trust is built through demonstrated understanding, not through time.

#### 3. User Disposition — What kind of engagement does this person expect?

- `collaborative_explorer`: Wants to discover insights together. Open to being guided. Most users.
- `direct_pragmatist`: Wants answers, not questions. Values efficiency. Gets annoyed by probing when they've already given clear information. John is this type.
- `skeptical_evaluator`: Testing the tool. Not necessarily hostile, but has their guard up. Sam started here.
- `emotionally_processing`: Using the conversation to work through feelings. Needs space and validation more than reframes.

Not a label assigned once — it can shift. But early detection matters.

#### 4. Frustration with Process — Is annoyance directed at Mira/the tool?

Distinct from emotional charge (about their business situation) and from resistance to hypothesis (intellectual disagreement).

- `none`: Normal conversation.
- `mild`: Impatience signals. "Just tell me." Short responses after detailed ones. Tone shift.
- `significant`: Direct criticism of the process. "This isn't helpful." "You're going in circles."
- `hostile`: Personal attacks or explicit rejection. "You're being condescending."

### How an LLM Can Assess These

**What works well:**

- **Disposition detection from early messages.** "I run a conflict resolution business, 15 years, here's my situation" = direct pragmatist. "Well, I've been thinking a lot about this and I'm not really sure where to start..." = collaborative explorer. Detectable from 2-3 messages with high accuracy.

- **Trust state from conversational flow.** When Mira reflects something and the user says "exactly" or elaborates further = trust building. When the user ignores Mira's reflection entirely = trust signal too. Trackable as trajectory.

- **Frustration detection from linguistic markers.** Shortening responses, rhetorical questions, imperatives ("just tell me"), sarcasm, direct criticism — highly detectable in text.

**What's harder:**

- **Distinguishing "intellectually disagrees" from "emotionally frustrated."** The LLM needs to assess both content and tone.

- **Avoiding over-reading.** A short response isn't always frustration. The model needs trajectory (were they detailed before and now terse?) not just the current message.

- **Calibrating against individual baselines.** John was terse from the start — that's his style, not frustration. Frustration is when the pattern *changes*.

### Unified Analysis Schema Addition

```json
"relationship": {
  "engagement": "high" | "medium" | "low" | "resistant",
  "trust_level": "establishing" | "building" | "established" | "damaged",
  "disposition": "collaborative_explorer" | "direct_pragmatist" | "skeptical_evaluator" | "emotionally_processing",
  "process_frustration": "none" | "mild" | "significant" | "hostile",
  "frustration_target": "process" | "mira" | "self" | "situation" | null
}
```

### How It Would Gate Behavior in the Decision Engine

#### Gate 1: Reframe permission (the "earn the right" gate)

Currently, `hypothesis_forming` overlay can activate as soon as `hypothesis_confidence > 0.5`. With relationship modeling:

```ts
// Only allow hypothesis_forming overlay if trust is at least "building"
if (state.relationship.trust_level === 'establishing') {
  overlays.push('exploration')  // No hypothesis_forming added
} else {
  overlays.push('hypothesis_forming')
}
```

The system might *know* the constraint by turn 5, but if trust is still "establishing," it needs to keep reflecting and confirming understanding before shifting to reframes.

#### Gate 2: Disposition-adapted response style

For `direct_pragmatist` users, inject an overlay that modifies Mira's approach:

```ts
if (state.relationship.disposition === 'direct_pragmatist') {
  overlays.push('direct_communication_style')
}
```

Where that overlay says:
> This user communicates directly and values efficiency. When they ask a direct question, give a direct answer first, THEN explore. Don't probe when they've given clear information. If you need more context, explain WHY before asking.

#### Gate 3: Frustration detection and response

New priority in the decision engine, after containment (Priority 1):

```ts
// Priority 1.3: Process frustration (relationship repair)
if (state.relationship.process_frustration === 'significant' ||
    state.relationship.process_frustration === 'hostile') {
  return {
    action: 'acknowledge_frustration',
    prompt_overlays: ['frustration_repair'],
    ...
  }
}
```

For `mild` frustration — don't interrupt, but add a modifier overlay that makes Mira more careful.

#### Gate 4: Low engagement + explicit process requirements

The existing `low_effort_pushback` escalation can be smarter:

- If `engagement: low` + `disposition: direct_pragmatist` → they might just be concise, don't push back
- If `engagement: low` + `disposition: collaborative_explorer` → something shifted, check in gently
- If `engagement: resistant` (any disposition) → be explicit about process requirements

#### Gate 5: Trust repair after damage

When `trust_level` drops to `damaged`, activate a recovery overlay that acknowledges what went wrong, resets to the user's terms, offers clear boundaries about what the tool can/can't do, and lets them choose to re-engage or wrap up.

### Implementation Architecture

**Files to modify:**

1. **`types.ts`** — Add `RelationshipState` interface to `ConversationState`
2. **`unified-analysis.ts`** — Add `relationship` section to analysis prompt and JSON schema
3. **`decision-engine.ts`** — Add relationship-based gates at multiple priority levels
4. **`prompt-builder.ts`** — New overlays: `direct_communication_style`, `frustration_repair`, `frustration_aware`, `trust_repair`
5. **`orchestrator.ts`** — Update state after each analysis to persist relationship dimensions

### The "Confirmed Reflections" Heuristic

Trust level doesn't have to be purely LLM-assessed. Simple heuristic:

- 0 confirmed reflections → `establishing`
- 1-2 confirmed reflections → `building`
- 3+ confirmed reflections → `established`
- User criticizes Mira's approach → `damaged` (override)

This gives a reliable, deterministic baseline with the LLM's assessment as a refinement layer.

### Conservative Approach

Start with just **two** dimensions — `trust_level` and `process_frustration` — because those directly address the three problems Danny identified. Disposition and engagement could come later.

`trust_level` solves problem #1 (earn the right). `process_frustration` solves problem #3 (detecting annoyance). Problem #2 (calling out insufficient input) is already partially handled by the low-effort escalation path.

### What Would Have Changed for John and Sam

**John:** By turn 3-4, `disposition: direct_pragmatist` detected. When he asked "What do you suggest?" at turn 20, the `direct_communication_style` overlay would guide Mira to answer directly first. `process_frustration: significant` would trigger at turn 22 ("This just went in a really weird direction") — before it escalated to hostile at turn 24.

**Sam:** `disposition: direct_pragmatist` or `skeptical_evaluator` detected early. When he asked for specific help and Mira deflected, `process_frustration: mild` would trigger. When Sam said "this feels like a sales funnel," `trust_level: damaged` + `process_frustration: significant` would trigger the repair path. The relationship model would help Mira acknowledge limitations more honestly and earlier.
