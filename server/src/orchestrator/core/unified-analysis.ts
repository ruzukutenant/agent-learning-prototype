// Unified Analysis - Single LLM call replacing separate signals, inference, and consent detection
// Key innovation: Separates EXPLICIT statements from INFERRED signals
// Explicit statements always override inferred signals

import Anthropic from '@anthropic-ai/sdk'
import { geminiJSON, isGeminiAvailable } from './gemini-client.js'
import type {
  UnifiedAnalysis,
  EffectiveState,
  ConversationState,
  Message,
  ReadinessLevel
} from './types.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const UNIFIED_ANALYSIS_PROMPT = `You are analyzing a turn in a coaching conversation. Your job is to extract signals about the user's state.

CRITICAL DISTINCTION: Separate what you INFER from patterns vs what they EXPLICITLY STATED.

Examples:
- "I'm feeling overwhelmed" = EXPLICIT overwhelm (they said it)
- Lots of scattered topics = INFERRED overwhelm (pattern, but they didn't say it)
- "I have the time and money" = EXPLICIT high capacity (they said it)
- They seem busy = INFERRED low capacity (pattern, but they didn't say it)
- "I'm ready" = EXPLICIT readiness (they said it)
- They sound enthusiastic = INFERRED readiness (pattern, but they didn't say it)

EXPLICIT STATEMENTS ALWAYS OVERRIDE INFERENCES.

## Conversation Context
Phase: {{phase}}
Turn: {{turn}}
Current hypothesis: {{hypothesis}} ({{confidence}} confidence)
Hypothesis validated: {{validated}}
Diagnosis delivered: {{diagnosis_delivered}}
Consent requested: {{consent_requested}}
Topics covered: {{topics}}

IMPORTANT: The current hypothesis should be respected unless there's clear evidence it's WRONG.
- If current hypothesis is "execution" - only change to psychology if they explicitly state they HAVE capacity but fear stops them
- If current hypothesis is "psychology" - only change to execution if they reveal they're at MAX capacity
- Emotions surfacing during conversation do NOT change the root constraint

## Latest User Message
{{message}}

## Recent Conversation History (last 3 turns)
{{history}}

## Your Analysis

Before outputting JSON, reason through these questions in your head:
1. What explicit statements did the user make? (These override any inferences)
2. What is the ROOT CAUSE of their stuck-ness?
3. Is there strong evidence to change the current hypothesis?

CONSTRAINT CATEGORIZATION GUIDE (critical for correct routing):
- EXECUTION: Operational capacity is the bottleneck - working 60+ hours, drowning in work, turning away clients, can't hire/delegate. Even if emotions surface, if the ROOT issue is bandwidth, it's execution.
- PSYCHOLOGY: They HAVE capacity but fear/doubt stops action - afraid of judgment, imposter syndrome, perfectionism, "I know what to do but don't do it because [fear]"
- STRATEGY: Confusion about direction - unclear positioning, don't know who to serve, can't pick a niche, multiple options but can't commit

Include your reasoning in the "reasoning" field of the JSON output.

Respond with JSON only (no markdown code blocks):

{
  "signals": {
    "clarity": "low" | "medium" | "high",
    "confidence": "low" | "medium" | "high",
    "capacity": "low" | "medium" | "high",
    "overwhelm": true | false,
    "emotional_intensity": 0-5
  },
  "explicit": {
    "stated_ready": true | false,
    "stated_no_blockers": true | false,
    "stated_blockers": ["blocker1", "blocker2"] | null,
    "asked_for_next_steps": true | false,
    "gave_consent": true | false,
    "alignment_expressed": true | false,
    "hesitation_expressed": true | false,
    "agreed_to_offering": true | false,
    "declined_offering": true | false,
    "financial_constraint": true | false,
    "explicit_request": "summary" | "next_steps" | "booking" | "resource" | null
  },
  "constraint": {
    "category": "strategy" | "execution" | "psychology" | null,
    "confidence": 0.0-1.0,
    "evidence": "Brief quote or paraphrase supporting this"
  },
  "insights": {
    "breakthrough_detected": true | false,
    "insight_phrases": ["phrase1", "phrase2"],
    "ownership_language": true | false,
    "meta_cognition": true | false
  },
  "tensions": {
    "contradiction_detected": true | false,
    "resistance_to_hypothesis": true | false,
    "stress_test_passed": true | false
  },
  "tactical": {
    "is_tactical_request": true | false,
    "tactical_topic": "scheduling" | "naming" | "design" | "pricing" | "tool_selection" | "logistics" | null
  },
  "engagement": {
    "low_effort": true | false,
    "meaningful_despite_short": true | false,
    "surface_deflection": true | false
  },
  "cross_mapping": {
    "upstream_signal_detected": true | false,
    "apparent_vs_root": "execution_from_strategy" | "strategy_from_psychology" | "psychology_from_execution" | null,
    "evidence": "Brief explanation of why the apparent constraint traces to a different root"
  },
  "exit_intent": true | false,
  "relationship": {
    "engagement": "high" | "medium" | "low" | "resistant",
    "trust_level": "establishing" | "building" | "established" | "damaged",
    "disposition": "collaborative_explorer" | "direct_pragmatist" | "skeptical_evaluator" | "emotionally_processing",
    "process_frustration": "none" | "mild" | "significant" | "hostile",
    "frustration_target": "process" | "mira" | "self" | "situation" | null
  },
  "reasoning": "1-2 sentence explanation"
}

## Field Guidance:

**signals.clarity**: How clear are they on what's actually blocking them?
- low: vague, surface-level, can't articulate the real issue
- medium: some clarity, circling around it
- high: can name the specific issue clearly

**signals.confidence**: How confident do they seem about moving forward?
- low: hesitant, doubtful, lots of "maybe" or "I don't know"
- medium: mixed signals, some confidence some doubt
- high: decisive language, clear commitment

**signals.capacity**: Do they seem to have bandwidth (time/money/energy)?
- low: mentions being stretched, busy, tight on money, exhausted
- medium: neutral or mixed signals
- high: seems to have room, mentions availability

**signals.overwhelm**: Are they emotionally flooded right now?
- true: can't focus, spinning, highly activated, distressed
- false: regulated, can engage with questions

**explicit.stated_ready**: Did they SAY they're ready?
- "I'm ready", "Let's do this", "Yes, I want to move forward", "Absolutely yes"
- Must be an explicit statement, not just enthusiasm

**explicit.stated_no_blockers**: Did they SAY there are no blockers?
- "Nothing's stopping me", "No real barriers", "I have the time", "Money isn't an issue"
- "Nothing substantial" counts as no blockers

**explicit.stated_blockers**: Did they NAME specific blockers? List them if so.
- "I can't afford it", "I don't have time", "I need to check with my partner"

**explicit.asked_for_next_steps**: Did they ASK what to do next?
- "What now?", "How do we proceed?", "What's the path forward?", "What do I do first?"

**explicit.gave_consent**: Did they give permission for diagnosis? (only check if consent was requested)
- "Yes", "Tell me", "I want to hear it", "Share what you see"

**explicit.alignment_expressed**: Did they use STRONG VALIDATION language confirming your specific framing?
- TRUE: "That's exactly it", "You nailed it", "That's spot on", "100%", "You're absolutely right"
- TRUE: Strong ownership of YOUR framing: "That's what I've been trying to say"
- FALSE: "Yes" or "yeah" alone (acknowledgment, not validation)
- FALSE: "That makes sense" (understanding, not validation)
- FALSE: "I think so" (tentative)
- FALSE: Continuing the conversation with new information (even if agreeable in tone)
- Should be TRUE in roughly 10-15% of turns, not most turns
- When in doubt, return FALSE

**explicit.hesitation_expressed**: Did they express uncertainty, reluctance, or desire to delay?
- "I'm not sure", "Maybe", "I need to think about it", "Let me consider"
- "That's a lot to process", "I don't know if I'm ready", "Not right now"
- "I'm hesitant", "I'm on the fence"

**explicit.agreed_to_offering**: Did they EXPLICITLY ACCEPT a proposed call, session, or next step?
CRITICAL: This is ONLY true when the user accepts an offer that was made to them.

TRUE examples (accepting an offered call/session):
- "Yes, I'd like to do that" (after being offered a call)
- "Sure, let's set it up"
- "That sounds helpful, I'm interested"
- "Yes, I'd be open to that"
- "Okay, let's do the call"

FALSE examples (NOT accepting an offering):
- "I feel confident now" (expressing self-confidence, not accepting anything)
- "That makes sense" (agreement with an idea, not accepting an offering)
- "I'm aligned with my approach" (talking about their own alignment)
- "I don't feel wobbly anymore" (expressing personal confidence)
- General positive statements that aren't accepting a specific offered next step

The key distinction: Are they accepting something OFFERED TO THEM, or just expressing their own state/feelings?

**explicit.declined_offering**: Did they EXPLICITLY DECLINE a proposed call, session, or next step?
TRUE examples (clearly saying no to an offer):
- "No thanks, I'm good"
- "I don't think I need that right now"
- "I'm good for now, thanks"
- "I'll pass on that"
- "I don't think that's for me"
- "No, I think I've got what I need"

FALSE examples (NOT declining):
- "I'm not sure about the timing" (hesitation, not a clear decline)
- "Let me think about it" (deferring, not declining)
- General uncertainty or hedging

The key distinction: Are they clearly saying NO to an offered next step, or just expressing uncertainty?

**explicit.financial_constraint**: Did they EXPLICITLY mention financial limitations?
- true: "I can't afford that", "tight budget", "bootstrapping", "need to be careful with money", "not in a position to invest", "debt", "funds are tight", "that's too expensive"
- false: General caution, hesitation, or reluctance that isn't specifically about money
- Must be an explicit statement about money/budget/cost, not inferred from general caution

**explicit.explicit_request**: Did they explicitly ask for something specific?
- "summary": "Can I see a summary?", "Show me what you found", "What did we uncover?"
- "next_steps": "What now?", "What's next?", "How do we proceed?"
- "booking": "Can I book a call?", "How do I schedule?", "I want to talk more"
- "resource": "Do you have resources?", "Can you send me something?"
- null: No explicit request made

**constraint.category** - What is the ROOT CAUSE of their stuck-ness?

Ask: "If we removed the emotional layer, what is STRUCTURALLY blocking them?"

- **strategy**: No clear direction - they don't know WHO they serve, WHAT to offer, or HOW to position. They're confused about the path forward.

- **execution**: At OPERATIONAL CAPACITY - they know exactly what to do, are confident in their abilities, but are PHYSICALLY MAXED OUT. They need systems, processes, delegation, hiring, or automation. The bottleneck is bandwidth, not fear.
  - Key indicator: "I'm working 60 hours", "I can't take on more clients", "I know I need to hire/systematize but there's no time"
  - EVEN IF they discuss identity/permission during conversation, if the root problem is operational capacity, it's execution.

- **psychology**: FEAR/DOUBT is the blocker - they HAVE the capacity (time, money, bandwidth) but DON'T ACT due to internal resistance. Fear of judgment, imposter syndrome, perfectionism, self-doubt, or permission issues.
  - Key indicator: "I COULD do X but I don't because [fear/doubt]", underselling themselves, avoiding visibility
  - The bottleneck is internal, not operational.

- null: not enough information yet

## CRITICAL DISTINCTION ##
EXECUTION users may DISCUSS emotions/identity during conversation (insights naturally surface), but if their ACTUAL BLOCK is operational capacity, the constraint is EXECUTION.

Example - EXECUTION (not psychology):
- "I'm drowning in client work, 60 hours a week, turning away clients"
- Later says: "I realized systematizing feels like a betrayal of my craft"
- This is STILL execution - the identity insight surfaced, but the ROOT BLOCK is operational.

Example - PSYCHOLOGY:
- "I have bandwidth and could take on bigger clients, but I keep underselling"
- "I'm afraid if I charge more, I'll be exposed as not worth it"
- This is psychology - they HAVE capacity but fear blocks action.

**insights.breakthrough_detected**: Did they have an "aha" moment or express sudden clarity?

**insights.insight_phrases**: Specific phrases showing discovery (quote them)
- IMPORTANT: Always use gender-neutral language ("they/them/their") - never assume gender
- Example: "they realized they deserve their role" NOT "she realized she deserves her role"

**insights.ownership_language**: Do they own the insight? ("that's exactly it", "I know", "definitely")

**insights.meta_cognition**: Do they question their own framing or self-correct?

**tensions.contradiction_detected**: Is there internal contradiction in their message?

**tensions.resistance_to_hypothesis**: Are they pushing back on an idea presented?

**tensions.stress_test_passed**: If hypothesis was presented, are they confirming it holds up?

**tactical.is_tactical_request**: Is the user asking you to help with a specific tactical/logistical decision?

TRUE examples (asking you to solve a logistical detail):
- "Can you help me pick times for my sessions?"
- "What should I name this program?"
- "Should I use Zoom or Google Meet?"
- "Should I bold the checkbox on my checkout page?"

FALSE examples (diagnostic, even if the topic is logistical):
- "I keep going back and forth on scheduling and can't commit" (reveals decision paralysis)
- "I'm overwhelmed by all the decisions I have to make" (reveals overwhelm pattern)
- "Every time I try to launch, I find something else to fix" (reveals perfectionism pattern)

The key distinction: Are they asking you to MAKE a decision for them (tactical), or describing a PATTERN of being stuck (diagnostic)?
Brief tactical mentions within a longer diagnostic answer = false.

**cross_mapping**: Does the user's stated problem trace to a DIFFERENT root constraint?
- execution_from_strategy: Scattered tactics / trying everything → actually lacks clear positioning
- strategy_from_psychology: Can't decide / paralyzed → actually fear or burnout blocking clarity
- psychology_from_execution: Burned out / depleted → actually broken systems causing unsustainability
- Set upstream_signal_detected=false if the apparent constraint IS the root constraint

**engagement.low_effort**: Is the response non-substantive and disengaged?
- true: "fine", "yeah", "not sure", "ok", "good", "I guess", "idk" — short responses with no real content
- false: Any response with meaningful content, emotional depth, or genuine engagement

**engagement.meaningful_despite_short**: Is the response short BUT emotionally loaded or substantive?
- true: "I'm scared", "I'm stuck", "I'm lost", "that hit hard" — brief but deeply meaningful
- false: Most responses — either they're long enough or they're genuinely low-effort

**engagement.surface_deflection**: Is the response an articulate but shallow explanation that avoids the deeper issue?
- true: Plausible-sounding reasons that could mask a deeper constraint:
  - "I just haven't had time" (could be avoidance)
  - "I need to do more research first" (could be perfectionism or fear)
  - "The market isn't ready" (could be unclear positioning)
  - "I'm waiting for the right moment" (could be fear of launching)
  - "I just need to finish X first" (could be hiding behind preparation)
- false: Genuine engagement with substance, or an answer that goes beneath the surface
- This is NOT the same as low_effort — surface deflections are articulate and complete, they just stay on the surface
- Only mark true when a plausible explanation is given WITHOUT any self-reflection or deeper exploration

**exit_intent**: Is the user trying to END the conversation?
- true: "We're done here", "I'm leaving", "Goodbye", "This is a waste of time, I'm out", "I'm signing off", "I'm moving on", repeated farewell language
- true: User has already said goodbye in a previous turn and is saying goodbye AGAIN
- false: Normal conversation, even if they're frustrated or critical
- false: "I need to think about it" (deferring, not leaving)
- The key distinction: Are they ENDING the conversation, or just expressing an opinion within it?

## Relationship Assessment

Assess the QUALITY OF THE WORKING RELATIONSHIP between user and advisor, not just the content of what they're saying. Consider the TRAJECTORY across recent messages, not just the current one.

**relationship.engagement**: How invested is the user in this process?
- "high": Detailed, thoughtful responses. Building on advisor's observations. Asking questions back.
- "medium": Answering adequately. Functional but not going beyond what's asked.
- "low": Short, minimal answers ("yeah", "fine", "I guess"). Going through the motions. NOT the same as a brief-but-meaningful answer like "I'm scared."
- "resistant": Actively pushing back on the process itself, questioning why they're here, or refusing to engage with the format.

**relationship.trust_level**: Has the advisor earned the right to offer reframes and deeper observations?
- "establishing": Early conversation OR advisor hasn't yet demonstrated deep understanding. User is providing information but hasn't confirmed the advisor "gets" them.
- "building": User has confirmed the advisor's understanding 1-2 times (e.g., "exactly", "that's it", "you nailed it"). Advisor has shown they understand implications, not just surface facts.
- "established": Multiple confirmed moments of deep understanding. User is sharing freely, building on advisor's observations, treating them as a trusted thought partner.
- "damaged": User has criticized the advisor's approach, said the advisor misunderstood them, expressed frustration WITH THE ADVISOR (not their business situation), or felt dismissed/deflected. Trust needs to be repaired before proceeding.

IMPORTANT: Trust is built by demonstrated DEEPER understanding (connecting dots, naming implications), NOT by repeating what was said. A turn where the advisor just echoed the user back does NOT build trust.

**relationship.disposition**: What style of engagement does this user expect?
- "collaborative_explorer": Open, reflective, willing to be guided through discovery. Gives detailed, emotionally open responses. Most users.
- "direct_pragmatist": Concise, business-like, wants answers not questions. Values efficiency. Gets impatient with probing when they've already been clear. If they ask "what do you think?", they want a direct answer.
- "skeptical_evaluator": Guard is up. Testing the tool. May reference prior experiences with similar tools. Looking for proof of value before committing.
- "emotionally_processing": Using the conversation to work through feelings. Long, emotional, reflective responses. Needs space and validation more than frameworks.

Assess from BOTH style and content. Short, information-dense responses = direct_pragmatist. Long, exploratory, feeling-oriented = emotionally_processing. This CAN shift mid-conversation.

IMPORTANT: A user can be BOTH direct AND skeptical. The key differentiator for skeptical_evaluator is whether they are EVALUATING or QUESTIONING the tool/process itself. Look for:
- References to past experiences with similar tools or coaching ("I've been working with coaches for a year", "I've tried this before")
- Questioning the methodology or value proposition ("Is this going to be different?", "What's your methodology?")
- Testing or challenging the advisor's credibility ("Can you actually help?", "This feels like a sales pitch")
- Comparing this to other approaches or expressing that something is missing
If a user is direct AND shows these evaluation signals, classify as skeptical_evaluator, not direct_pragmatist.

**relationship.process_frustration**: Is the user annoyed at the ADVISOR or the PROCESS (not their business situation)?
- "none": Normal conversation. Even if they're frustrated about their business, they're engaged with the process.
- "mild": Impatience signals. Shortening responses after previously detailed ones. "Just tell me." Repeating a question the advisor didn't answer directly.
- "significant": Direct criticism of the process or advisor. "This isn't helpful." "You're going in circles." "You're not listening." "This feels like a sales pitch."
- "hostile": Personal attacks, insults, aggressive language directed at the advisor. "You're being condescending." Profanity directed at the advisor.

CRITICAL DISTINCTION: "I'm so frustrated I can't figure this out" = frustration with SITUATION (not process frustration). "I'm frustrated that you keep asking me the same thing" = frustration with PROCESS. Attribute correctly.

**relationship.frustration_target**: WHO or WHAT is the frustration directed at?
- "process": The methodology, format, or approach. "This isn't working."
- "mira": The advisor personally. "You're not listening." "You're being condescending."
- "self": Self-directed. "I should know this by now." "I feel stupid."
- "situation": Their business/life situation. "I'm so stuck." "Everything is hard."
- null: No frustration detected.`

/**
 * Run unified analysis on user message
 * Replaces separate detectSignals, inferState, and detectConsent calls
 */
export async function runUnifiedAnalysis(
  userMessage: string,
  history: Message[],
  state: ConversationState
): Promise<UnifiedAnalysis> {

  // Build recent history string (last 3 exchanges = 6 messages)
  const recentHistory = history.slice(-6).map(m =>
    `${m.role.toUpperCase()}: ${m.content.substring(0, 300)}${m.content.length > 300 ? '...' : ''}`
  ).join('\n\n')

  const prompt = UNIFIED_ANALYSIS_PROMPT
    .replace('{{phase}}', state.phase)
    .replace('{{turn}}', String(state.turns_total + 1))
    .replace('{{hypothesis}}', state.constraint_hypothesis || 'none')
    .replace('{{confidence}}', String(state.hypothesis_confidence || 0))
    .replace('{{validated}}', String(state.hypothesis_validated))
    .replace('{{diagnosis_delivered}}', String(state.diagnosis_delivered))
    .replace('{{consent_requested}}', String(state.consent_state.diagnosis_requested))
    .replace('{{topics}}', state.conversation_memory?.topics_explored?.slice(-5).join(', ') || 'none yet')
    .replace('{{message}}', userMessage)
    .replace('{{history}}', recentHistory || 'No previous history')

  // Try Gemini Flash first (faster and cheaper)
  if (isGeminiAvailable()) {
    try {
      const result = await geminiJSON<UnifiedAnalysis>(prompt, {
        systemPrompt: 'You are a conversation analyzer. Return only valid JSON.',
        maxTokens: 1200
      })
      console.log('[UnifiedAnalysis] Gemini result:', summarizeAnalysis(result))
      return validateAndFillDefaults(result)
    } catch (error) {
      console.warn('[UnifiedAnalysis] Gemini failed, falling back to Haiku:', error)
    }
  }

  // Fallback to Haiku (temperature 0 for consistent analysis, matching Gemini's 0.1)
  // Use assistant prefill to force JSON output (prevents preamble text)
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    temperature: 0,
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: '{' }  // Prefill forces JSON start
    ]
  })

  // Response continues from prefill, so prepend '{' to get complete JSON
  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
  const text = '{' + responseText

  try {
    // Strip markdown code blocks if present (shouldn't occur with prefill, but safety check)
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanText) as UnifiedAnalysis
    console.log('[UnifiedAnalysis] Haiku result:', summarizeAnalysis(parsed))
    return validateAndFillDefaults(parsed)
  } catch (error) {
    console.error('[UnifiedAnalysis] Failed to parse response:', error)
    console.error('[UnifiedAnalysis] Raw response:', text.substring(0, 500))
    return getDefaultAnalysis()
  }
}

/**
 * Resolve effective state by combining inferred + explicit
 * EXPLICIT STATEMENTS ALWAYS OVERRIDE INFERRED SIGNALS
 *
 * CONSTRAINT-AWARE OVERWHELM: Execution constraint users often express
 * frustration without being emotionally flooded. Psychology constraint
 * users are more likely to have actual emotional overwhelm.
 */
export function resolveEffectiveState(
  analysis: UnifiedAnalysis,
  currentConstraint?: string | null
): EffectiveState {
  const { signals, explicit } = analysis

  // Capacity: explicit overrides inferred
  let effectiveCapacity: ReadinessLevel = signals.capacity
  if (explicit.stated_ready || explicit.stated_no_blockers) {
    // User explicitly stated they're ready or have no blockers → high capacity
    effectiveCapacity = 'high'
  } else if (explicit.stated_blockers && explicit.stated_blockers.length > 0) {
    // User explicitly named blockers → low capacity
    effectiveCapacity = 'low'
  }

  // Ready to close: explicit signals only
  // User must have explicitly asked for next steps OR stated they're ready
  const readyToClose = explicit.stated_ready || explicit.asked_for_next_steps

  // Blockers
  const hasBlockers = explicit.stated_blockers !== null && explicit.stated_blockers.length > 0

  // CONSTRAINT-AWARE OVERWHELM DETECTION
  // Execution users: Frustration is normal, require intensity >= 4 for true overwhelm
  // Psychology users: Emotional flooding is the issue, intensity >= 3 is significant
  // Unknown/Strategy: Use default threshold of 3
  const constraintCategory = currentConstraint || analysis.constraint.category
  let overwhelmThreshold: number

  if (constraintCategory === 'execution') {
    // Execution users express logistical frustration, not emotional flooding
    // Require higher threshold to avoid false positives
    overwhelmThreshold = 4
  } else if (constraintCategory === 'psychology') {
    // Psychology users may have actual emotional overwhelm
    // Use lower threshold since it's more relevant
    overwhelmThreshold = 3
  } else {
    // Default threshold for strategy or unknown
    overwhelmThreshold = 3
  }

  const overwhelm = signals.overwhelm && signals.emotional_intensity >= overwhelmThreshold

  console.log('[EffectiveState] Resolved:', {
    capacity: effectiveCapacity,
    readyToClose,
    hasBlockers,
    overwhelm,
    overwhelmThreshold,
    constraint: constraintCategory,
    explicit_overrides: explicit.stated_ready || explicit.stated_no_blockers
  })

  return {
    clarity: signals.clarity,
    confidence: signals.confidence,
    capacity: effectiveCapacity,
    overwhelm,
    ready_to_close: readyToClose,
    has_blockers: hasBlockers,
    blockers: explicit.stated_blockers,
    consent_given: explicit.gave_consent
  }
}

/**
 * Update constraint hypothesis with sticky logic
 * Requires strong evidence to change once established at high confidence
 */
export function updateStickyHypothesis(
  currentHypothesis: string | null,
  currentConfidence: number,
  newAnalysis: UnifiedAnalysis
): { hypothesis: string | null; confidence: number } {

  const newCategory = newAnalysis.constraint.category
  const newConfidence = newAnalysis.constraint.confidence

  // If user is resisting the current hypothesis, reduce confidence
  if (newAnalysis.tensions.resistance_to_hypothesis && currentHypothesis) {
    const reducedConfidence = Math.max(currentConfidence - 0.15, 0.3)
    console.log(`[StickyHypothesis] Resistance detected - reducing confidence: ${currentConfidence.toFixed(2)} → ${reducedConfidence.toFixed(2)}`)
    currentConfidence = reducedConfidence
  }

  // No new hypothesis from analysis
  if (!newCategory) {
    return { hypothesis: currentHypothesis, confidence: currentConfidence }
  }

  // No established hypothesis - accept new one
  if (!currentHypothesis || currentConfidence < 0.5) {
    console.log(`[StickyHypothesis] Accepting new: ${newCategory} (${newConfidence.toFixed(2)})`)
    return { hypothesis: newCategory, confidence: newConfidence }
  }

  // Same hypothesis - update confidence to max
  if (newCategory === currentHypothesis) {
    const maxConfidence = Math.max(currentConfidence, newConfidence)
    return { hypothesis: currentHypothesis, confidence: maxConfidence }
  }

  // Cross-mapping stabilizer: if cross_mapping confirms current hypothesis, keep it
  if (newAnalysis.cross_mapping?.upstream_signal_detected &&
      newAnalysis.cross_mapping.apparent_vs_root) {
    const upstreamMap: Record<string, string> = {
      'strategy_from_psychology': 'strategy',
      'execution_from_strategy': 'execution',
      'psychology_from_execution': 'psychology'
    }
    const trueRoot = upstreamMap[newAnalysis.cross_mapping.apparent_vs_root]
    if (trueRoot === currentHypothesis && newCategory !== currentHypothesis) {
      console.log(`[StickyHypothesis] Cross-mapping confirms current ${currentHypothesis} - ignoring ${newCategory}`)
      return { hypothesis: currentHypothesis, confidence: Math.max(currentConfidence, 0.75) }
    }
  }

  // Different hypothesis - require +15% confidence to change
  // Use +15% (not +20%) to allow correction of early wrong detections
  // Also: if new confidence is 1.0 (maximum), always allow override
  const changeThreshold = Math.min(currentConfidence + 0.15, 0.95)  // Cap threshold at 0.95

  if (newConfidence >= changeThreshold || newConfidence >= 1.0) {
    console.log(`[StickyHypothesis] Changing: ${currentHypothesis} → ${newCategory} (${newConfidence.toFixed(2)} >= ${changeThreshold.toFixed(2)})`)
    return { hypothesis: newCategory, confidence: newConfidence }
  }

  // Not enough evidence to change - keep current
  console.log(`[StickyHypothesis] Keeping: ${currentHypothesis} (new ${newCategory} at ${newConfidence.toFixed(2)} < threshold ${changeThreshold.toFixed(2)})`)
  return { hypothesis: currentHypothesis, confidence: currentConfidence }
}

/**
 * Validate analysis and fill in defaults for missing fields
 */
function validateAndFillDefaults(analysis: Partial<UnifiedAnalysis>): UnifiedAnalysis {
  return {
    signals: {
      clarity: analysis.signals?.clarity || 'medium',
      confidence: analysis.signals?.confidence || 'medium',
      capacity: analysis.signals?.capacity || 'medium',
      overwhelm: analysis.signals?.overwhelm || false,
      emotional_intensity: analysis.signals?.emotional_intensity || 1
    },
    explicit: {
      stated_ready: analysis.explicit?.stated_ready || false,
      stated_no_blockers: analysis.explicit?.stated_no_blockers || false,
      stated_blockers: analysis.explicit?.stated_blockers || null,
      asked_for_next_steps: analysis.explicit?.asked_for_next_steps || false,
      gave_consent: analysis.explicit?.gave_consent || false,
      alignment_expressed: analysis.explicit?.alignment_expressed || false,
      hesitation_expressed: analysis.explicit?.hesitation_expressed || false,
      agreed_to_offering: analysis.explicit?.agreed_to_offering || false,
      declined_offering: analysis.explicit?.declined_offering || false,
      financial_constraint: analysis.explicit?.financial_constraint || false,
      explicit_request: analysis.explicit?.explicit_request || null
    },
    constraint: {
      category: analysis.constraint?.category || null,
      confidence: analysis.constraint?.confidence || 0,
      evidence: analysis.constraint?.evidence || ''
    },
    insights: {
      breakthrough_detected: analysis.insights?.breakthrough_detected || false,
      insight_phrases: analysis.insights?.insight_phrases || [],
      ownership_language: analysis.insights?.ownership_language || false,
      meta_cognition: analysis.insights?.meta_cognition || false
    },
    tensions: {
      contradiction_detected: analysis.tensions?.contradiction_detected || false,
      resistance_to_hypothesis: analysis.tensions?.resistance_to_hypothesis || false,
      stress_test_passed: analysis.tensions?.stress_test_passed || false
    },
    tactical: {
      is_tactical_request: analysis.tactical?.is_tactical_request ?? false,
      tactical_topic: analysis.tactical?.tactical_topic ?? null
    },
    engagement: {
      low_effort: analysis.engagement?.low_effort ?? false,
      meaningful_despite_short: analysis.engagement?.meaningful_despite_short ?? false,
      surface_deflection: analysis.engagement?.surface_deflection ?? false
    },
    cross_mapping: {
      upstream_signal_detected: analysis.cross_mapping?.upstream_signal_detected ?? false,
      apparent_vs_root: analysis.cross_mapping?.apparent_vs_root ?? null,
      evidence: analysis.cross_mapping?.evidence ?? ''
    },
    exit_intent: analysis.exit_intent ?? false,
    relationship: {
      engagement: analysis.relationship?.engagement || 'medium',
      trust_level: analysis.relationship?.trust_level || 'establishing',
      disposition: analysis.relationship?.disposition || 'collaborative_explorer',
      process_frustration: analysis.relationship?.process_frustration || 'none',
      frustration_target: analysis.relationship?.frustration_target || null,
    },
    reasoning: analysis.reasoning || 'Analysis completed'
  }
}

/**
 * Get default analysis for error cases
 */
function getDefaultAnalysis(): UnifiedAnalysis {
  return validateAndFillDefaults({})
}

/**
 * Summarize analysis for logging
 */
function summarizeAnalysis(analysis: UnifiedAnalysis): object {
  return {
    signals: analysis.signals,
    explicit: analysis.explicit,
    constraint: `${analysis.constraint.category || 'none'} (${analysis.constraint.confidence.toFixed(2)})`,
    insights: analysis.insights.breakthrough_detected ? 'breakthrough' : 'none',
    tensions: analysis.tensions.contradiction_detected ? 'contradiction' : 'none',
    cross_mapping: analysis.cross_mapping.upstream_signal_detected
      ? `${analysis.cross_mapping.apparent_vs_root}: ${analysis.cross_mapping.evidence}`
      : 'none',
    relationship: `eng=${analysis.relationship.engagement} trust=${analysis.relationship.trust_level} disp=${analysis.relationship.disposition} frust=${analysis.relationship.process_frustration}`
  }
}
