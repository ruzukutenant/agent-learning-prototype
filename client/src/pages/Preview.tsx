import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { ValuePropIcon } from '../components/ui/ValuePropIcon'
import { PhaseHeader } from '../components/chat/PhaseHeader'
import { EndOfConversationEmailCard } from '../components/chat/EndOfConversationEmailCard'
import { Calendar, Wrench } from 'lucide-react'

type Screen = 'landing' | 'name' | 'chat' | 'summary'
type ConstraintType = 'strategy' | 'execution' | 'energy'

const MOCK_DATA = {
  strategy: {
    category: 'strategy' as const,
    summary: "You're great at what you do, but your positioning isn't quite dialed in yet. People get confused about who you help and what makes you different. Until that's clear, every other marketing effort is working harder than it needs to.",
    insights: [
      "I keep changing my niche because nothing feels quite right",
      "People engage with my content but don't convert to clients",
      "I struggle to explain what makes me different"
    ],
    blockers: [
      "Not sure which direction to commit to",
      "Worried about narrowing down too much"
    ]
  },
  execution: {
    category: 'execution' as const,
    summary: "You know exactly what you need to do—the strategy is clear. But you're stuck in the day-to-day, doing everything yourself, and the systems to scale just aren't there yet. You're the bottleneck.",
    insights: [
      "I have too many half-finished projects",
      "I know what to do but can't seem to get it done",
      "I spend more time planning than executing"
    ],
    blockers: [
      "No time to build the systems",
      "Can't afford to hire help yet"
    ]
  },
  energy: {
    category: 'energy' as const,
    summary: "You're running on empty. The business that was supposed to give you freedom is draining you instead. Before we talk strategy or systems, we need to address what's depleting your energy—because nothing else will stick until that's handled.",
    insights: [
      "I dread certain parts of my business",
      "I can't remember when I last felt excited about my work",
      "I'm exhausted even when I'm not busy"
    ],
    blockers: [
      "Feel guilty taking time off",
      "Clients depend on me being available"
    ]
  }
}

const MOCK_MESSAGES = [
  { speaker: 'advisor', text: "Hey Sarah! I'm here to help you figure out what's really going on in your business. So let's start with the basics—what do you do, and who do you help?" },
  { speaker: 'user', text: "I'm a business coach for women entrepreneurs. I help them with mindset and strategy." },
  { speaker: 'advisor', text: "Got it. And how are clients finding you right now? Is it mostly referrals, content, ads, or something else?" },
  { speaker: 'user', text: "Mostly referrals and some from Instagram. I post pretty regularly but it feels like shouting into the void." },
  { speaker: 'advisor', text: "I hear that a lot. So you're getting some traction from referrals, but Instagram isn't really converting. When people do reach out, what usually happens? Do they book calls? Buy?" },
]

