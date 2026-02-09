# Annotated Conversation: David (Execution Constraint)

> **For Danny** - This document shows how the orchestrator dynamically guides the conversation. Each section is annotated with what's happening behind the scenes.

---

## About David

- **Business:** Online fitness/nutrition coach for busy executives
- **Revenue:** $9,600/month (12 clients × $800)
- **Actual Constraint:** EXECUTION (doing everything himself, needs systems)
- **NOT his issue:** Fear, self-doubt, or unclear positioning

---

## Phase 1: Context Gathering

*The system starts in "context" phase, asking open questions to understand David's situation.*

---

### Turn 1 | MIRA

> Hey David! I'm here to help you identify what's really holding your business back. Let's start with the basics - tell me about your coaching business. What do you do and who do you help?

**Behind the scenes:**
| | |
|---|---|
| **Action** | `explore` |
| **Phase** | context |
| **Hypothesis** | none yet |
| **Overlay** | Base exploration - gather business context |

---

### Turn 2 | DAVID

> Hey Mira! I run an online fitness and nutrition coaching business - I help busy executives, mostly in their 40s and 50s, get in shape without living at the gym...
>
> I've got 12 clients right now paying $800 each, so I'm doing about $9,600 a month...
>
> The problem? I'm maxed out at 12 clients and turning people away because I'm drowning in the day-to-day work. Every meal plan, every workout, every response - that's all me right now.

**Unified Analysis detects:**

| Signal | Value |
|--------|-------|
| Explicit statements | "drowning in the day-to-day work", "maxed out", "all me" |
| Constraint | EXECUTION (0.90 confidence) |
| Evidence | Doing everything himself, operational bottleneck |
| NOT detected | Fear, self-doubt, unclear positioning |

---

### Turn 3 | MIRA

> Okay, so you've built something that clearly works - great clients, strong results, steady income. But you're at capacity doing everything yourself, and that's the wall you've hit.
>
> When you say you're "drowning in the day-to-day work" - what's taking up most of your time?

**Behind the scenes:**
| | |
|---|---|
| **Action** | `explore` |
| **Phase** | context → exploration |
| **Hypothesis** | execution (0.90) |
| **What Mira is doing** | Acknowledging (1 sentence), then ONE focused question. Following "2-3 sentences max" guideline. |

---

## Phase 2: Deepening Understanding

*The system has an early hypothesis (EXECUTION) and is now exploring to validate it.*

---

### Turn 4 | DAVID

> Honestly, it's all of it, but the meal plan creation is probably the biggest time suck. Each client gets a completely custom meal plan every two weeks... That's 24 meal plans a month, and each one takes me about 2-3 hours...
>
> I've tried to hire VAs twice, but I don't have any documented processes... I know exactly what I need to do - build systems, document processes, hire help. But every hour I spend on that is an hour I'm not serving current clients.

**Analysis update:**

| Signal | Value |
|--------|-------|
| Constraint | EXECUTION (1.00 confidence) - *strengthened* |
| Key evidence | "tried to hire VAs twice", "no documented processes", "I know exactly what I need to do" |

**Critical distinction:**
- He KNOWS what to do → NOT strategy
- No fear/self-doubt mentioned → NOT psychology
- Needs systems/help → EXECUTION ✓

---

### Turns 5-8 *(summarized)*

Mira explores whether there's something deeper - is this really just a time problem, or is there a mindset block? David pushes back:

> "Look, it really is just the time thing. I'm not being dramatic here..."
>
> "It's not a mindset block or anything - it's just pure logistics."

**What's happening:** System is stress-testing the hypothesis. Mira probed for psychology (fear, perfectionism). David explicitly rejected it: "not a mindset block." Hypothesis remains EXECUTION (1.00). No drift to PSYCHOLOGY despite probing. ✓

---

## Phase 3: The Breakthrough

*Mira challenges David's framing, and he has a realization.*

---

### Turn 9 | MIRA

> Here's what I'm seeing: you're looking for a way to solve this that doesn't require sacrifice or tradeoffs. But what if there isn't one?...
>
> What would actually happen if you stopped posting on LinkedIn for three weeks and used those hours to document your processes?

**Behind the scenes:**
| | |
|---|---|
| **Action** | `surface_contradiction` |
| **Overlay instruction** | "Name the tension you're seeing and ask them to help you understand it." |
| **What Mira is surfacing** | "You say no time, but time exists - you're just not willing to make tradeoffs." |

---

### Turn 10 | DAVID

> You know what? You're absolutely right about the tradeoffs. I've been acting like I need to find magical extra hours that don't exist.
>
> The LinkedIn content... that's probably 5-6 hours a week if I'm honest. I could pause that for a month...

**Breakthrough detected:**

| Signal | Value |
|--------|-------|
| Insight phrases | "You're absolutely right", "I've been acting like...", "maybe the real question isn't..." |
| Ownership language | YES |
| Meta-cognition | YES (questioning own framing) |
| **Next action** | `reflect_insight` |

---

### Turn 11 | MIRA

> Hold on - did you catch what you just said? You went from "I literally cannot find the hours in the day" to identifying 5-6 hours a week you could free up by pausing something that isn't even driving your growth right now.
>
> That's the shift.

