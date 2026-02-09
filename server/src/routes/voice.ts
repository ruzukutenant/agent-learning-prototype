import { WebSocketServer, WebSocket } from 'ws'
import type { Server as HTTPServer } from 'http'
import { elevenlabs, AGENT_ID } from '../config/elevenlabs.js'
import { getSession, updateSession, addMessage } from '../services/session.js'
import { handleToolCall } from '../services/ai/tools.js'

// WebSocket message types
interface ClientMessage {
  type: 'audio' | 'text' | 'control'
  data?: string | ArrayBuffer
  text?: string
  action?: 'start' | 'stop' | 'interrupt'
}

interface ServerMessage {
  type: 'audio' | 'transcript' | 'status' | 'tool_call' | 'error'
  data?: string | ArrayBuffer
  transcript?: {
    speaker: 'user' | 'assistant'
    text: string
    isFinal?: boolean
  }
  status?: 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error'
  toolCall?: {
    name: string
    input: any
  }
  error?: string
}

export function setupVoiceWebSocket(server: HTTPServer) {
  const wss = new WebSocketServer({
    server,
    path: '/api/voice'
  })

  wss.on('connection', async (clientWs: WebSocket, req) => {
    console.log('[Voice] Client connected')

    // Extract session ID from query params
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const sessionId = url.searchParams.get('sessionId')

    if (!sessionId) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: 'Missing sessionId parameter'
      } as ServerMessage))
      clientWs.close()
      return
    }

    // Verify session exists
    try {
      const session = await getSession(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }
    } catch (error) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: 'Invalid session'
      } as ServerMessage))
      clientWs.close()
      return
    }

    let elevenLabsWs: WebSocket | null = null
    let currentUserTranscript = ''
    let currentAssistantTranscript = ''
    let conversationStartTime = Date.now()

    try {
      // Send connecting status
      clientWs.send(JSON.stringify({
        type: 'status',
        status: 'connecting'
      } as ServerMessage))

      // Get signed URL for private agent authentication
      const signedUrl = await getSignedUrl()

      // Establish WebSocket connection to ElevenLabs using signed URL
      elevenLabsWs = new WebSocket(signedUrl)

      elevenLabsWs.on('open', () => {
        console.log('[Voice] Connected to ElevenLabs')
        clientWs.send(JSON.stringify({
          type: 'status',
          status: 'connected'
        } as ServerMessage))

        // Send initial configuration
        elevenLabsWs?.send(JSON.stringify({
          type: 'conversation_initiation_client_data',
          conversation_config_override: {
            agent: {
              prompt: {
                // We can inject session context here if needed
                // For now, the agent prompt is configured in ElevenLabs dashboard
              }
            }
          }
        }))
      })

      elevenLabsWs.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString())

          switch (message.type) {
            case 'conversation_initiation_metadata':
              // ElevenLabs confirmed conversation start
              console.log('[Voice] Conversation initiated:', message.conversation_initiation_metadata_event)
              clientWs.send(JSON.stringify({
                type: 'status',
                status: 'listening'
              } as ServerMessage))
              break

            case 'audio':
              // Forward audio from ElevenLabs to client
              clientWs.send(JSON.stringify({
                type: 'audio',
                data: message.audio_event.audio_base_64
              } as ServerMessage))

              clientWs.send(JSON.stringify({
                type: 'status',
                status: 'speaking'
              } as ServerMessage))
              break

            case 'user_transcript':
              // User speech being transcribed
              const userText = message.user_transcription_event.user_transcript
              currentUserTranscript = userText

              clientWs.send(JSON.stringify({
                type: 'transcript',
                transcript: {
                  speaker: 'user',
                  text: userText,
                  isFinal: false
                }
              } as ServerMessage))
              break

            case 'agent_response':
              // Assistant is responding
              const agentText = message.agent_response_event.agent_response
              currentAssistantTranscript += agentText

              clientWs.send(JSON.stringify({
                type: 'transcript',
                transcript: {
                  speaker: 'assistant',
                  text: agentText,
                  isFinal: false
                }
              } as ServerMessage))
              break

            case 'user_transcript_final':
              // Final user transcript - save to database
              const finalUserText = message.user_transcription_event.user_transcript
              currentUserTranscript = finalUserText

              await saveMessage(sessionId, 'user', finalUserText, true)

              clientWs.send(JSON.stringify({
                type: 'transcript',
                transcript: {
                  speaker: 'user',
                  text: finalUserText,
                  isFinal: true
                }
              } as ServerMessage))

              clientWs.send(JSON.stringify({
                type: 'status',
                status: 'thinking'
              } as ServerMessage))
              break

            case 'agent_response_final':
              // Final assistant response - save to database
              const finalAgentText = currentAssistantTranscript

              await saveMessage(sessionId, 'assistant', finalAgentText, false)
              currentAssistantTranscript = '' // Reset

              clientWs.send(JSON.stringify({
                type: 'transcript',
                transcript: {
                  speaker: 'assistant',
                  text: finalAgentText,
                  isFinal: true
                }
              } as ServerMessage))

              clientWs.send(JSON.stringify({
                type: 'status',
                status: 'listening'
              } as ServerMessage))
              break

            case 'tool_call':
              // Claude is calling a tool - intercept and handle
              const toolName = message.tool_call_event.tool_name
              const toolInput = message.tool_call_event.parameters

              console.log(`[Voice] Tool called: ${toolName}`, toolInput)

              // Execute our tool handler
              await handleToolCall(sessionId, toolName, toolInput)

              // Notify client about tool call
              clientWs.send(JSON.stringify({
                type: 'tool_call',
                toolCall: {
                  name: toolName,
                  input: toolInput
                }
              } as ServerMessage))

              // Send success response back to ElevenLabs
              elevenLabsWs?.send(JSON.stringify({
                type: 'tool_response',
                tool_call_id: message.tool_call_event.tool_call_id,
                output: JSON.stringify({
                  status: 'success',
                  message: `${toolName} executed successfully`
                })
              }))
              break

            case 'ping':
              // Respond to keepalive
              elevenLabsWs?.send(JSON.stringify({ type: 'pong' }))
              break

            case 'error':
              console.error('[Voice] ElevenLabs error:', message)
              clientWs.send(JSON.stringify({
                type: 'error',
                error: message.error || 'Voice service error'
              } as ServerMessage))
              break

            default:
              console.log('[Voice] Unknown message type:', message.type)
          }
        } catch (error) {
          console.error('[Voice] Error handling ElevenLabs message:', error)
        }
      })

      elevenLabsWs.on('error', (error) => {
        console.error('[Voice] ElevenLabs WebSocket error:', error)
        clientWs.send(JSON.stringify({
          type: 'error',
          error: 'Voice connection error'
        } as ServerMessage))
      })

      elevenLabsWs.on('close', () => {
        console.log('[Voice] ElevenLabs connection closed')
        clientWs.close()
      })

      // Handle messages from client
      clientWs.on('message', (data: Buffer) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString())

          switch (message.type) {
            case 'audio':
              // Forward audio from client to ElevenLabs
              if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
                elevenLabsWs.send(JSON.stringify({
                  type: 'audio',
                  audio_event: {
                    audio_base_64: message.data
                  }
                }))
              }
              break

            case 'text':
              // Text input fallback
              if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN && message.text) {
                elevenLabsWs.send(JSON.stringify({
                  type: 'user_transcript',
                  user_transcription_event: {
                    user_transcript: message.text
                  }
                }))
              }
              break

            case 'control':
              if (message.action === 'interrupt') {
                // Send interrupt signal to ElevenLabs
                elevenLabsWs?.send(JSON.stringify({
                  type: 'interruption'
                }))
              }
              break
          }
        } catch (error) {
          console.error('[Voice] Error handling client message:', error)
        }
      })

    } catch (error) {
      console.error('[Voice] Setup error:', error)
      clientWs.send(JSON.stringify({
        type: 'error',
        error: 'Failed to establish voice connection'
      } as ServerMessage))
      clientWs.close()
    }

    // Cleanup on client disconnect
    clientWs.on('close', () => {
      console.log('[Voice] Client disconnected')
      if (elevenLabsWs) {
        elevenLabsWs.close()
      }

      // Calculate total conversation duration
      const duration = Math.floor((Date.now() - conversationStartTime) / 1000)
      console.log(`[Voice] Conversation duration: ${duration}s`)
    })
  })

  console.log('[Voice] WebSocket server ready at ws://localhost:PORT/api/voice')
}

// Helper: Get signed URL for WebSocket connection
async function getSignedUrl(): Promise<string> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
    {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get signed URL: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.signed_url
}

// Helper: Save message to database
async function saveMessage(
  sessionId: string,
  speaker: 'user' | 'assistant',
  text: string,
  wasVoice: boolean
): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) {
    throw new Error('Session not found')
  }

  await addMessage({
    sessionId,
    turnNumber: session.total_turns + 1,
    speaker: speaker === 'user' ? 'user' : 'advisor',
    messageText: text,
    phase: session.current_phase,
    wasVoice,
  })

  // Update turn count
  await updateSession(sessionId, {
    total_turns: session.total_turns + 1
  })
}
