/**
 * Transcription cleanup using Gemini Flash
 * Fixes common speech-to-text errors before processing
 */

import { geminiComplete } from '../orchestrator/core/gemini-client.js'

/**
 * Format an insight phrase to look polished and professional
 * - Capitalizes first letter
 * - Adds period at end if missing punctuation
 */
export function formatInsight(phrase: string): string {
  if (!phrase || phrase.length === 0) return phrase

  let formatted = phrase.trim()

  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)

  // Add period if no ending punctuation
  if (!/[.!?]$/.test(formatted)) {
    formatted += '.'
  }

  return formatted
}

const CLEANUP_PROMPT = `Clean up this voice transcription to make it professional and readable. The user is describing their coaching or consulting business.

Your task:
1. Fix speech-to-text errors (misheard words, homophones, acronyms)
2. Add proper sentence structure:
   - Capitalize the first letter of each sentence
   - Add periods at the end of sentences
   - Add commas where natural pauses occur
   - Break run-on sentences into clear, separate sentences
3. Keep it natural - this should still sound like the person speaking

Rules:
- Preserve their exact meaning and voice
- Don't add new ideas or change what they said
- Don't make it overly formal - keep it conversational but polished
- Return ONLY the cleaned text, nothing else

Example:
Input: "a lot of it is recognizing that it's not about being the smartest it's about working with other people"
Output: "A lot of it is recognizing that it's not about being the smartest. It's about working with other people."

Transcription to clean:`

/**
 * Clean up speech-to-text transcription using Gemini Flash
 * Only called when wasVoice=true to avoid unnecessary API calls
 */
export async function cleanupTranscription(rawText: string): Promise<string> {
  // Skip cleanup for very short messages (likely "yes", "no", etc.)
  if (rawText.length < 20) {
    return rawText
  }

  try {
    const cleaned = await geminiComplete(
      `${CLEANUP_PROMPT}\n\n"${rawText}"`,
      {
        maxTokens: 512,
        temperature: 0.1, // Low temp for accuracy
      }
    )

    // Remove any quotes the model might have added
    const result = cleaned.trim().replace(/^["']|["']$/g, '')

    // Sanity check - if result is wildly different length, something went wrong
    if (result.length < rawText.length * 0.5 || result.length > rawText.length * 2) {
      console.warn('[TranscriptionCleanup] Result length suspicious, using original')
      return rawText
    }

    console.log('[TranscriptionCleanup] Cleaned:', { original: rawText, cleaned: result })
    return result
  } catch (error) {
    console.error('[TranscriptionCleanup] Failed, using original:', error)
    return rawText // Fail gracefully - use original if cleanup fails
  }
}
