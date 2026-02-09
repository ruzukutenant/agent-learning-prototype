import { anthropic, CLAUDE_MODEL, MAX_TOKENS } from '../../config/claude.js'
import { getSession, updateSession, addMessage, getMessages } from '../session.js'
import { getSystemPrompt } from './prompts.js'
import { TOOLS, handleToolCall, createToolResult } from './tools.js'
import { validateToolSequence } from '../validation.js'
import type { Session, Message } from '../../types/index.js'

export interface ConversationResult {
  advisorMessage?: Message
  session: Session
  toolCalls?: Array<{ name: string; input: any }>
}

export async function processMessage(
  sessionId: string,
  userMessageText: string,
  wasVoice: boolean = false
): Promise<ConversationResult> {
  // Handle initial greeting
  if (userMessageText === '__INIT__') {
    const session = await getSession(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    const greetingText = `Hey ${session.user_name}! Great to meet you. I'm here to help you identify what's really holding your coaching business back.

Let's start with the basics—tell me about your coaching or consulting business. What do you do and who do you serve?`

    const advisorMessage = await addMessage({
      sessionId,
      turnNumber: 1,
      speaker: 'advisor',
      messageText: greetingText,
      phase: 'context',
    })

    const updatedSession = await updateSession(sessionId, {
      total_turns: 1,
    })

    return {
      advisorMessage,
      session: updatedSession,
    }
  }

  // 1. Get current session and messages
  let session = await getSession(sessionId)
  if (!session) {
    throw new Error('Session not found')
  }

  const existingMessages = await getMessages(sessionId)

  // 2. Save user message
  const userMessage = await addMessage({
    sessionId,
    turnNumber: session.total_turns + 1,
    speaker: 'user',
    messageText: userMessageText,
    phase: session.current_phase,
    wasVoice,
  })

  // 3. Build conversation history for Claude
  // Filter out any messages with empty content (from old broken tool calls)
  const conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string | any[]
  }> = existingMessages
    .filter((msg) => msg.message_text && msg.message_text.trim())
    .map((msg) => ({
      role: msg.speaker === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.message_text,
    }))

  // Add current user message
  conversationHistory.push({
    role: 'user',
    content: userMessageText,
  })

  // 4. Get system prompt
  const systemPrompt = await getSystemPrompt(session, existingMessages)

  // 5. Get Claude's response with tool support
  let response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: conversationHistory,
    tools: TOOLS,
  })

  // 6. Handle tool use (agentic loop)
  const toolCallsUsed: Array<{ name: string; input: any }> = []

  while (response.stop_reason === 'tool_use') {
    // Find all tool use blocks
    const toolUses = response.content.filter((block) => block.type === 'tool_use')

    // CRITICAL: If identify_constraint is called, ONLY execute that tool ONCE and stop
    // This enforces the Phase 3 -> Phase 4 transition to happen across turns with bridging text
    const hasIdentifyConstraint = toolUses.some(t => t.name === 'identify_constraint')

    // Skip identify_constraint if constraint already identified (prevents duplicate calls across turns)
    const shouldSkipConstraint = hasIdentifyConstraint && session.constraint_category

    const toolsToExecute = shouldSkipConstraint
      ? toolUses.filter(t => t.name !== 'identify_constraint')
      : hasIdentifyConstraint
        ? [toolUses.find(t => t.name === 'identify_constraint')!] // Only first identify_constraint
        : toolUses

    if (shouldSkipConstraint) {
      console.warn('[Tool Enforcement] Skipping identify_constraint - constraint already identified')
    } else if (hasIdentifyConstraint && toolUses.length > 1) {
      const skippedTools = toolUses.filter((t, i) =>
        t.name !== 'identify_constraint' || i > toolUses.findIndex(t => t.name === 'identify_constraint')
      )
      console.warn('[Tool Enforcement] identify_constraint called - only executing first occurrence')
      console.warn('[Tool Enforcement] Skipped tools:', skippedTools.map(t => t.name))
    }

    // Execute each tool and collect results
    const toolResults = []
    for (const toolUse of toolsToExecute) {
      console.log(`[Tool] ${toolUse.name} called with:`, toolUse.input)

      // Validate tool sequence before execution (using current session state)
      const validation = validateToolSequence(session, toolUse.name)
      if (!validation.valid && validation.warning) {
        console.warn(`[Tool Sequence Warning] ${validation.warning}`)
        console.warn(`[Tool Sequence] Current session state:`, {
          hasConstraint: !!session.constraint_category,
          hasReadiness: !!(session.clarity_score !== null),
          hasEndpoint: !!session.endpoint_selected,
        })
      }

      // Track tool call
      toolCallsUsed.push({
        name: toolUse.name,
        input: toolUse.input,
      })

      // Execute tool handler with current session for validation
      await handleToolCall(sessionId, toolUse.name, toolUse.input, session)

      // Create tool result for ALL tools (including UI tools)
      // This ensures they appear in conversation history so AI knows they've been called
      toolResults.push(
        createToolResult(
          toolUse.id,
          true,
          `${toolUse.name} executed successfully`
        )
      )
    }

    // Add assistant response and tool results to conversation
    conversationHistory.push({
      role: 'assistant',
      content: response.content,
    })

    // Add tool results to conversation
    conversationHistory.push({
      role: 'user',
      content: toolResults,
    })

    // Refresh session to get updated state after tool execution
    // This ensures the next loop iteration has current constraint/readiness data
    const refreshedSession = await getSession(sessionId)
    if (!refreshedSession) {
      throw new Error('Session not found after tool execution')
    }
    session = refreshedSession

    // Continue conversation with tool results
    try {
      response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: conversationHistory,
        tools: TOOLS,
      })
    } catch (error) {
      console.error('[API Error] Failed to get AI response after tool execution:', error)
      console.error('[API Error] Last tool executed:', toolsToExecute.map(t => t.name))
      throw error
    }
  }

  // 7. Extract final text response
  const textBlocks = response.content.filter((block) => block.type === 'text')

  // Log if we have duplicate text blocks (debugging duplicate messages)
  if (textBlocks.length > 1) {
    console.log(`[Response] Multiple text blocks detected (${textBlocks.length}):`)
    textBlocks.forEach((block, i) => {
      console.log(`[Response] Block ${i + 1}:`, block.text.substring(0, 100))
    })
  }

  const advisorText = textBlocks
    .map((block) => block.text)
    .join('\n')

  // 8. Get updated session (may have been modified by tools)
  const updatedSession = await getSession(sessionId)
  if (!updatedSession) {
    throw new Error('Session not found after tool execution')
  }

  // 9. Update turn count
  await updateSession(sessionId, {
    total_turns: session.total_turns + 2, // user + advisor
  })

  // 10. Save advisor message (only if there's text content)
  let advisorMessage = null
  if (advisorText.trim()) {
    advisorMessage = await addMessage({
      sessionId,
      turnNumber: session.total_turns + 2,
      speaker: 'advisor',
      messageText: advisorText,
      phase: updatedSession.current_phase,
    })
  }

  return {
    advisorMessage: advisorMessage || undefined,
    session: updatedSession,
    toolCalls: toolCallsUsed.length > 0 ? toolCallsUsed : undefined,
  }
}
