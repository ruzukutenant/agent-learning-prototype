import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, MessageSquare, FileCheck, Mail, Eye, FlaskConical, Info } from 'lucide-react'
import { api } from '../lib/api'

// --- Types ---

interface VariantState {
  headline: string
  subheadline: string
  cta: string
  description: string
  button_text: string
}

const emptyVariant: VariantState = { headline: '', subheadline: '', cta: '', description: '', button_text: '' }

// --- Location metadata ---

interface LocationOption {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  defaults: { headline: string; description: string; button_text: string }
}

const LOCATIONS: LocationOption[] = [
  {
    key: 'landing',
    label: 'Landing Page',
    description: 'Test the headline, subheadline, and CTA button that visitors see first. Optimize how many people start a conversation.',
    icon: <Globe className="w-6 h-6" />,
    defaults: { headline: '', description: '', button_text: '' },
  },
  {
    key: 'component:email_capture',
    label: 'Email Capture',
    description: 'Appears mid-conversation (around turn 10) to encourage users to save their progress. Shows an email input with a save button.',
    icon: <MessageSquare className="w-6 h-6" />,
    defaults: {
      headline: "Don't let these insights slip away...",
      description: "Save your progress now so you don't lose any key insights. And once we're done, you'll get a personalized report with your key breakthroughs and next steps.",
      button_text: 'Save',
    },
  },
  {
    key: 'component:handoff_card',
    label: 'Summary Card',
    description: 'Appears at the end of the conversation as the final CTA. If the user hasn\'t provided email, it shows an email input. Otherwise a direct "See Summary" button.',
    icon: <FileCheck className="w-6 h-6" />,
    defaults: {
      headline: 'Your Personalized Summary Is Ready',
      description: 'Enter your email to get your full summary with key insights, recommended next steps, and a link to book your free consultation.',
      button_text: 'See My Summary',
    },
  },
  {
    key: 'component:eoc_email',
    label: 'End-of-Chat Email',
    description: 'Appears after the conversation ends if the user hasn\'t provided their email yet. Last chance to capture their email before they leave.',
    icon: <Mail className="w-6 h-6" />,
    defaults: {
      headline: 'Get insights to move your business forward',
      description: "Enter your email and we'll send detailed insights straight to your inbox — including your essential insights and recommended next steps.",
      button_text: 'Send Report',
    },
  },
]

// --- Preview components ---

function LandingPreview({ headline, subheadline, cta, label }: { headline: string; subheadline: string; cta: string; label: string }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-white">
      <div className="bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-200 flex items-center gap-1.5">
        <Eye className="w-3 h-3" />
        {label}
      </div>
      <div className="px-5 py-6 text-center space-y-3">
        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/80 border border-gray-200 text-[10px] font-medium text-gray-500">
          Free · Single session
        </div>
        <h3
          className="text-base font-bold text-gray-900 leading-snug"
          dangerouslySetInnerHTML={{ __html: headline || '<span class="text-gray-300">Headline...</span>' }}
        />
        <p
          className="text-xs text-gray-500 leading-relaxed max-w-[240px] mx-auto"
          dangerouslySetInnerHTML={{ __html: subheadline || '<span class="text-gray-300">Subheadline...</span>' }}
        />
        <div>
          <span className="inline-block px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-teal-500 to-purple-500 shadow-sm">
            {cta || 'Find My Next Step'}
          </span>
        </div>
      </div>
    </div>
  )
}

