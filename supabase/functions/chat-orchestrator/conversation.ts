import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0'
import { buildSystemPrompt, getPhaseTools } from './prompts/builder.ts'

const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 8192

/**
 * Generate supportive closing message after constraint identification
 */
function generateClosingMessage(category: string, constraintSummary: string): string {
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1)

  return `Based on everything you've shared, your core constraint is ${category}—${constraintSummary}

This is the real blocker keeping your business from growing consistently. The good news is that once you address this, everything else becomes easier.

I'm going to have you do a quick check-in on where you are with this—it'll help us figure out the best way forward. Takes about 60 seconds.`
}

interface ConversationParams {
  session: any
  userMessage: string
  supabaseClient: any
}

export interface ConversationResult {
  advisorMessage?: any
  session: any
  toolCalls?: Array<{ name: string; input: any }>
}

export async function processConversation({
  session,
  userMessage,
  supabaseClient
}: ConversationParams): Promise<ConversationResult> {
  // Initialize Claude
  const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY')
  })

  // Handle initial greeting
  if (userMessage === '__INIT__') {
    const greetingText = `Hey ${session.user_name}! I'm here to help you identify what's really holding your business back.

I'll ask you a few quick questions, and we'll figure out exactly where to focus. Should take about 10 minutes.

Let's start: Tell me about your coaching or consulting business—what do you do and who do you serve?`

    const { data: advisorMessage } = await supabaseClient
      .from('advisor_messages')
      .insert({
        session_id: session.id,
        turn_number: 1,
        speaker: 'advisor',
        message_text: greetingText,
        phase: 'context',
      })
      .select()
      .single()

    await supabaseClient
      .from('advisor_sessions')
      .update({ total_turns: 1 })
      .eq('id', session.id)

    return {
      advisorMessage,
      session: { ...session, total_turns: 1 }
    }
  }

  // Get existing messages
  const { data: existingMessages } = await supabaseClient
    .from('advisor_messages')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })

  // Save user message
  await supabaseClient
    .from('advisor_messages')
    .insert({
      session_id: session.id,
      turn_number: session.total_turns + 1,
      speaker: 'user',
      message_text: userMessage,
      phase: session.current_phase,
      was_voice: false,
    })

  // Build conversation history
  const conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string | any[]
  }> = existingMessages
    .filter((msg: any) => msg.message_text && msg.message_text.trim())
    .map((msg: any) => ({
      role: msg.speaker === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.message_text,
    }))

  // Add current user message
  conversationHistory.push({
    role: 'user',
    content: userMessage,
  })

  // Build phase-specific system prompt (modular architecture)
  const systemPrompt = buildSystemPrompt(session)

  // Get phase-specific tools (prevents hallucinated tool calls)
  const tools = getPhaseTools(session.current_phase)

  // Call Claude API
  let response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: conversationHistory,
    tools: tools,
  })

  // Handle tool use (agentic loop)
  const toolCallsUsed: Array<{ name: string; input: any }> = []

  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter((block: any) => block.type === 'tool_use')

    // Critical: Only execute identify_constraint once
    const hasIdentifyConstraint = toolUses.some((t: any) => t.name === 'identify_constraint')
    const shouldSkipConstraint = hasIdentifyConstraint && session.constraint_category

    const toolsToExecute = shouldSkipConstraint
      ? toolUses.filter((t: any) => t.name !== 'identify_constraint')
      : hasIdentifyConstraint
        ? [toolUses.find((t: any) => t.name === 'identify_constraint')!]
        : toolUses

    if (shouldSkipConstraint) {
      console.warn('[Tool Enforcement] Skipping identify_constraint - already identified')
    }

    // Execute tools and collect results
    const toolResults = []
    for (const toolUse of toolsToExecute) {
      console.log(`[Tool] ${toolUse.name} called`)

      toolCallsUsed.push({
        name: toolUse.name,
        input: toolUse.input,
      })

      // Execute tool handler
      await handleToolCall(session.id, toolUse.name, toolUse.input, supabaseClient)

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify({
          status: 'success',
          message: `${toolUse.name} executed successfully`
        })
      })
    }

    // Add assistant response and tool results to conversation
    conversationHistory.push({
      role: 'assistant',
      content: response.content,
    })

    conversationHistory.push({
      role: 'user',
      content: toolResults,
    })

    // Refresh session to get updated state
    const { data: refreshedSession } = await supabaseClient
      .from('advisor_sessions')
      .select('*')
      .eq('id', session.id)
      .single()

    session = refreshedSession

    // Continue conversation with refreshed phase-specific prompt
    response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(session),
      messages: conversationHistory,
      tools: getPhaseTools(session.current_phase),
    })
  }

  // Extract final text response
  const textBlocks = response.content.filter((block: any) => block.type === 'text')
  const advisorText = textBlocks.map((block: any) => block.text).join('\n')

  // Update turn count
  await supabaseClient
    .from('advisor_sessions')
    .update({ total_turns: session.total_turns + 2 })
    .eq('id', session.id)

  // Save advisor message
  let advisorMessage = null
  if (advisorText.trim()) {
    const { data } = await supabaseClient
      .from('advisor_messages')
      .insert({
        session_id: session.id,
        turn_number: session.total_turns + 2,
        speaker: 'advisor',
        message_text: advisorText,
        phase: session.current_phase,
      })
      .select()
      .single()

    advisorMessage = data
  }

  // Get final session state
  const { data: finalSession } = await supabaseClient
    .from('advisor_sessions')
    .select('*')
    .eq('id', session.id)
    .single()

  return {
    advisorMessage,
    session: finalSession,
    toolCalls: toolCallsUsed.length > 0 ? toolCallsUsed : undefined,
  }
}

