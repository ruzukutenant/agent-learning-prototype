/**
 * Collect Email Component
 *
 * Mid-conversation email capture card. Appears inline in the chat
 * when engagement is good (~turn 10-12) but before the closing sequence.
 *
 * This is a client-rendered component — no text is appended to the
 * advisor's message. The server just signals the client to show the card.
 */

import type { Component, ComponentContext, RenderedComponent } from '../types.js'

export const collectEmailComponent: Component = {
  type: 'collect_email',

  render(context: ComponentContext): RenderedComponent {
    console.log(`[CollectEmail] Rendering at turn ${context.state.turns_total}`)

    return {
      type: 'collect_email',
      // No text — this component is purely client-side UI
      text: '',
      metadata: {
        turn: context.state.turns_total,
      }
    }
  }
}
