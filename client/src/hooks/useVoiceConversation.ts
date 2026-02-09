import { useState, useEffect, useRef, useCallback } from 'react'
import { Scribe, RealtimeEvents } from '@elevenlabs/client'

export type VoiceStatus =
  | 'idle'              // Before connection
  | 'connecting'        // Establishing connection
  | 'connected'         // Connection established, not yet ready
  | 'ready'             // Ready state - brief pause before listening starts
  | 'output_mode'       // AI speaking, user listens
  | 'transitioning'     // Visual transition between modes
  | 'input_mode'        // User speaks, AI listens
  | 'thinking'          // AI processing
  | 'error'
  | 'disconnected'

export interface TranscriptEntry {
  speaker: 'user' | 'assistant'
  text: string
  isFinal: boolean
  timestamp: number
  isAnimating?: boolean  // For typing animation effect
  audioDurationMs?: number  // Actual audio duration for animation sync
}

export interface ToolCallEvent {
  name: string
  input: any
}

// Message type for syncing with parent component
export interface VoiceMessage {
  id: string
  session_id: string
  created_at: string
  turn_number: number
  speaker: 'user' | 'advisor'
  message_text: string
  phase: string
  detected_signals: any
  was_voice: boolean
  audio_duration_seconds: number | null
}

interface UseVoiceConversationOptions {
  sessionId: string
  onTranscript?: (entry: TranscriptEntry) => void
  onToolCall?: (toolCall: ToolCallEvent) => void
  onError?: (error: string) => void
  onMessage?: (userMessage: VoiceMessage | null, advisorMessage: VoiceMessage | null) => void
  initialTranscripts?: TranscriptEntry[]
}