// Note: buildSystemPrompt and getPhaseTools are now imported from prompts/builder.ts
// This provides modular, phase-specific prompts instead of monolithic ones

async function handleToolCall(
  sessionId: string,
  toolName: string,
  input: any,
  supabaseClient: any
) {
  switch (toolName) {
    case 'complete_phase_1':
      await supabaseClient
        .from('advisor_sessions')
        .update({
          business_type: input.business_type,
          acquisition_source: input.acquisition_source,
          volume_indicator: input.volume_indicator,
          surface_challenge: input.surface_challenge,
          current_phase: 'exploration'
        })
        .eq('id', sessionId)

      console.log('[Tool] Phase 1 complete - moving to exploration')
      break

    case 'submit_hypothesis':
      await supabaseClient
        .from('advisor_sessions')
        .update({
          hypothesis_category: input.category,
          hypothesis_reasoning: input.reasoning,
          current_phase: 'diagnosis'
        })
        .eq('id', sessionId)

      console.log(`[Tool] Hypothesis submitted: ${input.category} - moving to diagnosis`)
      break

    case 'identify_constraint':
      console.log('[Tool] identify_constraint called with:', JSON.stringify(input))

      // Validate required fields
      if (!input.constraint || !input.category) {
        console.error('[Tool] Missing required fields:', { constraint: !!input.constraint, category: !!input.category })
        throw new Error('identify_constraint requires both constraint and category fields')
      }

      // Validate category is one of the allowed values
      const validCategories = ['strategy', 'execution', 'energy']
      if (!validCategories.includes(input.category)) {
        console.error('[Tool] Invalid category:', input.category)
        throw new Error(`category must be one of: ${validCategories.join(', ')}`)
      }

      const { data, error } = await supabaseClient
        .from('advisor_sessions')
        .update({
          constraint_summary: input.constraint,
          constraint_category: input.category,
          constraint_validated: true,
          current_phase: 'complete'
          // Keep completion_status as 'in_progress' - will be set to 'completed' after assessment
        })
        .eq('id', sessionId)
        .select()

      if (error) {
        console.error('[Tool] Error updating session:', error)
        throw error
      }

      console.log('[Tool] Constraint identified successfully - chat conversation complete')
      console.log('[Tool] Updated session:', JSON.stringify(data))

      // Generate and save closing message
      const closingMessage = generateClosingMessage(input.category, input.constraint)
      console.log('[Tool] Generating closing message:', closingMessage.substring(0, 100) + '...')

      await supabaseClient
        .from('advisor_messages')
        .insert({
          session_id: sessionId,
          turn_number: 999, // Will be updated by main conversation handler
          speaker: 'advisor',
          message_text: closingMessage,
          phase: 'complete',
        })

      console.log('[Tool] Closing message saved')
      break

    case 'assess_readiness':
      // Validate scores are between 1 and 10
      const scores = {
        clarity: input.clarity,
        confidence: input.confidence,
        capacity: input.capacity
      }

      for (const [key, value] of Object.entries(scores)) {
        if (typeof value !== 'number' || value < 1 || value > 10) {
          console.error(`[Tool] Invalid ${key} score:`, value)
          throw new Error(`${key} score must be a number between 1 and 10`)
        }
      }

      await supabaseClient
        .from('advisor_sessions')
        .update({
          clarity_score: input.clarity,
          confidence_score: input.confidence,
          capacity_score: input.capacity,
          current_phase: 'routing'
        })
        .eq('id', sessionId)

      console.log(`[Tool] Readiness assessed (${input.clarity}/${input.confidence}/${input.capacity}) - moving to routing`)
      break

    case 'select_endpoint':
      // Validate endpoint is one of the allowed values
      const validEndpoints = ['EC', 'MIST', 'NURTURE']
      if (!validEndpoints.includes(input.endpoint)) {
        console.error('[Tool] Invalid endpoint:', input.endpoint)
        throw new Error(`endpoint must be one of: ${validEndpoints.join(', ')}`)
      }

      await supabaseClient
        .from('advisor_sessions')
        .update({
          endpoint_selected: input.endpoint,
          completion_status: 'completed'
        })
        .eq('id', sessionId)

      console.log(`[Tool] Endpoint selected: ${input.endpoint} (${input.reasoning})`)
      break

    default:
      console.warn(`[Tool] Unknown or deprecated tool called: ${toolName}`)
  }
}
