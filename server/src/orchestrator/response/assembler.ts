/**
 * Response Assembler
 *
 * Combines LLM-generated conversational content with rendered components
 * to produce the final response. This is where separation of concerns
 * is enforced - the LLM generates conversation, the system adds components.
 */

import type {
  ComponentTrigger,
  RenderedComponent,
  AssembledResponse,
  ComponentContext
} from '../components/types.js'
import type { ConversationState, ClosingSynthesis } from '../core/types.js'
import { componentRegistry } from '../components/registry.js'

/**
 * Assemble the final response from LLM content and triggered components
 */
export function assembleResponse(
  llmContent: string,
  components: ComponentTrigger[],
  state: ConversationState,
  synthesis?: ClosingSynthesis | null
): AssembledResponse {
  // Build context for component rendering
  const context: ComponentContext = {
    state,
    synthesis
  }

  // Render each triggered component
  const renderedComponents = components
    .map(trigger => {
      // Pass config to context
      const renderContext: ComponentContext = {
        ...context,
        config: trigger.config
      }

      return componentRegistry.render(trigger.type, renderContext)
    })
    .filter((c): c is RenderedComponent => c !== null)

  // Combine text: LLM content + component text
  const componentText = renderedComponents
    .map(c => c.text)
    .filter(Boolean)
    .join('\n\n')

  const fullText = componentText
    ? `${llmContent}\n\n${componentText}`
    : llmContent

  // Build structured payload for frontend
  const payload = {
    message: llmContent,
    components: renderedComponents.map(c => ({
      type: c.type,
      text: c.text,
      metadata: c.metadata
    }))
  }

  console.log(`[ResponseAssembler] Assembled response with ${renderedComponents.length} components`)
  if (renderedComponents.length > 0) {
    console.log(`[ResponseAssembler] Components: ${renderedComponents.map(c => c.type).join(', ')}`)
  }

  return {
    conversation: llmContent,
    components: renderedComponents,
    fullText,
    payload
  }
}

/**
 * Assemble a response with no components (for non-closing turns)
 */
export function assembleSimpleResponse(llmContent: string): AssembledResponse {
  return {
    conversation: llmContent,
    components: [],
    fullText: llmContent,
    payload: {
      message: llmContent,
      components: []
    }
  }
}
