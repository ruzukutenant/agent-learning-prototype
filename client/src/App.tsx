import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Agentation } from 'agentation'
import { initMetaPixel } from './lib/meta-pixel'

// Lazy load all routes for code splitting
const Landing = lazy(() => import('./pages/Landing'))
const NameCollection = lazy(() => import('./pages/NameCollection'))
const Chat = lazy(() => import('./pages/Chat'))
const Assessment = lazy(() => import('./pages/Assessment').then(module => ({ default: module.Assessment })))
const Summary = lazy(() => import('./pages/Summary'))
const Admin = lazy(() => import('./pages/Admin'))
const Funnel = lazy(() => import('./pages/Funnel'))
const PromptEditor = lazy(() => import('./pages/PromptEditor').then(module => ({ default: module.PromptEditor })))
const ComponentPreview = lazy(() => import('./pages/ComponentPreview'))
const ScreenPreview = lazy(() => import('./pages/Preview'))
const SessionDetail = lazy(() => import('./pages/SessionDetail'))
const SplitTests = lazy(() => import('./pages/SplitTests'))
const CreateSplitTest = lazy(() => import('./pages/CreateSplitTest'))
const SignalSession = lazy(() => import('./pages/SignalSession'))
const TimeMachineDashboard = lazy(() => import('./pages/TimeMachineDashboard'))

function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-4">
          CoachMira Advisor collects information you provide during the assessment
          to deliver personalized strategic recommendations.
        </p>
        <p className="text-gray-600 mb-4">
          We store your responses securely and may use them to improve our service.
          We do not sell your personal information to third parties.
        </p>
        <p className="text-gray-600">
          For questions about your data, contact us at advisor@coachmira.com
        </p>
      </div>
    </div>
  )
}

// Loading fallback component
function LoadingPage() {
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

export default function App() {
  useEffect(() => {
    initMetaPixel()
  }, [])

  return (
    <>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/interview" element={<NameCollection />} />
          <Route path="/chat/:sessionId" element={<Chat />} />
          <Route path="/assess/:sessionId" element={<Assessment />} />
          <Route path="/summary/:sessionId" element={<Summary />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/sessions/:sessionId" element={<SessionDetail />} />
          <Route path="/admin/funnel" element={<Funnel />} />
          <Route path="/admin/split-tests" element={<SplitTests />} />
          <Route path="/admin/split-tests/new" element={<CreateSplitTest />} />
          <Route path="/admin/prompt" element={<PromptEditor />} />
          <Route path="/preview" element={<ComponentPreview />} />
          <Route path="/screens" element={<ScreenPreview />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/tm" element={<TimeMachineDashboard />} />
          <Route path="/signal" element={<SignalSession />} />
          <Route path="/signal/:sessionId" element={<SignalSession />} />
        </Routes>
      </Suspense>
      {import.meta.env.DEV && <Agentation />}
    </>
  )
}