export function useVoiceConversation({
  sessionId,
  onTranscript,
  onToolCall,
  onError,
  onMessage,
  initialTranscripts = [],
}: UseVoiceConversationOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>(initialTranscripts)
  const [isRecording, setIsRecording] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)
  const [isReconnecting, setIsReconnecting] = useState(false)

  // Keep ref in sync with transcripts state
  useEffect(() => {
    transcriptsRef.current = transcripts
  }, [transcripts])

  const connectionRef = useRef<ReturnType<typeof Scribe.connect> | null>(null)
  const currentTranscriptRef = useRef<string>('')
  const hasGreetedRef = useRef<boolean>(false)
  const batchedTranscriptRef = useRef<string>('')
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const partialUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const intentionalDisconnectRef = useRef<boolean>(false)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptRef = useRef<number>(0)
  const isReconnectingRef = useRef<boolean>(false)
  const transcriptsRef = useRef<TranscriptEntry[]>(initialTranscripts)
  const readyToProcessRef = useRef<boolean>(false)  // Don't process transcripts until ready
  const isMutedRef = useRef<boolean>(false)  // Mute transcript processing during AI output/thinking
  const isProcessingRef = useRef<boolean>(false)  // Lock to prevent race conditions during message handling

  const MAX_RETRIES = 2
  const COMMIT_DELAY_MS = 2500 // Wait 2.5s after last commit before sending (increased for natural pauses)
  const PARTIAL_UPDATE_DELAY_MS = 150 // Debounce partial transcript updates
  const RECONNECT_DELAY_MS = 3000 // Fixed 3 second delay between reconnection attempts

  // Connect to Scribe using official SDK
  const connect = useCallback(async (forceReconnect = false) => {
    // Circuit breaker - stop after max retries (using ref to avoid stale closure)
    if (errorCount >= MAX_RETRIES) {
      setStatus('error')
      setLastError('Too many connection attempts. Please reload the page.')
      onError?.('Too many connection attempts')
      return
    }

    // Manual reconnect or auto-reconnect should preserve conversation
    const isReconnecting = forceReconnect || isReconnectingRef.current
    console.log('[Scribe] Connect called, isReconnecting:', isReconnecting, 'forceReconnect:', forceReconnect)

    try {
      setStatus('connecting')
      readyToProcessRef.current = false  // Don't process transcripts until ready

      // Only reset greeting flag for initial connection, not reconnection
      if (!isReconnecting) {
        hasGreetedRef.current = false
        console.log('[Scribe] Initial connection - will send greeting')
      } else {
        console.log('[Scribe] Reconnection - skipping greeting')
      }

      // Get single-use token from our backend
      const tokenResponse = await fetch('/api/scribe/token', {
        method: 'POST',
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get Scribe token')
      }

      const { token } = await tokenResponse.json()

      console.log('[Scribe] Connecting with SDK...')

      // Connect using ElevenLabs SDK with microphone mode
      const connection = Scribe.connect({
        token,
        modelId: 'scribe_v1',  // Use v1 which has better English support
        // Force English language - try multiple formats
        language: 'en',
        languageCode: 'en-US',
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,  // Standard sample rate for speech recognition
        },
        // Configure VAD for 3-second silence detection
        vadSilenceThresholdSecs: 3.0,
        // Use VAD commit strategy for natural conversation flow
        commitStrategy: 'vad',
      } as any)

      connectionRef.current = connection

      // Handle connection events
      connection.on('connect' as any, () => {
        console.log('[Scribe] Connected via SDK')
        setStatus('connected')
        setIsRecording(true)

        // Reset reconnection state on successful connection
        reconnectAttemptRef.current = 0
        setReconnectAttempt(0)
        setIsReconnecting(false)
        intentionalDisconnectRef.current = false

        console.log('[Scribe] Microphone initialized and ready')
      })

      connection.on('ready' as any, () => {
        console.log('[Scribe] Ready - Session started')

        // Extra safety: ensure we're in the right state after ready
        if (isReconnectingRef.current) {
          console.log('[Scribe] Reconnection complete - resuming input mode')
          setStatus('input_mode')
        }
      })

      // Handle partial transcripts (live, as user speaks)
      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data: { text: string }) => {
        // Ignore transcripts until we're ready (prevents garbage during connection)
        if (!readyToProcessRef.current) {
          console.log('[Scribe] Ignoring partial transcript - not ready yet')
          return
        }

        // Ignore transcripts during AI output/thinking to prevent overlapping
        if (isMutedRef.current) {
          console.log('[Scribe] Ignoring partial transcript - muted during output')
          return
        }

        console.log('[Scribe] Partial transcript:', data.text)
        currentTranscriptRef.current = data.text

        // Skip sound effects in partial transcripts too
        const isSoundEffect = /^\([^)]+\)\.?$/.test(data.text.trim())
        if (isSoundEffect) {
          return // Don't show sound effects in UI
        }

        // Debounce UI updates to prevent flickering
        if (partialUpdateTimerRef.current) {
          clearTimeout(partialUpdateTimerRef.current)
        }

        partialUpdateTimerRef.current = setTimeout(() => {
          const partialEntry: TranscriptEntry = {
            speaker: 'user',
            text: currentTranscriptRef.current,
            isFinal: false,
            timestamp: Date.now(),
          }

          setTranscripts((prev) => {
            // Replace last non-final user transcript
            const withoutLastPartial = prev.filter(
              (t) => !(t.speaker === 'user' && !t.isFinal)
            )
            return [...withoutLastPartial, partialEntry]
          })

          onTranscript?.(partialEntry)
        }, PARTIAL_UPDATE_DELAY_MS)
      })

      // Handle committed transcripts (final, when user pauses)
      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, async (data: { text: string }) => {
        // Ignore transcripts until we're ready (prevents garbage during connection)
        if (!readyToProcessRef.current) {
          console.log('[Scribe] Ignoring committed transcript - not ready yet:', data.text.substring(0, 50))
          return
        }

        // Ignore transcripts during AI output/thinking to prevent overlapping
        if (isMutedRef.current) {
          console.log('[Scribe] Ignoring committed transcript - muted during output')
          return
        }

        console.log('[Scribe] Committed transcript:', data.text)
        const finalText = data.text.trim()
        currentTranscriptRef.current = ''

        // Skip empty transcripts (silence, background noise)
        if (!finalText) {
          console.log('[Scribe] Skipping empty transcript')
          // Remove any partial transcript
          setTranscripts((prev) => prev.filter((t) => !(t.speaker === 'user' && !t.isFinal)))
          return
        }

        // Skip sound effect transcripts (background noise detection)
        // These are wrapped in parentheses like "(wind blowing)", "(heart beating)", etc.
        const isSoundEffect = /^\([^)]+\)\.?$/.test(finalText)
        if (isSoundEffect) {
          console.log('[Scribe] Skipping sound effect transcript:', finalText)
          // Remove any partial transcript
          setTranscripts((prev) => prev.filter((t) => !(t.speaker === 'user' && !t.isFinal)))
          return
        }

        const finalEntry: TranscriptEntry = {
          speaker: 'user',
          text: finalText,
          isFinal: true,
          timestamp: Date.now(),
        }

        setTranscripts((prev) => {
          // Replace partial with final
          const withoutPartial = prev.filter(
            (t) => !(t.speaker === 'user' && !t.isFinal)
          )
          return [...withoutPartial, finalEntry]
        })

        onTranscript?.(finalEntry)

        // Batch transcripts together - wait for user to finish speaking
        // Add to batch
        batchedTranscriptRef.current = batchedTranscriptRef.current
          ? `${batchedTranscriptRef.current} ${finalText}`
          : finalText

        // Clear existing timer
        if (commitTimerRef.current) {
          clearTimeout(commitTimerRef.current)
        }

        // Set new timer - send after delay (user is done speaking)
        commitTimerRef.current = setTimeout(async () => {
          const textToSend = batchedTranscriptRef.current
          batchedTranscriptRef.current = '' // Clear batch
          commitTimerRef.current = null

          console.log('[Scribe] Sending batched transcript:', textToSend)
          await handleUserMessage(textToSend)
        }, COMMIT_DELAY_MS)
      })

      // Handle errors
      connection.on(RealtimeEvents.ERROR, (error: any) => {
        console.error('[Scribe] Error:', error)
        setErrorCount(prev => prev + 1)

        // Check for specific error types
        const errorMessage = error?.message || error?.toString() || ''
        if (errorMessage.toLowerCase().includes('insufficient resources')) {
          setLastError('Voice service temporarily unavailable. Please use text mode.')
        } else if (errorMessage.toLowerCase().includes('permission')) {
          setLastError('Microphone access required. Please enable microphone permissions.')
        } else {
          setLastError(error.message || 'Voice connection error')
        }

        setStatus('error')
        onError?.(lastError || 'Connection failed')
      })

      connection.on(RealtimeEvents.AUTH_ERROR, (error: any) => {
        console.error('[Scribe] Auth error:', error)
        setErrorCount(prev => prev + 1)
        setLastError('Authentication failed. Please try again.')
        setStatus('error')
        onError?.('Authentication failed')
      })

      // Handle disconnection
      connection.on('disconnect' as any, (reason: any) => {
        console.log('[Scribe] Disconnected:', reason)
        setStatus('disconnected')
        setIsRecording(false)

        // Auto-reconnect if not intentional disconnect (no limit on attempts)
        if (!intentionalDisconnectRef.current) {
          reconnectAttemptRef.current += 1
          const attempt = reconnectAttemptRef.current
          console.log(`[Scribe] Auto-reconnecting in ${RECONNECT_DELAY_MS}ms (attempt ${attempt})`)

          setIsReconnecting(true)
          setReconnectAttempt(attempt)
          isReconnectingRef.current = true // Mark as reconnection for greeting skip

          reconnectTimerRef.current = setTimeout(() => {
            console.log('[Scribe] Attempting auto-reconnection...')
            connect(true) // Pass forceReconnect=true
          }, RECONNECT_DELAY_MS)
        }
      })

      // Start recording and send initial AI greeting
      // Note: SDK events (CONNECT/READY) don't fire reliably, so we trigger manually
      console.log('[Scribe] Event handlers registered, starting session...')
      setIsRecording(true)

      // Give SDK a moment to establish connection before processing transcripts
      setTimeout(async () => {
        // Check current transcripts for user messages (using ref to get latest value)
        const hasUserMessages = transcriptsRef.current.some(t => t.speaker === 'user')

        // Send greeting if: not reconnecting AND no user messages yet (even if AI greeting exists)
        if (!isReconnecting && !hasUserMessages) {
          console.log('[Voice] Sending initial greeting (no user messages yet)')
          await sendInitialGreeting()
          // Ready to process after greeting completes
          readyToProcessRef.current = true
          console.log('[Voice] Now ready to process transcripts')
        } else if (isReconnecting) {
          console.log('[Voice] Reconnected - resuming conversation')
          isReconnectingRef.current = false // Clear reconnection flag

          // Show ready state briefly before resuming listening
          setStatus('ready')
          console.log('[Voice] Ready state - resuming conversation...')

          await new Promise(resolve => setTimeout(resolve, 800))

          readyToProcessRef.current = true
          setStatus('input_mode')
          console.log('[Voice] Now ready to process transcripts')
        } else {
          console.log('[Voice] Existing conversation with user messages - skipping greeting')

          // Show ready state briefly before starting to listen
          setStatus('ready')
          console.log('[Voice] Ready state - switching to voice mode...')

          await new Promise(resolve => setTimeout(resolve, 1000))

          readyToProcessRef.current = true
          setStatus('input_mode')
          console.log('[Voice] Now ready to process transcripts')
        }
      }, 500)
    } catch (error) {
      console.error('[Scribe] Connection failed:', error)
      setErrorCount(prev => prev + 1)
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect to voice service'
      setLastError(errorMsg)
      setStatus('error')
      onError?.(errorMsg)
    }
  }, [sessionId, onTranscript, onError, errorCount, lastError])

  // Send initial greeting from AI
  const sendInitialGreeting = async () => {
    // Prevent duplicate greetings
    if (hasGreetedRef.current) {
      console.log('[Voice] Greeting already sent, skipping')
      return
    }
    hasGreetedRef.current = true
    isMutedRef.current = true  // Mute during greeting output

    try {
      setStatus('thinking')
      console.log('[Voice] Getting initial greeting from AI...')

      // Try sending __INIT__ message, fall back to hardcoded greeting
      const response = await fetch(`/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '__INIT__',
          wasVoice: true,
        }),
      })

      let greetingText: string

      if (!response.ok) {
        // Backend doesn't support __INIT__, use fallback
        console.log('[Voice] Backend returned', response.status, '- using fallback greeting')
        greetingText = "Hi! I'm CoachMira. Tell me about your business."
      } else {
        const data = await response.json()
        greetingText = data.advisorMessage.message_text
      }

      console.log('[Voice] AI greeting:', greetingText)

      // Add assistant greeting to transcripts IMMEDIATELY (starts animation)
      const greetingEntry: TranscriptEntry = {
        speaker: 'assistant',
        text: greetingText,
        isFinal: false,
        isAnimating: true,
        timestamp: Date.now(),
        // No audioDurationMs yet - will use estimated duration
      }

      setTranscripts([greetingEntry])
      onTranscript?.(greetingEntry)

      // Now speak the greeting (output mode) - animation is already running
      setStatus('output_mode')
      const audioDurationMs = await speakText(greetingText)

      // Mark greeting as final after audio finishes
      setTranscripts((prev) =>
        prev.map((t) =>
          t.timestamp === greetingEntry.timestamp
            ? { ...t, isFinal: true, isAnimating: false, audioDurationMs }
            : t
        )
      )

      // Show "Ready" state briefly before listening starts
      setStatus('ready')
      console.log('[Voice] Ready state - preparing for input...')

      await new Promise(resolve => setTimeout(resolve, 1000))

      isMutedRef.current = false  // Unmute before listening
      setStatus('input_mode')
      console.log('[Voice] Listening for user response...')
    } catch (error) {
      console.error('[Voice] Error getting initial greeting:', error)
      // Gracefully degrade - go straight to input mode
      isMutedRef.current = false
      setStatus('input_mode')
    }
  }

  // Handle user message - send to Claude backend
  const handleUserMessage = async (text: string) => {
    // Prevent concurrent message processing (race condition fix)
    if (isProcessingRef.current) {
      console.log('[Voice] Ignoring message - already processing')
      return
    }

    isProcessingRef.current = true
    isMutedRef.current = true  // Mute transcript processing during API call and output

    try {
      setStatus('thinking')

      // Send to existing chat endpoint
      const response = await fetch(`/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text, wasVoice: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      // Handle tool calls
      if (data.toolCalls) {
        for (const toolCall of data.toolCalls) {
          onToolCall?.(toolCall)
        }
      }

      // Sync messages with parent component (for seamless text↔voice transitions)
      if (onMessage && data.userMessage && data.advisorMessage) {
        onMessage(data.userMessage, data.advisorMessage)
      } else if (onMessage && data.advisorMessage) {
        // Sometimes only advisor message is returned
        onMessage(null, data.advisorMessage)
      }

      // Add assistant transcript IMMEDIATELY (starts animation with estimated duration)
      const assistantEntry: TranscriptEntry = {
        speaker: 'assistant',
        text: data.advisorMessage.message_text,
        isFinal: false,
        isAnimating: true,
        timestamp: Date.now(),
        // No audioDurationMs yet - will use estimated duration for now
      }

      setTranscripts((prev) => [...prev, assistantEntry])
      onTranscript?.(assistantEntry)

      // Now speak the response (output mode) - animation is already running
      setStatus('output_mode')
      const audioDurationMs = await speakText(data.advisorMessage.message_text)

      // Update with actual audio duration for better sync next time
      setTranscripts((prev) =>
        prev.map((t) =>
          t.timestamp === assistantEntry.timestamp
            ? { ...t, isFinal: true, isAnimating: false, audioDurationMs }
            : t
        )
      )

      // Show "Ready" state briefly before listening starts
      setStatus('ready')
      console.log('[Voice] Ready state - your turn coming up...')

      await new Promise(resolve => setTimeout(resolve, 1000))

      setStatus('input_mode')
      console.log('[Voice] Your turn - listening...')
    } catch (error) {
      console.error('[Voice] Error handling message:', error)
      onError?.('Failed to get response')
      // Allow retry by going back to input mode
      setStatus('input_mode')
    } finally {
      // Always reset locks when done (success or error)
      isProcessingRef.current = false
      isMutedRef.current = false
    }
  }

  // Convert text to speech and play
  const speakText = async (text: string): Promise<number> => {
    console.log('[TTS] Converting text to speech:', text.substring(0, 50) + '...')

    try {
      // Get audio from TTS endpoint
      const response = await fetch('/api/tts/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[TTS] API error:', response.status, errorText)
        throw new Error(`TTS failed: ${response.status}`)
      }

      console.log('[TTS] Received audio from API')

      // Play the audio and wait for it to finish
      const audioBlob = await response.blob()
      console.log('[TTS] Audio blob size:', audioBlob.size, 'bytes')

      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      // Return promise that resolves when audio finishes, returning duration
      return new Promise<number>((resolve, reject) => {
        // Get duration once metadata is loaded
        audio.onloadedmetadata = () => {
          const durationMs = audio.duration * 1000
          console.log('[TTS] Audio duration:', durationMs, 'ms')
        }

        audio.onended = () => {
          console.log('[TTS] Audio playback finished')
          const durationMs = audio.duration * 1000
          URL.revokeObjectURL(audioUrl)
          resolve(durationMs)
        }

        audio.onerror = (error) => {
          console.error('[TTS] Playback error:', error)
          URL.revokeObjectURL(audioUrl)
          reject(error)
        }

        console.log('[TTS] Starting audio playback...')
        audio.play()
          .then(() => console.log('[TTS] Audio playing'))
          .catch((err) => {
            console.error('[TTS] Play failed:', err)
            // Browser might be blocking autoplay
            if (err.name === 'NotAllowedError') {
              console.warn('[TTS] Autoplay blocked by browser - user interaction required')
            }
            reject(err)
          })
      })
    } catch (error) {
      console.error('[TTS] Error:', error)
      throw error // Let caller handle
    }
  }

  // Send text message (fallback)
  const sendText = useCallback(
    async (text: string) => {
      const entry: TranscriptEntry = {
        speaker: 'user',
        text,
        isFinal: true,
        timestamp: Date.now(),
      }

      setTranscripts((prev) => [...prev, entry])
      onTranscript?.(entry)

      await handleUserMessage(text)
    },
    [sessionId, onTranscript]
  )

  // Commit transcript immediately - manual "done speaking" button
  const commitNow = useCallback(() => {
    const text = batchedTranscriptRef.current || currentTranscriptRef.current
    if (!text?.trim()) return

    // Clear the pending commit timer
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }

    // Clear refs
    const textToSend = text.trim()
    batchedTranscriptRef.current = ''
    currentTranscriptRef.current = ''

    console.log('[Scribe] Manual commit - sending:', textToSend)
    handleUserMessage(textToSend)
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    // Mark as intentional to prevent auto-reconnect
    intentionalDisconnectRef.current = true
    isReconnectingRef.current = false

    if (connectionRef.current) {
      console.log('[Scribe] Disconnecting...')
      connectionRef.current.close()
      connectionRef.current = null
    }

    // Clear any pending timers
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }
    if (partialUpdateTimerRef.current) {
      clearTimeout(partialUpdateTimerRef.current)
      partialUpdateTimerRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    batchedTranscriptRef.current = ''

    setStatus('disconnected')
    setIsRecording(false)
    setIsReconnecting(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Interrupt - stop current audio playback
  const interrupt = useCallback(() => {
    console.log('[Voice] Interrupt requested')
    // Could stop audio playback here if needed
  }, [])

  // Reconnect preserving conversation history (for manual reconnection)
  const reconnect = useCallback(async () => {
    console.log('[Voice] Manual reconnect - preserving conversation history')

    // Close existing connection if any
    if (connectionRef.current) {
      intentionalDisconnectRef.current = true // Prevent auto-reconnect during manual disconnect
      connectionRef.current.close()
      connectionRef.current = null
    }

    // Clear error state but preserve conversation
    setErrorCount(0)
    setLastError(null)
    reconnectAttemptRef.current = 0
    setReconnectAttempt(0)
    setIsReconnecting(false)
    intentionalDisconnectRef.current = false

    // Connect with forceReconnect flag to preserve conversation
    await connect(true)
  }, [connect])

  // Reset error state and allow retry (clears everything - use for fresh start only)
  const reset = useCallback(() => {
    setErrorCount(0)
    setLastError(null)
    setStatus('idle')
    reconnectAttemptRef.current = 0
    setReconnectAttempt(0)
    setIsReconnecting(false)
    intentionalDisconnectRef.current = false
    isReconnectingRef.current = false
    console.log('[Voice] Reset - ready to retry')
  }, [])

  return {
    status,
    transcripts,
    isRecording,
    lastError,
    errorCount,
    isReconnecting,
    reconnectAttempt,
    connect,
    disconnect,
    sendText,
    commitNow,
    interrupt,
    reconnect,
    reset,
  }
}