**Behind the scenes:**
| | |
|---|---|
| **Action** | `reflect_insight` |
| **Overlay instruction** | "Mirror back their breakthrough. Add insight - don't just repeat what they said. Show you understood the MEANING." |
| **What Mira is reflecting** | The shift from "no time" to "protecting the wrong things" |

---

## Phase 4: Validation & Consent

*The hypothesis is validated. Now getting consent to share the diagnosis.*

---

### Turn 15 | MIRA

> I'm seeing a clear pattern from everything you've shared... Would you like me to share what I think is really going on here?

**Behind the scenes:**
| | |
|---|---|
| **Action** | `request_diagnosis_consent` |
| **Why** | Before sharing diagnosis, ask permission. This is respectful, not pushy. David can say "not yet" and we'd continue exploring. |

---

### Turn 16 | DAVID

> Yeah, absolutely. I'm curious what you're seeing that I might be missing. Lay it on me.

**Explicit consent detected:**
- `gave_consent`: TRUE
- "Yeah, absolutely" + "Lay it on me"
- **Next action:** `diagnose`

---

## Phase 5: Diagnosis Delivery

*Sharing the constraint diagnosis clearly and checking if it resonates.*

---

### Turn 17 | MIRA

> Here's what I'm seeing: **Your constraint is execution** - specifically, you're doing everything yourself and you don't have the systems to get out of that trap.
>
> But here's the thing - it's not actually a time problem. You just proved that yourself...
>
> Does that land?

**Behind the scenes:**
| | |
|---|---|
| **Action** | `diagnose` |
| **Phase** | exploration → diagnosis |
| **Overlay instruction** | Share diagnosis in their language. Brief (3-4 sentences max). End with validation question. DO NOT mention booking or next steps yet. |
| **Note** | No CTA here - that comes later after validation |

---

### Turn 18 | DAVID

> Yeah, that absolutely lands. You nailed it - I was treating busy work like important work and then wondering why I felt stuck...

**Result:**
- `hypothesis_validated`: TRUE
- `stress_test_passed`: TRUE
- David owns the insight in his own words.

---

## Phase 6: Blocker Check & Closing

*Before completing, check for blockers and then hand off.*

---

### Turn 21 | MIRA

> One more question before we wrap up: What would prevent you from actually working on this right now? Any blockers I should know about?

**Behind the scenes:**
| | |
|---|---|
| **Action** | `check_blockers` |
| **Overlay instruction** | "Ask what would prevent them from working on this. Surface blockers: time, money, other priorities." |
| **Why** | This is the final gate before offering next steps. |

---

### Turn 22 | DAVID

> Honestly? Nothing's blocking me right now. I'm clear on what needs to happen, I've got the capacity once I reallocate those LinkedIn hours, and I'm motivated to actually do it.

**Explicit signals detected:**

| Signal | Value |
|--------|-------|
| `stated_ready` | TRUE ("I'm ready to tackle this") |
| `stated_no_blockers` | TRUE ("Nothing's blocking me") |
| `ready_to_close` | TRUE |
| `has_blockers` | FALSE |
| **Next action** | `complete_with_handoff` |

---

### Turn 25 | MIRA *(Final)*

> You've done real work here today, David. You went from "I literally cannot find the hours" to seeing that you were protecting the wrong things - and that shift changes everything.
>
> What we uncovered is that you're operationally stuck doing everything yourself, but the real breakthrough was realizing the time was always there...
>
> I've put together a summary of everything we discussed - your specific situation, what we uncovered, and what I'd recommend as next steps. You'll see that now, along with a way to book a call if you'd like to take this further.

**Behind the scenes:**
| | |
|---|---|
| **Action** | `complete_with_handoff` |
| **Overlay instruction** | Acknowledge their work (1-2 sentences). Summarize what was uncovered (1-2 sentences). Recommend path (2-3 sentences). Warm handoff (1-2 sentences). LENGTH LIMIT: 6-10 sentences total. |
| **This response** | 8 sentences ✓ |

---

## Summary: What the System Did

| Turn | Action | Why |
|------|--------|-----|
| 1-4 | `explore` | Gathering context, forming hypothesis |
| 5-8 | `explore` | Deepening, stress-testing for psychology |
| 9 | `surface_contradiction` | Challenging the "no time" framing |
| 10-11 | `reflect_insight` | Mirroring back the breakthrough |
| 12-14 | `explore` | Building on the insight |
| 15 | `request_diagnosis_consent` | Asking permission before diagnosis |
| 17 | `diagnose` | Sharing the constraint clearly |
| 19-20 | `explore` | Letting him process, checking readiness |
| 21 | `check_blockers` | Final gate before closing |
| 25 | `complete_with_handoff` | Clean transition to summary/booking |

---

## Key Behaviors to Note

1. **Mira didn't push** - She asked questions and let David arrive at his own conclusions
2. **The breakthrough came from him** - "You're absolutely right about the tradeoffs"
3. **Consent gates worked** - Asked permission before diagnosis
4. **Constraint stayed stable** - EXECUTION throughout, no drift to PSYCHOLOGY
5. **Closing was brief** - 8 sentences, not a wall of text
6. **No premature CTA** - Booking language only appeared in the final turn

---

## Questions for Danny

1. Does the conversation flow feel natural?
2. Does the closing (Turn 25) feel like how an enrollment professional would handle it?
3. Any specific language you'd change?
4. Should the diagnosis (Turn 17) be shorter or longer?
