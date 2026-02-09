import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processConversation } from './conversation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  sessionId: string
  message: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Parse request
    const { sessionId, message } = await req.json() as RequestBody

    console.log(`[Orchestrator] Processing message for session: ${sessionId}`)

    // Initialize Supabase client with service role key (bypass RLS)
    // Note: Using PROJECT_URL and SERVICE_ROLE_KEY (can't use SUPABASE_ prefix - reserved)
    const supabaseClient = createClient(
      Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get session
    const { data: session, error: sessionError } = await supabaseClient
      .from('advisor_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.error('[Orchestrator] Session not found:', sessionError)
      throw new Error('Session not found')
    }

    // Process conversation
    const result = await processConversation({
      session,
      userMessage: message,
      supabaseClient
    })

    const elapsed = Date.now() - startTime
    console.log(`[Orchestrator] Completed in ${elapsed}ms`)

    // Log metrics (don't fail if logging fails)
    try {
      await supabaseClient
        .from('orchestrator_logs')
        .insert({
          event: 'conversation_complete',
          session_id: sessionId,
          details: {
            duration_ms: elapsed,
            phase: session.current_phase,
            tool_calls: result.toolCalls?.length || 0
          }
        })
    } catch (err) {
      console.warn('[Orchestrator] Failed to log metrics:', err)
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('[Orchestrator] Error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
