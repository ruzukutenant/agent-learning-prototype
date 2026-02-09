// Containment protocols - detect and respond to emotional overwhelm

import type { ConversationSignals, ConversationState, EmotionalCharge } from '../core/types.js'

/**
 * Detect if containment is needed
 * Containment = pause exploration, validate feelings, simplify focus
 */
export function needsContainment(
  signals: ConversationSignals,
  state: ConversationState
): boolean {

  // COOLDOWN: Don't trigger containment if we just did it (need 2 turns minimum)
  if (state.turns_since_containment < 2) {
    return false
  }

  // Explicit overwhelm detected
  if (signals.overwhelm_detected) {
    return true
  }

  // Multiple emotional markers + low capacity
  if (signals.emotional_markers.length >= 3 && signals.capacity_signals.length >= 1) {
    return true
  }

  // High emotional charge already tracked
  if (state.emotional_charge === 'high') {
    return true
  }

  // Contradiction + emotional markers (sign of confusion + stress)
  if (signals.contradiction_detected && signals.emotional_markers.length >= 2) {
    return true
  }

  return false
}

/**
 * Calculate emotional charge level
 */
export function calculateEmotionalCharge(
  signals: ConversationSignals,
  previousCharge: EmotionalCharge
): EmotionalCharge {

  const markerCount = signals.emotional_markers.length
  const capacityCount = signals.capacity_signals.length
  const overwhelmPresent = signals.overwhelm_detected

  // High charge: overwhelm OR many markers
  if (overwhelmPresent || markerCount >= 3) {
    return 'high'
  }

  // Moderate charge: some markers + capacity signals
  if (markerCount >= 1 || capacityCount >= 1) {
    return 'moderate'
  }

  // Otherwise maintain or reduce to neutral
  return previousCharge === 'high' ? 'moderate' : 'neutral'
}

/**
 * Determine if containment mode should continue
 * Stay in containment until emotional charge reduces
 */
export function shouldContinueContainment(
  currentCharge: EmotionalCharge,
  turnsInContainment: number
): boolean {

  // If still high charge, continue containment
  if (currentCharge === 'high') {
    return true
  }

  // If moderate charge but just entered, give it one more turn
  if (currentCharge === 'moderate' && turnsInContainment === 1) {
    return true
  }

  // Otherwise exit containment
  return false
}

/**
 * Determine containment strategy
 */
export function getContainmentStrategy(
  signals: ConversationSignals
): 'validate' | 'simplify' | 'pause' {

  // If validation-seeking, validate first
  if (signals.validation_seeking) {
    return 'validate'
  }

  // If many capacity signals, simplify the focus
  if (signals.capacity_signals.length >= 2) {
    return 'simplify'
  }

  // Otherwise just pause and breathe
  return 'pause'
}

/**
 * Check if we should exit containment mode
 */
export function shouldExitContainment(
  emotionalCharge: EmotionalCharge,
  signals: ConversationSignals
): boolean {

  // Exit if charge is neutral AND no new overwhelm signals
  return (
    emotionalCharge === 'neutral' &&
    !signals.overwhelm_detected &&
    signals.emotional_markers.length === 0
  )
}
