import { useState, useMemo, useRef } from 'react'
import { useVoiceConversation } from '../../hooks/useVoiceConversation'
import { VoiceStatus } from './VoiceStatus'
import { TranscriptDisplay } from './TranscriptDisplay'
import { VoiceWelcomeModal } from './VoiceWelcomeModal'
import { Button } from '../ui/Button'
import type { ToolCallEvent, TranscriptEntry } from '../../hooks/useVoiceConversation'
import type { Phase, Message } from '../../types'

interface VoiceInterfaceProps {
  sessionId: string
  onToolCall: (toolCall: ToolCallEvent) => void
  onSwitchToText: () => void
  onSaveProgress: () => void
  currentPhase: Phase
  existingMessages?: Message[]
  onNewMessages?: (userMessage: Message | null, advisorMessage: Message | null) => void
}

export function VoiceInterface({
  sessionId,
  onToolCall,
  onSwitchToText,
  onSaveProgress,
  currentPhase,
  existingMessages = [],
  onNewMessages,
}: VoiceInterfaceProps) {
  // Convert existing text messages to transcript format
  const initialTranscripts = useMemo((): TranscriptEntry[] => {
    return existingMessages.map((msg) => ({
      speaker: msg.speaker === 'user' ? 'user' : 'assistant',
      text: msg.message_text,
      isFinal: true,
      timestamp: new Date(msg.created_at).getTime(),
    }))
  }, [existingMessages])

  // Track if voice has been started in this session
  const hasStartedVoice = useRef(false)

  // Show welcome modal only on first switch to voice (not every time)
  const [showWelcomeModal, setShowWelcomeModal] = useState(!hasStartedVoice.current)

  const {
    status,
    transcripts,
    lastError,
    errorCount,
    isReconnecting,
    reconnectAttempt,
    connect,
    commitNow,
    interrupt,
    reconnect,
    reset,
  } = useVoiceConversation({
    sessionId,
    onToolCall,
    initialTranscripts,
    onError: (error) => {
      console.error('[VoiceInterface] Error:', error)
    },
    // Sync messages with parent for seamless text↔voice transitions
    onMessage: onNewMessages as any,
  })

  const MAX_RETRIES = 2

  const handleStartVoice = async () => {
    hasStartedVoice.current = true
    setShowWelcomeModal(false)
    await connect()
  }

  const handleDeclineVoice = () => {
    setShowWelcomeModal(false)
    onSwitchToText()
  }

  const handleRetry = () => {
    reset()
    connect()
  }

  return (
    <div className="h-full flex flex-col bg-gradient-page">
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <VoiceWelcomeModal
          onStart={handleStartVoice}
          onDecline={handleDeclineVoice}
        />
      )}

      {/* Subtle transition notification - removed full-screen overlay for elegance */}

      {/* Error State - Full Screen */}
      {status === 'error' && !showWelcomeModal && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md w-full text-center relative overflow-hidden
                         bg-gradient-to-br from-red-50 via-white to-orange-50
                         rounded-3xl border-2 border-red-100 shadow-xl shadow-red-500/10 p-8">
            {/* Warning Icon with gradient */}
            <div className="inline-flex items-center justify-center w-20 h-20
                          bg-gradient-to-br from-red-500 to-orange-600
                          rounded-full mb-4 shadow-lg shadow-red-500/25">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connection Error
            </h2>
            <p className="text-gray-600 mb-1">
              {lastError || 'Unable to connect to voice service'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Attempt {errorCount} of {MAX_RETRIES}
            </p>

            <div className="space-y-3">
              {errorCount < MAX_RETRIES ? (
                <Button
                  onClick={handleRetry}
                  size="lg"
                  className="w-full"
                >
                  Try Again
                </Button>
              ) : (
                <p className="text-sm text-gray-600 mb-4">
                  Maximum retry attempts reached. Please try text mode or reload the page.
                </p>
              )}

              <button
                onClick={onSwitchToText}
                className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors py-2"
              >
                Continue with Text Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconnection Modal - Full Screen */}
      {(status === 'disconnected' || isReconnecting) && !showWelcomeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              {/* Connection Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full mb-6 shadow-lg relative">
                {isReconnecting ? (
                  <>
                    <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    {/* Pulse rings */}
                    <div className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-20"></div>
                  </>
                ) : (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Status Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {isReconnecting ? 'Reconnecting...' : 'Connection Lost'}
              </h3>

              {isReconnecting ? (
                <div className="space-y-3 mb-6">
                  <p className="text-base text-gray-600">
                    Attempting to restore your voice session
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Attempt {reconnectAttempt} • Retrying in 3 seconds
                  </p>
                </div>
              ) : (
                <p className="text-base text-gray-600 mb-6">
                  We're having trouble maintaining your voice connection
                </p>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={reconnect}
                  size="lg"
                  className="w-full"
                  disabled={isReconnecting}
                >
                  {isReconnecting ? 'Reconnecting...' : 'Try Again Now'}
                </Button>

                <button
                  onClick={onSwitchToText}
                  className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors rounded-xl hover:bg-gray-50"
                >
                  Switch to Text Mode Instead
                </button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-gray-400 mt-6">
                Your conversation is saved and will resume where you left off
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Normal Voice UI */}
      {status !== 'error' && !showWelcomeModal && (
        <>

          {/* Header with Status and Actions */}
          <div className="bg-white/50 backdrop-blur-sm border-b border-gray-100 px-4 md:px-6">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 py-3">
              <VoiceStatus
                status={status}
                onInterrupt={status === 'output_mode' ? interrupt : undefined}
              />

              {/* Progress indicator - enhanced badge */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2
                            bg-gradient-to-r from-brand-indigo/15 to-brand-purple/15
                            rounded-xl border border-brand-indigo/30 shadow-sm">
                <svg className="w-4 h-4 text-brand-indigo" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold text-brand-indigo">
                  {currentPhase === 'context' && "Discovery"}
                  {currentPhase === 'exploration' && "Deep Dive"}
                  {currentPhase === 'diagnosis' && "Analysis"}
                  {currentPhase === 'readiness' && "Assessment"}
                  {currentPhase === 'routing' && "Recommendation"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Save Progress */}
                <button
                  onClick={onSaveProgress}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900
                           bg-white rounded-xl border border-gray-200 hover:border-gray-300
                           transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                           shadow-sm"
                  title="Save progress and get resume link"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="hidden sm:inline">Save</span>
                </button>

                {/* Switch to text */}
                <button
                  onClick={onSwitchToText}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900
                           bg-white rounded-xl border border-gray-200 hover:border-gray-300
                           transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                           shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="hidden sm:inline">Switch to text</span>
                </button>
              </div>
            </div>
          </div>

          {/* Transcript Display */}
          <TranscriptDisplay transcripts={transcripts} status={status} />

          {/* Controls - Integrated Design */}
          <div className="px-4 md:px-6 py-6 bg-white/80 backdrop-blur-sm border-t border-gray-200/50 shadow-lg">
            <div className="max-w-2xl mx-auto">
              {/* Main voice indicator - compact */}
              <div className="flex items-center justify-center gap-6">
                {/* Microphone visual */}
                <div className="relative">
                  {/* Animated ripple rings - disabled to test flickering */}
                  {/* {status === 'input_mode' && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full bg-brand-purple/20 animate-ping" style={{ animationDuration: '2s' }} />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-40 h-40 rounded-full bg-brand-purple/10 animate-ping" style={{ animationDuration: '2.5s' }} />
                      </div>
                    </>
                  )}
                  {status === 'output_mode' && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full bg-brand-teal/20 animate-ping" style={{ animationDuration: '2s' }} />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-40 h-40 rounded-full bg-brand-teal/10 animate-ping" style={{ animationDuration: '2.5s' }} />
                      </div>
                    </>
                  )} */}

                  {/* Main indicator circle - enhanced size */}
                  <div className="relative">
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                        status === 'input_mode'
                          ? 'bg-gradient-to-br from-brand-purple to-brand-purple/80 shadow-xl shadow-purple-500/40'
                          : status === 'output_mode'
                          ? 'bg-gradient-to-br from-brand-teal to-brand-teal/80 shadow-xl shadow-teal-500/40'
                          : status === 'thinking'
                          ? 'bg-gradient-to-br from-brand-indigo to-brand-indigo/80 shadow-xl shadow-indigo-500/40 animate-pulse'
                          : status === 'ready'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-xl shadow-green-500/40 animate-pulse'
                          : status === 'connecting'
                          ? 'bg-white border-2 border-gray-300 shadow-lg'
                          : 'bg-white border-2 border-gray-200 shadow-md'
                      }`}
                    >
                      {/* Checkmark icon for ready state */}
                      {status === 'ready' && (
                        <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {/* Microphone icon - enhanced size */}
                      {(status === 'input_mode' || status === 'idle' || status === 'connected') && (
                        <svg className={`w-9 h-9 ${status === 'input_mode' ? 'text-white' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      )}
                      {status === 'output_mode' && (
                        <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      )}
                      {status === 'thinking' && (
                        <svg className="w-9 h-9 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                      {status === 'connecting' && (
                        <svg className="w-9 h-9 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status text - enhanced typography */}
                <div className="flex-1">
                  {status === 'input_mode' && (
                    <div>
                      <p className="text-lg font-bold text-brand-purple mb-0.5">
                        Your turn
                      </p>
                      <p className="text-sm text-gray-500">
                        Start speaking naturally
                      </p>
                    </div>
                  )}

                {/* Done Speaking button - only visible during input_mode */}
                {status === 'input_mode' && (
                  <button
                    onClick={commitNow}
                    className="mt-3 px-5 py-2.5 bg-white rounded-xl border border-gray-200
                             text-gray-700 font-medium shadow-sm
                             hover:bg-gray-50 hover:border-gray-300
                             transition-all duration-200
                             active:scale-[0.98]"
                  >
                    Done Speaking
                  </button>
                )}
                  {status === 'output_mode' && (
                    <div>
                      <p className="text-lg font-bold text-brand-teal mb-0.5">
                        CoachMira is responding
                      </p>
                      <p className="text-sm text-gray-500">
                        Listening...
                      </p>
                    </div>
                  )}
                  {status === 'thinking' && (
                    <p className="text-lg font-bold text-brand-indigo">
                      Processing...
                    </p>
                  )}
                  {status === 'connecting' && (
                    <p className="text-base text-gray-600 font-medium">
                      Connecting to voice service...
                    </p>
                  )}
                  {status === 'connected' && (
                    <p className="text-base text-green-600 font-semibold">
                      Connected
                    </p>
                  )}
                  {status === 'ready' && (
                    <div>
                      <p className="text-lg font-bold text-green-600 mb-0.5">
                        Ready!
                      </p>
                      <p className="text-sm text-gray-500">
                        Your turn is coming up...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
