import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface FileAttachment {
  id: string
  file: File
  preview?: string
  uploading?: boolean
  url?: string
  error?: string
}

interface InputAreaProps {
  onSend: (message: string, attachments?: FileAttachment[], wasVoice?: boolean) => void
  disabled?: boolean
  placeholder?: string
  isComplete?: boolean  // Conversation complete - de-emphasize input
  onHeightChange?: (height: number) => void
}

type DictationState = 'idle' | 'listening' | 'processing'

// Check if browser supports speech recognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

const SILENCE_TIMEOUT_MS = 3000 // Auto-stop after 3s of silence
const ACCEPTED_FILE_TYPES = 'image/png,image/jpeg,image/gif,image/webp,application/pdf'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function InputArea({
  onSend,
  disabled = false,
  placeholder = 'Ask anything...',
  isComplete = false,
  onHeightChange,
}: InputAreaProps) {
  const [message, setMessage] = useState('')
  const [dictationState, setDictationState] = useState<DictationState>('idle')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isFocusedWhileComplete, setIsFocusedWhileComplete] = useState(false)
  const [wasDictated, setWasDictated] = useState(false) // Track if message came from voice

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputAreaRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isStoppingRef = useRef(false) // Prevent duplicate stopDictation calls

  // Report input area height changes so chat container can adjust bottom padding
  useEffect(() => {
    if (!inputAreaRef.current || !onHeightChange) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height)
      }
    })
    observer.observe(inputAreaRef.current)
    return () => observer.disconnect()
  }, [onHeightChange])

  // Auto-focus input after AI response
  useEffect(() => {
    if (!disabled && dictationState === 'idle' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled, dictationState])

  // Auto-expand textarea as content changes
  useEffect(() => {
    if (textareaRef.current && dictationState === 'idle') {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [message, dictationState])

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(att => {
        if (att.preview) URL.revokeObjectURL(att.preview)
      })
    }
  }, [])

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`
    const filePath = `attachments/${fileName}`

    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file)

    if (error) {
      console.error('[Upload] Error uploading file:', error)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = useCallback(async () => {
    if ((!message.trim() && attachments.length === 0) || disabled) return

    // Upload any attachments that haven't been uploaded yet
    const uploadedAttachments = await Promise.all(
      attachments.map(async (att) => {
        if (att.url) return att

        const url = await uploadFile(att.file)
        return { ...att, url: url || undefined, error: url ? undefined : 'Upload failed' }
      })
    )

    // Filter out failed uploads
    const successfulAttachments = uploadedAttachments.filter(att => att.url)

    onSend(message.trim(), successfulAttachments.length > 0 ? successfulAttachments : undefined, wasDictated)
    setMessage('')
    setAttachments([])
    setWasDictated(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [message, attachments, disabled, onSend, wasDictated])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    const newAttachments: FileAttachment[] = files
      .filter(file => {
        if (file.size > MAX_FILE_SIZE) {
          console.warn(`[Upload] File ${file.name} exceeds size limit`)
          return false
        }
        return true
      })
      .map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }))

    setAttachments(prev => [...prev, ...newAttachments])

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id)
      if (att?.preview) URL.revokeObjectURL(att.preview)
      return prev.filter(a => a.id !== id)
    })
  }

  // Stop dictation - defined first since resetSilenceTimer depends on it
  const stopDictation = useCallback((shouldSubmit: boolean = false) => {
    // Guard against duplicate calls (silence timer + user click can race)
    if (isStoppingRef.current) {
      console.log('[Dictation] Already stopping, ignoring duplicate call')
      return
    }
    isStoppingRef.current = true

    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    setDictationState('processing')
    setInterimTranscript('')

    setTimeout(() => {
      setDictationState('idle')
      isStoppingRef.current = false // Reset for next dictation session
      if (shouldSubmit) {
        setTimeout(() => {
          handleSubmit()
        }, 50)
      }
    }, 300)
  }, [handleSubmit])

  // Reset silence timer
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    silenceTimerRef.current = setTimeout(() => {
      console.log('[Dictation] Silence timeout - auto-submitting')
      stopDictation(true)
    }, SILENCE_TIMEOUT_MS)
  }, [stopDictation])

  // Start dictation
  const startDictation = useCallback(() => {
    if (!SpeechRecognition) {
      console.warn('[Dictation] Speech recognition not supported')
      return
    }

    // Defensive: stop any existing recognition first to prevent duplicates
    if (recognitionRef.current) {
      console.log('[Dictation] Stopping existing recognition before starting new one')
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore errors from stopping already-stopped recognition
      }
      recognitionRef.current = null
    }

    console.log('[Dictation] Starting new recognition session')
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      console.log('[Dictation] Started listening')
      setDictationState('listening')
      setInterimTranscript('')
      setWasDictated(true) // Mark as voice input
      resetSilenceTimer()
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interim = transcript
        }
      }

      setInterimTranscript(interim)

      if (finalTranscript) {
        setMessage(prev => prev + (prev ? ' ' : '') + finalTranscript.trim())
        setInterimTranscript('')
      }

      resetSilenceTimer()
    }

    recognition.onerror = (event: any) => {
      console.error('[Dictation] Error:', event.error)
      setDictationState('idle')
      setInterimTranscript('')
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }

    recognition.onend = () => {
      console.log('[Dictation] Recognition ended')
      if (dictationState === 'listening') {
        setDictationState('processing')
        setTimeout(() => setDictationState('idle'), 300)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [resetSilenceTimer, dictationState])

  // Toggle dictation
  const handleDictationButton = useCallback(() => {
    if (dictationState === 'listening') {
      stopDictation(true)
    } else if (dictationState === 'idle') {
      startDictation()
    }
  }, [dictationState, stopDictation, startDictation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }
  }, [])

  const hasContent = message.trim().length > 0 || attachments.length > 0
  const isListening = dictationState === 'listening'
  const isProcessing = dictationState === 'processing'

  return (
    <div ref={inputAreaRef} className="fixed bottom-0 left-0 right-0 z-10 px-4 pt-3 md:px-6 md:pt-4 bg-gradient-to-t from-white/80 via-white/60 to-transparent backdrop-blur-sm"
         style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}>
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Main input container */}
        <div className={`
          relative flex flex-col
          bg-white rounded-3xl
          border transition-all duration-200
          ${isListening
            ? 'border-brand-purple/50 shadow-xl shadow-brand-purple/20'
            : 'border-gray-200 shadow-sm hover:shadow-md'
          }
          ${disabled ? 'opacity-60' : ''}
          ${isComplete && !isFocusedWhileComplete ? 'opacity-50' : ''}
        `}>
          {/* File preview chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              {attachments.map(att => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 text-sm"
                >
                  {att.preview ? (
                    <img
                      src={att.preview}
                      alt={att.file.name}
                      className="w-6 h-6 rounded object-cover"
                    />
                  ) : (
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9v6h2v-6h3l-4-4-4 4h3z" />
                    </svg>
                  )}
                  <span className="text-gray-700 max-w-[120px] truncate">
                    {att.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="text-gray-400 hover:text-gray-600 -mr-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text input area */}
          <div className="px-4 pt-3 pb-2">
            {isListening || isProcessing ? (
              <div className="flex items-center gap-3 min-h-[24px]">
                {isListening ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-pulse" />
                      <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-pulse [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-pulse [animation-delay:300ms]" />
                    </div>
                    <span className="text-sm text-brand-purple font-medium">
                      Listening...
                    </span>
                    {(message || interimTranscript) && (
                      <span className="text-sm text-gray-500 truncate">
                        {message}
                        {interimTranscript && (
                          <span className="text-gray-400 italic"> {interimTranscript}</span>
                        )}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Processing...</span>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  setWasDictated(false) // Reset when user types manually
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => isComplete && setIsFocusedWhileComplete(true)}
                onBlur={() => setIsFocusedWhileComplete(false)}
                placeholder={isComplete ? 'Your summary is ready above...' : placeholder}
                disabled={disabled}
                rows={1}
                className="w-full bg-transparent text-gray-900 placeholder:text-gray-400
                         resize-none overflow-y-auto min-h-[24px] max-h-[200px]
                         focus:outline-none text-base leading-relaxed
                         disabled:cursor-not-allowed"
              />
            )}
          </div>

          {/* Bottom button row - ChatGPT style */}
          <div className="flex items-center justify-between px-3 pb-3">
            {/* Left side - Upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isListening}
              className="w-8 h-8 rounded-full flex items-center justify-center
                       text-gray-400 hover:text-gray-600 hover:bg-gray-100
                       transition-all duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed"
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Right side - Mic and Send buttons */}
            <div className="flex items-center gap-1">
              {/* Mic button */}
              {SpeechRecognition && (
                <button
                  type="button"
                  onClick={handleDictationButton}
                  disabled={disabled || isProcessing}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    transition-all duration-200
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${isListening
                      ? 'bg-brand-purple text-white'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }
                  `}
                  title={isListening ? 'Stop recording' : 'Voice input'}
                >
                  {isListening ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Send button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled || !hasContent}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-200
                  ${hasContent
                    ? 'bg-brand-purple text-white hover:bg-brand-purple/90'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
                title="Send message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
