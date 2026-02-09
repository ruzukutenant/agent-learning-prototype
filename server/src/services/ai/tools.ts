import type { Session } from '../../types/index.js'
import { updateSession, getSession } from '../session.js'

// Tool definitions for Claude API
// NOTE: Assessment and routing are now handled in dedicated UI pages (/assess and /summary)
// Only identify_constraint is actively used in the chat conversation
export const TOOLS = [
  {
    name: 'identify_constraint',
    description: 'Record the identified business constraint after validation in Phase 3. This completes the chat conversation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        constraint: {
          type: 'string',
          description: 'The specific business constraint identified',
        },
        category: {
          type: 'string',
          enum: ['strategy', 'execution', 'energy'],
          description: 'The constraint category',
        },
      },
      required: ['constraint', 'category'],
    },
  },
]

// Tool handlers
export async function handleToolCall(
  sessionId: string,
  toolName: string,
  input: any,
  session?: Session
): Promise<Partial<Session>> {
  const updates: Partial<Session> = {}

  switch (toolName) {
    case 'identify_constraint':
      updates.constraint_summary = input.constraint
      updates.constraint_category = input.category
      updates.constraint_validated = true
      // Phase advances to readiness, but UI handles the actual assessment
      updates.current_phase = 'readiness'
      console.log('[Tool] Constraint identified - chat conversation complete')
      break

    default:
      console.warn(`[Tool] Unknown or deprecated tool called: ${toolName}`)
      // Deprecated tools (assess_readiness, select_endpoint, collect_email, collect_readiness_ratings)
      // are now handled in dedicated UI pages (/assess and /summary)
  }

  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    await updateSession(sessionId, updates)
  }

  return updates
}

// Tool result for Claude API
export function createToolResult(toolUseId: string, success: boolean, message?: string) {
  return {
    type: 'tool_result' as const,
    tool_use_id: toolUseId,
    content: success
      ? JSON.stringify({ status: 'success', message })
      : JSON.stringify({ status: 'error', message }),
  }
}