function ComponentPreview({ headline, description, buttonText, label, location }: {
  headline: string; description: string; buttonText: string; label: string; location: LocationOption
}) {
  const isHandoff = location.key === 'component:handoff_card'

  const icon = isHandoff ? (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gradient-to-br from-teal-50/60 to-white">
      <div className="bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-200 flex items-center gap-1.5">
        <Eye className="w-3 h-3" />
        {label}
      </div>
      <div className="px-5 py-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            {icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 leading-snug">
              {headline || <span className="text-gray-300">{location.defaults.headline}</span>}
            </h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {description || <span className="text-gray-300">{location.defaults.description}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 bg-white rounded-lg border border-teal-200" />
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold text-white bg-teal-600">
            {buttonText || location.defaults.button_text}
          </span>
        </div>
        {isHandoff && (
          <p className="text-[10px] text-gray-400 text-center">Skip — view summary without email</p>
        )}
      </div>
    </div>
  )
}

// --- Main component ---

export default function CreateSplitTest() {
  const navigate = useNavigate()
  const password = localStorage.getItem('admin_password') || ''

  // Step 1: location selection, Step 2: variant editor
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null)

  // Step 2 state
  const [testName, setTestName] = useState('')
  const [varA, setVarA] = useState<VariantState>({ ...emptyVariant })
  const [varB, setVarB] = useState<VariantState>({ ...emptyVariant })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const isComponentTest = selectedLocation ? selectedLocation.key !== 'landing' : false

  const handleSelectLocation = (loc: LocationOption) => {
    setSelectedLocation(loc)
    // Pre-fill Variant A (Control) with current production defaults
    if (loc.key === 'landing') {
      // Landing page: use current live headline/subheadline/CTA
      setVarA({
        ...emptyVariant,
        headline: 'Discover What\'s <em class="italic">Really</em><br />Holding Your Business Back',
        subheadline: 'It\'s usually not what you think. Through a guided conversation, you\'ll discover the <em>one</em> constraint blocking your growth—and build clarity you can actually act on.',
        cta: 'Find My Next Step',
      })
    } else if (loc.defaults.headline) {
      // Component tests: use defined defaults
      setVarA({ ...emptyVariant, headline: loc.defaults.headline, description: loc.defaults.description, button_text: loc.defaults.button_text })
    } else {
      setVarA({ ...emptyVariant })
    }
    setVarB({ ...emptyVariant })
    setStep(2)
  }

  const handleCreate = async () => {
    if (!testName.trim() || !selectedLocation) {
      setError('Please enter a test name.')
      return
    }

    const variants = isComponentTest
      ? [
          { key: 'A', headline: varA.headline, description: varA.description, button_text: varA.button_text },
          { key: 'B', headline: varB.headline, description: varB.description, button_text: varB.button_text },
        ]
      : [
          { key: 'A', headline: varA.headline, subheadline: varA.subheadline, cta: varA.cta || 'Find My Next Step' },
          { key: 'B', headline: varB.headline, subheadline: varB.subheadline, cta: varB.cta || 'Find My Next Step' },
        ]

    setCreating(true)
    setError('')
    try {
      await api.createSplitTest(password, {
        testName: testName.trim(),
        location: selectedLocation.key,
        variants,
      })
      navigate('/admin/split-tests')
    } catch (err: any) {
      setError(err?.message || 'Failed to create test')
    } finally {
      setCreating(false)
    }
  }

  // --- Step 1: Choose test type ---
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-page py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button onClick={() => navigate('/admin/split-tests')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                       bg-white border border-gray-200 rounded-lg
                       hover:bg-gray-50 hover:border-gray-300
                       transition-all duration-150 mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Tests
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Create A/B Test</h1>
            <p className="text-sm text-gray-500">Choose what you want to test. Each option targets a different part of the user journey.</p>
          </div>

          {/* Location cards */}
          <div className="space-y-4">
            {LOCATIONS.map(loc => (
              <button
                key={loc.key}
                onClick={() => handleSelectLocation(loc)}
                className="w-full text-left bg-white rounded-2xl border border-gray-200 p-6
                         hover:border-gray-300 hover:shadow-sm transition-all duration-150 group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                    {loc.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{loc.label}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{loc.description}</p>
                    {loc.key === 'landing' && (
                      <p className="text-xs text-gray-400 mt-2">Fields: Headline, Subheadline, Button Text</p>
                    )}
                    {loc.key !== 'landing' && (
                      <p className="text-xs text-gray-400 mt-2">Fields: Headline, Description, Button Text</p>
                    )}
                  </div>
                  <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 mt-1 group-hover:text-gray-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- Step 2: Define variants ---
  return (
    <div className="min-h-screen bg-gradient-page py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => setStep(1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                     bg-white border border-gray-200 rounded-lg
                     hover:bg-gray-50 hover:border-gray-300
                     transition-all duration-150 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Change Test Type
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            New {selectedLocation!.label} Test
          </h1>
          <p className="text-sm text-gray-500">Define two variants to compare. Traffic will be split 50/50 automatically.</p>
        </div>

        <div className="space-y-6">
          {/* Test name */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
            <input
              value={testName}
              onChange={e => setTestName(e.target.value)}
              placeholder="e.g. Urgency-Focused Headline"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm
                       focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal outline-none"
            />
            <p className="text-xs text-gray-400 mt-1.5">A descriptive name so your team can identify this test later</p>
          </div>

          {/* Context box */}
          <div className="flex items-start gap-3 bg-white rounded-xl border border-gray-200 px-5 py-4">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-500 leading-relaxed">{selectedLocation!.description}</p>
          </div>

          {/* Variant editors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Variant A (Control)', color: 'blue' as const, state: varA, setter: setVarA },
              { label: 'Variant B (Challenger)', color: 'purple' as const, state: varB, setter: setVarB },
            ].map(({ label, color, state, setter }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <div className={`flex items-center gap-2 text-sm font-semibold ${color === 'blue' ? 'text-blue-700' : 'text-purple-700'}`}>
                  <FlaskConical className="w-4 h-4" />
                  {label}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Headline</label>
                  <textarea
                    value={state.headline}
                    onChange={e => setter({ ...state, headline: e.target.value })}
                    rows={2}
                    placeholder={isComponentTest ? 'e.g. Save your insights before they fade' : "e.g. Discover What's Really Holding Your Business Back"}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal outline-none resize-none"
                  />
                  {!isComponentTest && <p className="text-[11px] text-gray-400 mt-0.5">HTML supported: &lt;em&gt;, &lt;br/&gt;, etc.</p>}
                </div>

                {isComponentTest ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <textarea
                        value={state.description}
                        onChange={e => setter({ ...state, description: e.target.value })}
                        rows={2}
                        placeholder="e.g. Enter your email to receive a personalized report..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Button Text</label>
                      <input
                        value={state.button_text}
                        onChange={e => setter({ ...state, button_text: e.target.value })}
                        placeholder="e.g. Save"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Subheadline</label>
                      <textarea
                        value={state.subheadline}
                        onChange={e => setter({ ...state, subheadline: e.target.value })}
                        rows={2}
                        placeholder="e.g. Through a guided conversation, you'll discover the one constraint..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Button Text</label>
                      <input
                        value={state.cta}
                        onChange={e => setter({ ...state, cta: e.target.value })}
                        placeholder="Find My Next Step"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Live preview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
              <Eye className="w-4 h-4" /> Live Preview
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isComponentTest ? (
                <>
                  <ComponentPreview label="Variant A" headline={varA.headline} description={varA.description} buttonText={varA.button_text} location={selectedLocation!} />
                  <ComponentPreview label="Variant B" headline={varB.headline} description={varB.description} buttonText={varB.button_text} location={selectedLocation!} />
                </>
              ) : (
                <>
                  <LandingPreview label="Variant A" headline={varA.headline} subheadline={varA.subheadline} cta={varA.cta} />
                  <LandingPreview label="Variant B" headline={varB.headline} subheadline={varB.subheadline} cta={varB.cta} />
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Traffic will be split 50/50 between variants</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin/split-tests')}
                className="px-4 py-2.5 text-sm text-gray-600 hover:bg-white hover:border-gray-300 border border-transparent rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-6 py-2.5 text-sm bg-brand-teal text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
              >
                {creating ? 'Starting Test...' : 'Start Test'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
