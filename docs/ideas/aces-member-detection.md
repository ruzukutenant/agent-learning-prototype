# ACES Member Detection & Alternative Closing Path

**Status:** Deferred (Jan 29, 2026) - Low frequency scenario, not worth the complexity right now.

## Problem
When a user mentions they're already in the ACES program, Mira still pitches a free strategy call. Instead, ACES members should be offered a summary email they can forward to their ACES coach.

## Approach
Track `is_aces_member` as a persistent flag on `ConversationState`. Detect it anytime via unified analysis. When the closing sequence reaches the offer/facilitate phases, skip the call pitch and instead offer to send a summary email. Auto-send if email is already known.

---

## Files to modify

### 1. `server/src/orchestrator/core/types.ts`
- Add `is_aces_member: boolean` to `ConversationState` (next to `user_name`)
- Add `is_aces_member: boolean` to `explicit` field of `UnifiedAnalysis`

### 2. `server/src/orchestrator/core/unified-analysis.ts`
- Add `is_aces_member` to the JSON schema in the prompt (~line 84)
- Add field guidance (~line 155): detect mentions of ACES, "I'm already in the program", "I'm an ACES member", etc.

### 3. `server/src/orchestrator/conversation/orchestrator.ts`
- Add `is_aces_member: false` to initial state (~line 1261 area)
- In state update logic (~line 300), persist `is_aces_member` when detected:
  ```
  if (analysis.explicit.is_aces_member) {
    updatedState.is_aces_member = true
  }
  ```

### 4. `server/src/orchestrator/core/decision-engine.ts`
- In `makeClosingDecision()`, add an early check before PATH 2 (Turn D):
  ```
  // ACES MEMBER: Skip call pitch, go straight to facilitate with ACES overlay
  if (state.is_aces_member && ['assert_and_align', 'offer_solution'].includes(currentPhase)) {
    return {
      action: 'closing_facilitate',
      reasoning: 'ACES member - skipping call pitch, offering summary for their coach',
      prompt_overlays: ['closing_facilitate_aces'],
      available_tools: [],
      confidence: 0.95
    }
  }
  ```
- Also handle the case where ACES is detected *before* closing (during exploration/diagnosis). In `makeDecision()`, when `is_aces_member` is first detected and we're already in closing, the above handles it. If detected during non-closing, it just gets tracked and kicks in when closing starts.

### 5. `server/src/orchestrator/core/prompt-builder.ts`
- Add `closing_facilitate_aces` overlay:
  - Acknowledge they're already in ACES -- great, they have support
  - Offer to send a summary of everything uncovered so they can share it with their ACES coach
  - "I'll put together a summary of what we uncovered -- your constraint, the key insights, and recommended focus areas. You can share it with your ACES coach so they have full context."
  - If they already provided email: "I'll send it to [email] now."
  - Keep it brief, warm, no call pitch
  - Do NOT suggest they need additional help beyond ACES

### 6. `server/src/orchestrator/conversation/orchestrator.ts` (closing handling)
- When action is `closing_facilitate` and `state.is_aces_member`:
  - Still set `closing_arc_complete = true` and `facilitation_offered = true`
  - Show `view_summary` component as normal
  - The overlay handles the messaging difference

### 7. `server/src/services/orchestratorService.ts`
- When completing an ACES member session and email is known, auto-trigger the summary email send
- Set `endpoint_selected` to `null` (or a new value like `'ACES'`) since they're not being routed to EC or MIST

---

## Verification
1. Run David simulation with an ACES mention mid-conversation -- confirm it tracks `is_aces_member`
2. Manual test: complete a conversation, mention "I'm in ACES" when the call is offered -- confirm Mira skips the pitch and offers summary email instead
3. Build passes: `npm run build`
