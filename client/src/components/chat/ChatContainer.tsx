import { useRef, useEffect, useCallback, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import { LoadingDots } from '../ui/LoadingDots'
import { EmailCaptureCard } from './EmailCaptureCard'
import { EarlyExitEmailCard } from './EarlyExitEmailCard'
import type { Message } from '../../types'

type ConversationPhase = 'context' | 'exploration' | 'diagnosis' | 'closing' | 'complete'

interface ChatContainerProps {
  messages: Message[]
  isLoading?: boolean
  isInitializing?: boolean
  isCleaningVoice?: boolean
  isComplete?: boolean
  conversationPhase?: ConversationPhase
  sessionId?: string
  onViewSummary?: () => void
  headerHeight?: number
  inputHeight?: number
  showEmailCapture?: boolean
  onEmailSubmit?: (email: string) => Promise<void>
  hasEmail?: boolean  // Whether user has already provided email
  showEarlyExitEmail?: boolean
  onEarlyExitEmailSubmit?: (email: string) => Promise<void>
  onEarlyExitEmailSkip?: () => void
  onHandoffEmailSubmit?: (email: string) => Promise<void>  // Email submit on handoff card
}

export function ChatContainer({
  messages,
  isLoading = false,
  isInitializing = false,
  isCleaningVoice = false,
  isComplete = false,
  conversationPhase,
  sessionId,
  onViewSummary,
  headerHeight,
  inputHeight,
  showEmailCapture,
  onEmailSubmit,
  hasEmail = false,
  showEarlyExitEmail,
  onEarlyExitEmailSubmit,
  onEarlyExitEmailSkip,
  onHandoffEmailSubmit,
}: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isUserScrolledUp = useRef<boolean>(false)
  const prevMessageCount = useRef<number>(messages.length)
  const [showScrollUp, setShowScrollUp] = useState(false)

  // Track if user has scrolled up from bottom
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    isUserScrolledUp.current = distanceFromBottom > 100
    // Show "scroll up" indicator when there's content above and user is near bottom
    setShowScrollUp(scrollTop > 200 && distanceFromBottom < 100)
  }, [])

  // Auto-scroll to bottom only when new messages arrive (not on every render)
  useEffect(() => {
    const messageCountChanged = messages.length !== prevMessageCount.current
    prevMessageCount.current = messages.length

    if (messageCountChanged && !isUserScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Also scroll to bottom when loading state starts (user just sent a message)
  useEffect(() => {
    if (isLoading && !isUserScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isLoading])

  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 md:px-6 select-none"
      style={{
        WebkitOverflowScrolling: 'touch',
        paddingTop: headerHeight ? `${headerHeight + 16}px` : '144px',
        paddingBottom: inputHeight ? `${inputHeight + 16}px` : '176px',
      }}
    >
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex flex-col gap-6">
        {/* Initial greeting loader - distinct from regular loading */}
        {isInitializing && (
          <div className="self-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 px-5 py-4 bg-white rounded-2xl shadow-sm border border-gray-100">
              {/* Animated Mira avatar/icon */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-teal to-brand-purple flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">M</span>
                </div>
                {/* Pulsing ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-teal to-brand-purple opacity-30 animate-ping" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-900">Mira</span>
                <span className="text-sm text-gray-500">Getting ready to chat...</span>
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const isAdvisorMessage = message.speaker === 'advisor'

          // Find if this is the last advisor message (for showing handoff card)
          // We need to check if any advisor messages come after this one
          const isLastAdvisorMessage = isAdvisorMessage &&
            !messages.slice(index + 1).some(m => m.speaker === 'advisor')

          // Show handoff on the last advisor message when complete
          // This ensures the card stays visible even if user sends another message
          const isHandoffMessage = isComplete && isLastAdvisorMessage

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isHandoffMessage={isHandoffMessage}
              sessionId={sessionId}
              onViewSummary={onViewSummary}
              hasEmail={hasEmail}
              onEmailSubmit={onHandoffEmailSubmit}
            />
          )
        })}

        {/* Mid-conversation email capture card */}
        {showEmailCapture && !isComplete && onEmailSubmit && (
          <EmailCaptureCard
            onSubmit={onEmailSubmit}
            sessionId={sessionId}
          />
        )}

        {/* Early exit email capture (shown when conversation ends before diagnosis) */}
        {showEarlyExitEmail && onEarlyExitEmailSubmit && onEarlyExitEmailSkip && (
          <EarlyExitEmailCard
            onSubmit={onEarlyExitEmailSubmit}
            onSkip={onEarlyExitEmailSkip}
          />
        )}

        {/* Loading indicator - two phases for voice input */}
        {isLoading && (
          <div className="self-start">
            {isCleaningVoice ? (
              /* Voice Processing Phase - engaging, momentum-focused */
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-brand-purple/10 to-brand-teal/10 rounded-2xl border border-brand-purple/20 animate-in slide-in-from-left-2 duration-300">
                <div className="relative">
                  {/* Animated sound wave icon */}
                  <div className="flex items-end gap-0.5 h-5">
                    <div className="w-1 bg-brand-purple rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0ms' }} />
                    <div className="w-1 bg-brand-purple rounded-full animate-pulse" style={{ height: '80%', animationDelay: '150ms' }} />
                    <div className="w-1 bg-brand-purple rounded-full animate-pulse" style={{ height: '60%', animationDelay: '300ms' }} />
                    <div className="w-1 bg-brand-purple rounded-full animate-pulse" style={{ height: '100%', animationDelay: '450ms' }} />
                    <div className="w-1 bg-brand-purple rounded-full animate-pulse" style={{ height: '50%', animationDelay: '600ms' }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-brand-purple">
                  Processing your voice...
                </span>
              </div>
            ) : (
              /* AI Thinking Phase - phase-aware loading dots */
              <LoadingDots conversationPhase={conversationPhase} />
            )}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to top indicator */}
      {showScrollUp && (
        <button
          onClick={scrollToTop}
          className="fixed left-1/2 -translate-x-1/2 z-40
                     px-3 py-1.5 rounded-full
                     bg-white/90 backdrop-blur-sm shadow-md border border-gray-200
                     text-xs text-gray-500 font-medium
                     hover:bg-white hover:shadow-lg hover:text-gray-700
                     transition-all duration-200
                     animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{
            bottom: inputHeight ? `${inputHeight + 12}px` : '180px',
          }}
          aria-label="Scroll to top of conversation"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Scroll up to see more
          </span>
        </button>
      )}
    </div>
  )
}