export default function Preview() {
  const [activeScreen, setActiveScreen] = useState<Screen>('summary')
  const [constraintType, setConstraintType] = useState<ConstraintType>('strategy')

  const mockData = MOCK_DATA[constraintType]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sticky Control Bar */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Screen:</span>
              <div className="flex gap-1">
                {(['landing', 'name', 'chat', 'summary'] as Screen[]).map((screen) => (
                  <button
                    key={screen}
                    onClick={() => setActiveScreen(screen)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      activeScreen === screen
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {screen.charAt(0).toUpperCase() + screen.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {activeScreen === 'summary' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Constraint:</span>
                <div className="flex gap-1">
                  {(['strategy', 'execution', 'energy'] as ConstraintType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setConstraintType(type)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        constraintType === type
                          ? type === 'strategy' ? 'bg-purple-600 text-white'
                          : type === 'execution' ? 'bg-orange-600 text-white'
                          : 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <a
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back to App
            </a>
          </div>
        </div>
      </div>

      {/* Screen Preview */}
      {activeScreen === 'landing' && <LandingPreview />}
      {activeScreen === 'name' && <NamePreview />}
      {activeScreen === 'chat' && <ChatPreview />}
      {activeScreen === 'summary' && (
        <SummaryPreview
          constraintType={constraintType}
          mockData={mockData}
        />
      )}
    </div>
  )
}

function LandingPreview() {
  return (
    <div className="min-h-screen bg-gradient-page">
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <Badge className="mb-8">Free • Single session</Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
            Discover What's <em className="italic">Really</em>
            <br />
            Holding Your Business Back
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            It's usually not what you think. Through a guided conversation,
            you'll discover the <em>one</em> constraint blocking your growth—and
            build clarity you can actually act on.
          </p>

          <div className="flex items-center justify-center gap-8 md:gap-12 mb-10">
            <ValuePropIcon icon="assessment" label="Guided discovery" />
            <ValuePropIcon icon="clarity" label="Build real clarity" />
            <ValuePropIcon icon="action" label="Know your next step" />
          </div>

          <Button size="lg">
            Find My Next Step
          </Button>
        </div>
      </main>
    </div>
  )
}

function NamePreview() {
  const [name, setName] = useState('Sarah')

  return (
    <div className="min-h-screen bg-gradient-page">
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg mx-auto text-center">
          <Badge className="mb-8">Free • Single session</Badge>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight max-w-md mx-auto">
            Hi, I'm Mira—your strategic advisor
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-md mx-auto leading-relaxed">
            I help coaches identify what's really holding them back. Before we begin, what should I call you?
          </p>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <Input
              placeholder="First Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <Button type="submit" size="lg" className="w-full sm:w-auto">
              Start Assessment
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}

function ChatPreview() {
  const [inputValue, setInputValue] = useState('')

  return (
    <div className="h-screen flex flex-col bg-gradient-page">
      {/* Header */}
      <PhaseHeader
        isComplete={false}
        phase="exploration"
        onSaveProgress={() => {}}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {MOCK_MESSAGES.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[75%] ${msg.speaker === 'user' ? 'self-end' : 'self-start'}`}>
                {msg.speaker === 'advisor' ? (
                  <div className="bg-gray-50/80 backdrop-blur-sm rounded-2xl px-5 py-4 text-gray-800 leading-relaxed">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-2">Mira</span>
                    <p>{msg.text}</p>
                  </div>
                ) : (
                  <div className="bg-violet-50/80 rounded-2xl px-5 py-4 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.08)]">
                    <p className="text-gray-800 leading-relaxed">{msg.text}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* End of Conversation Email Card Preview */}
          <EndOfConversationEmailCard
            onSubmit={async (email) => { console.log('Email submitted:', email) }}
            onSkip={() => { console.log('Skipped') }}
          />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white/80 backdrop-blur-sm px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-purple focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <Button>Send</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Constraint configuration for preview
const constraintConfig: Record<ConstraintType, {
  label: string
  tagline: string
  gradient: string
  bgGradient: string
  textColor: string
}> = {
  strategy: {
    label: 'Strategy Constraint',
    tagline: "Your offer isn't landing with the right people yet",
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/10 via-purple-500/5 to-transparent',
    textColor: 'text-violet-600',
  },
  execution: {
    label: 'Execution Constraint',
    tagline: "You know what to do, but can't get it done",
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    textColor: 'text-amber-600',
  },
  energy: {
    label: 'Energy Constraint',
    tagline: "Your business is draining you instead of fueling you",
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    textColor: 'text-emerald-600',
  }
}

function SummaryPreview({
  constraintType,
  mockData
}: {
  constraintType: ConstraintType
  mockData: {
    category: ConstraintType
    summary: string
    insights: string[]
    blockers: string[]
  }
}) {
  const [emailUnlocked, setEmailUnlocked] = useState(false)
  const config = constraintConfig[constraintType]
  const isMIST = constraintType === 'execution'

  return (
    <div className="min-h-screen bg-gradient-page">
      {/* Hero Section - Above the Fold */}
      <div className={`relative overflow-hidden bg-gradient-to-b ${config.bgGradient} to-transparent`}>
        <div className="max-w-2xl mx-auto px-4 pt-12 pb-8">
          {/* Personalized Greeting */}
          <p className="text-center text-gray-500 text-sm font-medium uppercase tracking-wide mb-2">
            Your Assessment Results
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-8">
            Sarah, here's what's holding you back
          </h1>

          {/* Constraint Card - The Main Event */}
          <div className="group bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden
                          transition-all duration-300 hover:shadow-2xl hover:shadow-gray-300/50">
            {/* Constraint Type Badge */}
            <div className={`relative bg-gradient-to-r ${config.gradient} px-6 py-5`}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
              <p className="relative text-white/90 text-xs font-semibold uppercase tracking-wider mb-1">
                Your Primary Constraint
              </p>
              <h2 className="relative text-2xl md:text-3xl font-bold text-white">
                {config.label}
              </h2>
            </div>

            {/* Summary */}
            <div className="p-6 md:p-8 bg-gradient-to-b from-gray-50/50 to-white">
              <p className={`text-lg font-semibold ${config.textColor} mb-3`}>
                {config.tagline}
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                {mockData.summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - Immediately After Constraint */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-teal-50/60 to-white rounded-3xl p-7 md:p-9 border border-teal-100/80
                        shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(20,184,166,0.08)]
                        hover:border-teal-200/80 hover:shadow-[0_4px_16px_-3px_rgba(20,184,166,0.12),0_8px_24px_-4px_rgba(0,0,0,0.06)]
                        transition-all duration-300">
          {/* Headline */}
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
            {isMIST ? "Ready to Get It Built?" : "Ready to Break Through?"}
          </h3>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed mb-7 text-base md:text-lg tracking-wide">
            {isMIST
              ? "Talk to our implementation team about building the systems you need."
              : "Talk to a strategist who can help you get unstuck and moving forward."
            }
          </p>

          {/* CTA Button - Deep violet, brand-aligned */}
          <button
            className="group w-full px-6 py-4 relative
                     bg-violet-700
                     text-white font-medium rounded-xl
                     transition-all duration-300 ease-out
                     flex items-center justify-center gap-2.5
                     text-base tracking-tight
                     shadow-[0_1px_2px_rgba(109,40,217,0.2),0_4px_12px_rgba(109,40,217,0.15)]
                     hover:bg-violet-600 hover:shadow-[0_1px_2px_rgba(109,40,217,0.25),0_8px_24px_rgba(109,40,217,0.2)]
                     active:bg-violet-800 active:shadow-[0_1px_2px_rgba(109,40,217,0.3)]
                     before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/[0.15] before:to-transparent before:pointer-events-none"
          >
            {isMIST ? <Wrench className="w-[18px] h-[18px] opacity-80" /> : <Calendar className="w-[18px] h-[18px] opacity-80" />}
            <span>{isMIST ? "Book Your Implementation Call" : "Book Your Strategy Session"}</span>
            <svg className="w-4 h-4 opacity-60 transition-all duration-300 group-hover:opacity-80 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          {/* Note */}
          <p className="text-xs text-gray-500/90 text-center mt-5 tracking-wide">
            Free 30-minute call • No obligation
          </p>
        </div>
      </div>

      {/* Email Gate for Details */}
      {!emailUnlocked && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-br from-violet-50/60 to-white rounded-3xl p-7 md:p-9 border border-violet-100/80
                          shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(139,92,246,0.08)]
                          hover:border-violet-200/80 hover:shadow-[0_4px_16px_-3px_rgba(139,92,246,0.12),0_8px_24px_-4px_rgba(0,0,0,0.06)]
                          transition-all duration-300">
            {/* Headline */}
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
              Get Your Personalized Summary
            </h3>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed mb-7 text-base md:text-lg tracking-wide">
              I'll send you a detailed summary of what we discovered, your readiness scores, and personalized next steps to move forward.
            </p>

            {/* Email form - stacked layout */}
            <form onSubmit={(e) => { e.preventDefault(); setEmailUnlocked(true); }} className="space-y-5">
              <div className="relative">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-5 py-4 pr-12 bg-gray-50/50
                           rounded-2xl border border-gray-300/80
                           focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 focus:bg-white
                           text-gray-900 placeholder:text-gray-400/80
                           transition-all duration-200
                           hover:border-gray-400/90 hover:bg-white
                           focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08),0_2px_8px_-2px_rgba(0,0,0,0.1)]
                           text-base md:text-lg tracking-wide"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400/70">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <button
                type="submit"
                className="group w-full px-6 py-4 relative
                         bg-teal-600
                         text-white font-medium rounded-xl
                         transition-all duration-300 ease-out
                         flex items-center justify-center gap-2.5
                         text-base tracking-tight
                         shadow-[0_1px_2px_rgba(13,148,136,0.2),0_4px_12px_rgba(13,148,136,0.15)]
                         hover:bg-teal-500 hover:shadow-[0_1px_2px_rgba(13,148,136,0.25),0_8px_24px_rgba(13,148,136,0.2)]
                         active:bg-teal-700 active:shadow-[0_1px_2px_rgba(13,148,136,0.3)]
                         before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/[0.15] before:to-transparent before:pointer-events-none"
              >
                <span>Send My Summary</span>
                <svg className="w-4 h-4 opacity-60 transition-all duration-300 group-hover:opacity-80 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              {/* Privacy note */}
              <p className="text-xs text-gray-500/90 text-center flex items-center justify-center gap-2 tracking-wide">
                <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Your email is safe. We respect your privacy.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Details Section - Only shown after email captured */}
      {emailUnlocked && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-center mb-6">
            <p className="font-medium text-emerald-800">
              ✓ Report sent to your email
            </p>
          </div>

          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Key Realizations */}
            <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm shadow-gray-100
                            transition-all duration-300 hover:shadow-md hover:shadow-amber-100/50 hover:border-amber-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">Key Realizations</h4>
              </div>
              <ul className="space-y-3">
                {mockData.insights.map((insight, i) => (
                  <li key={i} className="text-gray-600 pl-4 border-l-2 border-amber-300 bg-amber-50/30 py-2 pr-3 rounded-r-lg">
                    "{insight}"
                  </li>
                ))}
              </ul>
            </div>

            {/* Blockers */}
            <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm shadow-gray-100
                            transition-all duration-300 hover:shadow-md hover:shadow-rose-100/50 hover:border-rose-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">Things to Address</h4>
              </div>
              <ul className="space-y-2">
                {mockData.blockers.map((blocker, i) => (
                  <li key={i} className="text-gray-600 flex items-start gap-3 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>

            {/* Readiness Scores */}
            <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm shadow-gray-100
                            transition-all duration-300 hover:shadow-md hover:shadow-indigo-100/50 hover:border-indigo-200/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900">Your Readiness Profile</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-xl bg-gradient-to-b from-gray-50 to-white border border-gray-100">
                  <div className="text-3xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">7</div>
                  <div className="text-sm text-gray-500 mt-1">Clarity</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-b from-gray-50 to-white border border-gray-100">
                  <div className="text-3xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">5</div>
                  <div className="text-sm text-gray-500 mt-1">Confidence</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-b from-gray-50 to-white border border-gray-100">
                  <div className="text-3xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">4</div>
                  <div className="text-sm text-gray-500 mt-1">Capacity</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer spacing */}
      <div className="h-8" />
    </div>
  )
}
