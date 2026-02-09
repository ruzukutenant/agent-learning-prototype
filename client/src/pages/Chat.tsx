import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PhaseHeader } from '../components/chat/PhaseHeader'
import { ChatContainer } from '../components/chat/ChatContainer'
import { InputArea, FileAttachment } from '../components/chat/InputArea'
import { SaveProgressModal } from '../components/chat/SaveProgressModal'
import { VoiceInterface } from '../components/voice/VoiceInterface'
import { InsightToast } from '../components/chat/InsightToast'
import { api } from '../lib/api'
import { trackChatStart, trackChatCompletion, trackEmailProvided } from '../lib/analytics'
import { trackMetaCustomEvent, trackMetaEvent, getMetaCookies } from '../lib/meta-pixel'
import type { Session, Message } from '../types'

type ConversationMode = 'voice' | 'text'

interface Insight {
  id: string
  text: string
  turnNumber: number
}

export default function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false) // First greeting load
  const [error, setError] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [mode, setMode] = useState<ConversationMode>('text')
  const [headerHeight, setHeaderHeight] = useState<number>(0)
  const [inputHeight, setInputHeight] = useState<number>(0)
  const [isModeSwitching, setIsModeSwitching] = useState(false)
  const [showSaveProgress, setShowSaveProgress] = useState(false)
  const [showExitIntent, setShowExitIntent] = useState(false)
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false)
  const [isConversationComplete, setIsConversationComplete] = useState(false)
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [showEarlyExitEmail, setShowEarlyExitEmail] = useState(false)
  const [emailCapturedMidChat, setEmailCapturedMidChat] = useState(false)

  // Learning journey tracking (wired to backend conversation_state)
  const [insights, setInsights] = useState<Insight[]>([])
  const [currentToast, setCurrentToast] = useState<string | null>(null)
  const previousInsightCount = useRef(0)

  // Tracking refs to prevent duplicate events
  const hasTrackedChatStart = useRef(false)
  const hasTrackedCompletion = useRef(false)
  const hasInitialized = useRef(false)

  // Keyboard shortcut to copy last advisor response (Cmd+Shift+C / Ctrl+Shift+C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()

        // Find the most recent advisor message
        const advisorMessages = messages.filter(m => m.speaker === 'advisor')
        const lastAdvisorMessage = advisorMessages[advisorMessages.length - 1]

        if (lastAdvisorMessage?.message_text) {
          navigator.clipboard.writeText(lastAdvisorMessage.message_text)
            .then(() => {
              console.log('[Chat] Copied last advisor response to clipboard')
            })
            .catch(err => {
              console.error('[Chat] Failed to copy to clipboard:', err)
            })
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [messages])

  // Fetch session and initialize conversation
  useEffect(() => {
    if (!sessionId) {
      navigate('/')
      return
    }

    // Prevent duplicate initialization (React StrictMode runs effects twice)
    if (hasInitialized.current) {
      return
    }

    const initializeChat = async () => {
      try {
        // Get session
        const { session } = await api.getSession(sessionId)
        setSession(session)

        // Get existing messages
        const { messages: existingMessages } = await api.getMessages(sessionId)

        // If no messages, send __INIT__ to get greeting
        if (existingMessages.length === 0) {
          setIsInitializing(true)
          const { advisorMessage } = await api.sendMessage(sessionId, '__INIT__')
          setMessages(advisorMessage ? [advisorMessage] : [])
          setIsInitializing(false)
        } else {
          setMessages(existingMessages)

          // Check if session is already complete (e.g. user refreshed or returned)
          if (session.conversation_state?.phase === 'complete') {
            console.log('[Chat] Session already complete on load — showing handoff UI')
            setIsConversationComplete(true)
          }
        }

        // Track StartConversation in Meta Pixel (only for new sessions, not resumes)
        if (existingMessages.length === 0) {
          trackMetaCustomEvent('StartConversation')
        }

        // Mark as initialized
        hasInitialized.current = true
      } catch (err) {
        console.error('Error initializing chat:', err)
        setError('Failed to load conversation')
      }
    }

    initializeChat()
  }, [sessionId, navigate])

  // Track completion when constraint is identified
  useEffect(() => {
    if (session?.constraint_category && !hasTrackedCompletion.current) {
      trackChatCompletion(session.id, session.constraint_category)
      hasTrackedCompletion.current = true
    }
  }, [session?.constraint_category])

  // Sync insights from backend conversation_state, tracking phase for each
  useEffect(() => {
    if (session?.conversation_state?.learner_state) {
      const learner = session.conversation_state.learner_state
      const currentPhase = session.conversation_state.phase

      // Map insights from backend, preserving phase info for existing insights
      if (learner.insights_articulated?.length) {
        const backendInsightCount = learner.insights_articulated.length

        // Check if there are new insights
        if (backendInsightCount > previousInsightCount.current) {
          // Get the new insight texts
          const newInsightTexts = learner.insights_articulated.slice(previousInsightCount.current)

          // Create new insight objects with current phase
          const newInsightObjects = newInsightTexts.map((text: string, i: number) => ({
            id: `insight-${previousInsightCount.current + i}`,
            text,
            turnNumber: previousInsightCount.current + i + 1,
            phase: currentPhase || 'exploration'
          }))

          // Show the newest insight as a toast
          const latestInsight = newInsightObjects[newInsightObjects.length - 1]
          setCurrentToast(latestInsight.text)

          // Append new insights to existing ones (preserving their phases)
          setInsights(prev => [...prev, ...newInsightObjects])
          previousInsightCount.current = backendInsightCount
        }
      }
    }
  }, [session?.conversation_state])

  // Check for endpoint selection and navigate to summary
  useEffect(() => {
    if (session?.endpoint_selected && session?.user_email && session?.constraint_category) {
      handleSummaryTransition()
    }
  }, [session])

  // Exit intent detection (desktop only)
  useEffect(() => {
    // Only on desktop (min 768px width)
    const isDesktop = window.innerWidth >= 768

    if (!isDesktop) return

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if:
      // 1. Haven't shown exit intent yet
      // 2. Mouse is leaving from top of page (heading to close tab)
      // 3. User has started conversation (has messages)
      // 4. User hasn't provided email yet (hasn't saved)
      // 5. Not transitioning to summary
      const isLeavingFromTop = e.clientY <= 0
      const hasProgress = messages.length > 1 // More than just greeting
      const hasNotSaved = !session?.user_email

      if (
        !hasShownExitIntent &&
        isLeavingFromTop &&
        hasProgress &&
        hasNotSaved &&
        !isTransitioning
      ) {
        setShowExitIntent(true)
        setHasShownExitIntent(true)
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [hasShownExitIntent, messages, session, isTransitioning])

  const handleSendMessage = async (text: string, attachments?: FileAttachment[], wasVoice?: boolean) => {
    if (!session) return

    // Clear any previous inline errors
    setInlineError(null)

    // Track first user message (chat started)
    if (!hasTrackedChatStart.current && text !== '__INIT__') {
      trackChatStart(session.id)
      hasTrackedChatStart.current = true
    }

    // Convert FileAttachment to MessageAttachment format
    const messageAttachments = attachments?.map(att => ({
      url: att.url!,
      type: att.file.type.startsWith('image/') ? 'image' as const : 'pdf' as const,
      name: att.file.name,
    }))

    // Show optimistic user message immediately for text input
    // For voice: show placeholder, then animate in cleaned text
    const optimisticMessageId = Date.now().toString()

    if (wasVoice) {
      // Voice input: Two-phase approach for better UX
      // Phase 1: Clean up voice transcription (fast, ~1-2s)
      // Phase 2: Get Mira's response (slower, ~5-10s)

      // Add placeholder user message immediately
      const placeholderMessage: Message = {
        id: optimisticMessageId,
        session_id: session.id,
        created_at: new Date().toISOString(),
        turn_number: messages.length + 1,
        speaker: 'user',
        message_text: '__VOICE_PROCESSING__', // Special marker for placeholder state
        phase: session.current_phase,
        detected_signals: null,
        was_voice: true,
        audio_duration_seconds: null,
      }
      setMessages((prev) => [...prev, placeholderMessage])

      try {
        // Phase 1: Clean up voice transcription (fast)
        const { cleanedText } = await api.cleanupVoice(text)

        // Update placeholder with cleaned text - user sees their message now
        setMessages((prev) => prev.map(msg =>
          msg.id === optimisticMessageId
            ? { ...msg, message_text: cleanedText }
            : msg
        ))

        // Phase 2: Now show "Mira thinking" and get AI response
        setIsLoading(true)

        const response = await api.sendMessage(session.id, cleanedText, true, messageAttachments, getMetaCookies())

        // Update session
        setSession(response.session)

        // Add advisor response
        if (response.advisorMessage) {
          setMessages((prev) => [...prev, response.advisorMessage])
        }

        // Check for email capture components
        const emailComponent = response.components?.components?.find((c: any) => c.type === 'collect_email') as any
        if (emailComponent) {
          if (emailComponent.config?.variant === 'early_exit') {
            setShowEarlyExitEmail(true)
          } else {
            setShowEmailCapture(true)
          }
        }

        // Check if conversation is complete
        const isComplete = response.complete ||
          response.session.conversation_state?.phase === 'complete'

        if (isComplete) {
          console.log('[Chat] Conversation complete, showing summary button. Phase:', response.session.conversation_state?.phase)
          setIsConversationComplete(true)
        }
      } catch (err) {
        console.error('Error processing voice message:', err)

        // Remove the placeholder message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessageId))

        // Show inline error
        setInlineError('Failed to send message. Please try again.')
        setTimeout(() => setInlineError(null), 5000)
      } finally {
        setIsLoading(false)
      }
    } else {
      // Text input: show message immediately
      const userMessage: Message = {
        id: optimisticMessageId,
        session_id: session.id,
        created_at: new Date().toISOString(),
        turn_number: messages.length + 1,
        speaker: 'user',
        message_text: text,
        phase: session.current_phase,
        detected_signals: null,
        was_voice: false,
        audio_duration_seconds: null,
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      try {
        // Send message to AI and get response
        const response = await api.sendMessage(session.id, text, false, messageAttachments, getMetaCookies())

        // Update session
        setSession(response.session)

        // Add advisor response
        if (response.advisorMessage) {
          setMessages((prev) => [...prev, response.advisorMessage])
        }

        // Check for email capture components
        const emailComponent = response.components?.components?.find((c: any) => c.type === 'collect_email') as any
        if (emailComponent) {
          if (emailComponent.config?.variant === 'early_exit') {
            setShowEarlyExitEmail(true)
          } else {
            setShowEmailCapture(true)
          }
        }

        // Check if conversation is complete
        const isComplete = response.complete ||
          response.session.conversation_state?.phase === 'complete'

        if (isComplete) {
          console.log('[Chat] Conversation complete, showing summary button. Phase:', response.session.conversation_state?.phase)
          setIsConversationComplete(true)
        }
      } catch (err) {
        console.error('Error sending message:', err)

        // Remove the optimistic user message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessageId))

        // Show inline error
        setInlineError('Failed to send message. Please try again.')
        setTimeout(() => setInlineError(null), 5000)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleSummaryTransition = () => {
    setIsTransitioning(true)

    // Navigate after showing transition message
    setTimeout(() => {
      navigate(`/summary/${sessionId}`)
    }, 1500)
  }

  const handleVoiceToolCall = (toolCall: { name: string; input: any }) => {
    // In new architecture, voice mode uses same flow as text mode
    // Only identify_constraint is used in chat - assessment happens on dedicated page
    if (toolCall.name === 'identify_constraint') {
      console.log('[Voice] Constraint identified, conversation complete')
    }
  }

  // Handle new messages from voice mode (keeps state in sync)
  const handleVoiceNewMessages = useCallback((userMessage: Message | null, advisorMessage: Message | null) => {
    setMessages((prev) => {
      const newMessages = [...prev]
      if (userMessage) {
        // Only add if not already present (check by id)
        if (!newMessages.find(m => m.id === userMessage.id)) {
          newMessages.push(userMessage)
        }
      }
      if (advisorMessage) {
        // Only add if not already present (check by id)
        if (!newMessages.find(m => m.id === advisorMessage.id)) {
          newMessages.push(advisorMessage)
        }
      }
      return newMessages
    })
  }, [])

  const handleSwitchToText = useCallback(() => {
    // Messages are already in sync via onNewMessages callback - no DB reload needed
    // Add smooth fade transition
    setIsModeSwitching(true)
    setTimeout(() => {
      setMode('text')
      setTimeout(() => setIsModeSwitching(false), 150)
    }, 150)
  }, [])

  // Voice mode hidden for now - keeping dictation only
  // const handleSwitchToVoice = useCallback(() => {
  //   // Add smooth fade transition
  //   setIsModeSwitching(true)
  //   setTimeout(() => {
  //     setMode('voice')
  //     setTimeout(() => setIsModeSwitching(false), 150)
  //   }, 150)
  // }, [])

  const handleSaveProgress = () => {
    // Always show the modal - it handles both cases:
    // - If user has email: pre-fills it and sends resume email
    // - If user doesn't have email: collects it first
    setShowSaveProgress(true)
  }

  const handleExitIntentSave = () => {
    setShowExitIntent(false)
    handleSaveProgress()
  }

  const handleExitIntentDismiss = () => {
    setShowExitIntent(false)
  }

  const handleToastDismiss = useCallback(() => {
    setCurrentToast(null)
  }, [])

  const handleSaveProgressEmailSubmit = async (email: string) => {
    if (!session) return

    // Don't close modal here - let it show success state first

    try {
      // Fire Meta Lead event only if email is new (deduped with server via eventId)
      const isNewEmail = !session.user_email
      const metaEventId = isNewEmail ? crypto.randomUUID() : undefined
      const metaCookies = isNewEmail ? getMetaCookies() : {}
      if (isNewEmail) {
        trackMetaEvent('Lead', { content_name: 'email_capture' }, metaEventId!)
      }

      // Update session with email + meta context for server-side CAPI
      const { session: updatedSession } = await api.updateSession(session.id, {
        user_email: email,
        ...(isNewEmail && {
          meta_fbp: metaCookies.fbp,
          meta_fbc: metaCookies.fbc,
          meta_event_id: metaEventId,
        }),
      } as any)
      setSession(updatedSession)

      // Track email provided (from save progress / exit intent modal in chat)
      trackEmailProvided(session.id, 'save_progress')

      // Send resume email so user can return to this conversation
      await sendResumeEmail(email)
    } catch (err) {
      console.error('Error saving email:', err)
      throw err // Re-throw so modal can show error state
    }
  }

  const sendResumeEmail = async (_email: string) => {
    if (!sessionId) return

    try {
      await api.sendResumeEmail(sessionId)
      // Success is shown in the modal
    } catch (err) {
      console.error('Error sending resume email:', err)
      throw err // Re-throw so modal can show error
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-page">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="text-brand-purple hover:text-brand-indigo underline font-medium"
          >
            Start a new assessment
          </a>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-page">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`h-[100dvh] flex flex-col overflow-hidden transition-opacity duration-800 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Fixed background gradient - stays visible throughout conversation */}
      <div className="fixed inset-0 bg-gradient-page -z-10" />
      {/* Summary Transition Overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-gradient-to-br from-brand-teal via-brand-purple to-brand-teal bg-size-200 animate-gradient flex items-center justify-center z-50">
          <div className="text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-6">
              <svg className="w-16 h-16 text-white mx-auto animate-spin-slow" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Preparing Your Summary
            </h2>
            <p className="text-white/80 text-lg">
              Analyzing your responses and crafting your personalized plan...
            </p>
          </div>
        </div>
      )}

      {/* Inline Error Banner */}
      {inlineError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 rounded-full shadow-lg max-w-md">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-white font-semibold text-sm">
                {inlineError}
              </p>
              <button
                onClick={() => setInlineError(null)}
                className="ml-2 text-white hover:text-red-100 transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice or Text Interface */}
      <div className={`flex-1 flex flex-col min-h-0 transition-opacity duration-150 ${isModeSwitching ? 'opacity-0' : 'opacity-100'}`}>
      {mode === 'voice' ? (
        <div className="h-full">
          <VoiceInterface
            sessionId={sessionId!}
            onToolCall={handleVoiceToolCall}
            onSwitchToText={handleSwitchToText}
            onSaveProgress={handleSaveProgress}
            currentPhase={session.current_phase}
            existingMessages={messages}
            onNewMessages={handleVoiceNewMessages}
          />
        </div>
      ) : (
        <>
          {/* Floating Header with phase progress and insights */}
          <PhaseHeader
            isComplete={!!session.constraint_category}
            phase={session.conversation_state?.phase}
            onSaveProgress={handleSaveProgress}
            insights={insights}
            onHeightChange={setHeaderHeight}
          />

          {/* Insight Toast - appears when new insight is captured */}
          {currentToast && (
            <InsightToast
              text={currentToast}
              onDismiss={handleToastDismiss}
            />
          )}

          {/* Chat Messages - flex-1 fills available space */}
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            isInitializing={isInitializing}
            isCleaningVoice={false}
            isComplete={isConversationComplete || session.conversation_state?.phase === 'complete'}
            conversationPhase={session.conversation_state?.phase as 'context' | 'exploration' | 'diagnosis' | 'closing' | 'complete' | undefined}
            sessionId={sessionId}
            onViewSummary={() => {
              // Go directly to summary - email collection happens there
              handleSummaryTransition()
            }}
            headerHeight={headerHeight}
            inputHeight={inputHeight}
            showEmailCapture={showEmailCapture && !emailCapturedMidChat}
            onEmailSubmit={async (email: string) => {
              if (!session) return
              const isNew = !session.user_email
              const metaEventId = isNew ? crypto.randomUUID() : undefined
              const metaCookies = isNew ? getMetaCookies() : {}
              if (isNew && metaEventId) {
                trackMetaEvent('Lead', { content_name: 'email_capture' }, metaEventId)
              }
              const { session: updatedSession } = await api.updateSession(session.id, {
                user_email: email,
                ...(isNew && { meta_fbp: metaCookies.fbp, meta_fbc: metaCookies.fbc, meta_event_id: metaEventId }),
              } as any)
              setSession(updatedSession)
              setEmailCapturedMidChat(true)
              trackEmailProvided(session.id, 'mid_chat')
            }}
            hasEmail={emailCapturedMidChat || !!session.user_email}
            showEarlyExitEmail={showEarlyExitEmail && !emailCapturedMidChat && !session.user_email}
            onEarlyExitEmailSubmit={async (email: string) => {
              if (!session) return
              const isNew = !session.user_email
              const metaEventId = isNew ? crypto.randomUUID() : undefined
              const metaCookies = isNew ? getMetaCookies() : {}
              if (isNew && metaEventId) {
                trackMetaEvent('Lead', { content_name: 'email_capture' }, metaEventId)
              }
              const { session: updatedSession } = await api.updateSession(session.id, {
                user_email: email,
                ...(isNew && { meta_fbp: metaCookies.fbp, meta_fbc: metaCookies.fbc, meta_event_id: metaEventId }),
              } as any)
              setSession(updatedSession)
              trackEmailProvided(session.id, 'early_exit')
            }}
            onEarlyExitEmailSkip={() => setShowEarlyExitEmail(false)}
            onHandoffEmailSubmit={async (email: string) => {
              if (!session) return
              const isNew = !session.user_email
              const metaEventId = isNew ? crypto.randomUUID() : undefined
              const metaCookies = isNew ? getMetaCookies() : {}
              if (isNew && metaEventId) {
                trackMetaEvent('Lead', { content_name: 'email_capture' }, metaEventId)
              }
              const { session: updatedSession } = await api.updateSession(session.id, {
                user_email: email,
                ...(isNew && { meta_fbp: metaCookies.fbp, meta_fbc: metaCookies.fbc, meta_event_id: metaEventId }),
              } as any)
              setSession(updatedSession)
            }}
          />

          {/* Save Progress Modal */}
          {showSaveProgress && (
            <SaveProgressModal
              onSubmit={handleSaveProgressEmailSubmit}
              onCancel={() => setShowSaveProgress(false)}
              defaultEmail={session?.user_email || ''}
            />
          )}

          {/* Continue to Assessment Button - DISABLED for orchestrator flow */}
          {/* Orchestrator handles full conversation until complete, then shows email collector */}
          {/* {session.constraint_category && !session.endpoint_selected && !isLoading && (
            <ContinueToAssessmentCard sessionId={sessionId!} />
          )} */}

          {/* Input Area */}
          <InputArea
            onSend={handleSendMessage}
            disabled={isLoading || showSaveProgress}
            isComplete={isConversationComplete || session.conversation_state?.phase === 'complete'}
            onHeightChange={setInputHeight}
          />
        </>
      )}
      </div>

      {/* Save Progress Modal (appears over voice mode too) */}
      {mode === 'voice' && showSaveProgress && (
        <SaveProgressModal
          onSubmit={handleSaveProgressEmailSubmit}
          onCancel={() => setShowSaveProgress(false)}
        />
      )}

      {/* Exit Intent Modal (desktop only) */}
      {showExitIntent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 slide-in-from-top-4 duration-300">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Wait! Don't Lose Your Progress
              </h3>
              <p className="text-base text-gray-600 leading-relaxed">
                You're making great progress! Save your assessment now and we'll send you a link to continue anytime.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExitIntentSave}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-purple-600 text-white font-semibold rounded-full hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save My Progress
              </button>

              <button
                onClick={handleExitIntentDismiss}
                className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                No thanks, continue without saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
