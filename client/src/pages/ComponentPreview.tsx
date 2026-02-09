import { useState, useRef, useCallback } from 'react'
import { EmailCollector } from '../components/chat/EmailCollector'
import { EmailCaptureCard } from '../components/chat/EmailCaptureCard'
import { EndOfConversationEmailCard } from '../components/chat/EndOfConversationEmailCard'

export default function ComponentPreview() {
  const [emailSubmitted, setEmailSubmitted] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-page p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Component Preview</h1>

        {/* Mid-Conversation Email Capture Card */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Email Capture Card (Mid-Conversation)</h2>
          <p className="text-sm text-gray-500 mb-4">Appears inline in chat around turn 10-12 when engagement is good. Not a modal.</p>

          <div className="bg-gradient-page rounded-2xl p-6 border border-gray-100">
            <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex flex-col gap-6">
              {/* Simulated advisor message — matches MessageBubble advisor style */}
              <div className="max-w-[85%] md:max-w-[75%] self-start">
                <div className="group/msg animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
                  <span className="text-xs font-semibold text-brand-purple uppercase tracking-wide block mb-2">Mira</span>
                  <div className="text-gray-800 text-lg leading-relaxed">
                    <p>That's a really important insight — you're recognizing that the bottleneck isn't about working harder, it's about how the work is structured. What would it look like if you could hand off the parts that don't require your expertise?</p>
                  </div>
                  <CopyButton text="That's a really important insight — you're recognizing that the bottleneck isn't about working harder, it's about how the work is structured. What would it look like if you could hand off the parts that don't require your expertise?" />
                </div>
              </div>

              {/* The actual component */}
              {!emailSubmitted ? (
                <EmailCaptureCard
                  onSubmit={async (email) => {
                    await new Promise(r => setTimeout(r, 1000))
                    console.log('Email submitted:', email)
                    setEmailSubmitted(true)
                  }}
                />
              ) : (
                <button
                  onClick={() => setEmailSubmitted(false)}
                  className="self-start text-sm text-brand-purple hover:underline"
                >
                  Reset email capture
                </button>
              )}

              {/* Simulated user message — matches MessageBubble user style */}
              <div className="max-w-[85%] md:max-w-[75%] self-end">
                <div className="bg-white rounded-3xl px-6 py-5
                                shadow-[0_2px_16px_-4px_rgba(0,0,0,0.1)]">
                  <div className="text-gray-800 text-lg leading-relaxed">
                    <p>Honestly, if I could just get the meal plan templates documented, my VA could handle 80% of the onboarding.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Summary / Handoff Card */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">View Summary Card (Handoff)</h2>
          <p className="text-sm text-gray-500 mb-4">Appears after the closing arc completes (Turn E). Attached to the last advisor message.</p>

          <div className="bg-gradient-page rounded-2xl p-6 border border-gray-100">
            <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex flex-col gap-6">
              {/* Simulated final advisor message */}
              <div className="max-w-[85%] md:max-w-[75%] self-start">
                <div className="group/msg relative">
                  <span className="text-xs font-semibold text-brand-purple uppercase tracking-wide block mb-2">Mira</span>
                  <div className="text-gray-800 text-lg leading-relaxed">
                    <p>Perfect. The free session will give you that outside perspective to map out exactly how to extract your systems without you becoming the technical writer.</p>
                  </div>
                  <CopyButton text="Perfect. The free session will give you that outside perspective to map out exactly how to extract your systems without you becoming the technical writer." />

                  {/* Handoff card — exact copy from MessageBubble */}
                  <div className="mt-6 bg-gradient-to-br from-teal-50/60 to-white rounded-2xl p-6
                                  border border-teal-100/80
                                  shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(20,184,166,0.08)]
                                  animate-in fade-in slide-in-from-bottom-3 duration-500">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600
                                      flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          Ready for Your Next Step
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Review your insights and book your free consultation
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => console.log('View summary clicked')}
                      className="group w-full px-6 py-4 relative
                                 bg-teal-600
                                 text-white font-semibold rounded-xl
                                 transition-all duration-300 ease-out
                                 shadow-[0_1px_2px_rgba(13,148,136,0.2),0_4px_12px_rgba(13,148,136,0.15)]
                                 hover:bg-teal-500 hover:shadow-[0_1px_2px_rgba(13,148,136,0.25),0_8px_24px_rgba(13,148,136,0.2)]
                                 active:bg-teal-700
                                 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/[0.12] before:to-transparent before:pointer-events-none
                                 flex items-center justify-center gap-2"
                    >
                      <span>See Summary & Book Call</span>
                      <svg className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* End of Conversation Email Card */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">End of Conversation Email Card</h2>
          <p className="text-sm text-gray-500 mb-4">Appears after conversation completes if email wasn't captured mid-chat.</p>

          <div className="bg-gradient-page rounded-2xl p-6 border border-gray-100">
            <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto flex flex-col gap-6">
              <EndOfConversationEmailCard
                onSubmit={async (email) => {
                  await new Promise(r => setTimeout(r, 1000))
                  console.log('End of conversation email:', email)
                }}
                onSkip={() => console.log('Skipped end of conversation email')}
              />
            </div>
          </div>
        </div>

        {/* Email Collector - Default State */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Email Collector - Default</h2>
          <div className="flex flex-col gap-6">
            <EmailCollector
              onSubmit={(email) => console.log('Email submitted:', email)}
            />
          </div>
        </div>

        {/* Email Collector - Submitted State */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Email Collector - Submitted</h2>
          <div className="flex flex-col gap-6">
            <EmailCollector
              onSubmit={(email) => console.log('Email submitted:', email)}
              submitted={true}
              submittedEmail="alex@example.com"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="absolute -bottom-1 right-0 p-1.5 rounded-lg
                 text-gray-300 hover:text-gray-500 hover:bg-gray-100
                 opacity-0 group-hover/msg:opacity-100 transition-all duration-200"
      aria-label="Copy message"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}
