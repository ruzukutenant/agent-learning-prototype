import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { SIGNAL_PHASE_LABELS } from '../types';

const modules = [
  {
    number: 1,
    title: 'Signal Session',
    subtitle: 'Outlining Content That Feels Alive',
    description: 'Clarify one live idea, find its natural structure, and create a creative brief that makes drafting feel easy.',
    time: '10-15 min',
    deliverable: 'Creative Brief',
    status: 'available' as const,
    path: '/signal',
  },
  {
    number: 2,
    title: 'Draft Engine',
    subtitle: 'From Brief to First Draft',
    description: 'Turn your creative brief into a full first draft with AI-assisted writing that keeps your voice intact.',
    time: '15-20 min',
    deliverable: 'First Draft',
    status: 'coming_soon' as const,
    path: null,
  },
  {
    number: 3,
    title: 'Lead Magnet Lab',
    subtitle: 'Build Something People Actually Want',
    description: 'Design a lead magnet that solves a real problem for your audience and positions your expertise.',
    time: '15-20 min',
    deliverable: 'Lead Magnet Outline',
    status: 'coming_soon' as const,
    path: null,
  },
  {
    number: 4,
    title: 'Audience Mirror',
    subtitle: 'See Your Market Clearly',
    description: 'Map your ideal audience, understand their real struggles, and find the language that resonates.',
    time: '10-15 min',
    deliverable: 'Audience Profile',
    status: 'coming_soon' as const,
    path: null,
  },
];

interface SessionSummary {
  sessionId: string;
  phase: string;
  turn: number;
  hasBrief: boolean;
  complete: boolean;
  createdAt: string;
  updatedAt: string;
  briefTitle: string | null;
  preview: string | null;
}

export default function TimeMachineDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    api.listSignalSessions()
      .then(data => setSessions(data.sessions))
      .catch(() => {}) // Silently fail — sessions just won't show
      .finally(() => setLoadingSessions(false));
  }, []);

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-peach via-white to-brand-lavender">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <span className="text-xs font-semibold text-brand-purple uppercase tracking-wide">
            AI Time Machine
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Your AI Agents
          </h1>
          <p className="text-gray-500 text-sm mt-2 max-w-xl">
            Each module is a focused AI-assisted exercise that produces a concrete deliverable
            for your business. Work through them at your own pace.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Recent Sessions */}
        {!loadingSessions && sessions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Sessions</h2>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => navigate(`/signal/${session.sessionId}`)}
                  className="bg-white rounded-xl border border-gray-100 hover:border-brand-purple/30 hover:shadow-md p-4 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      session.complete
                        ? 'bg-brand-teal/10'
                        : 'bg-brand-purple/10'
                    }`}>
                      {session.complete ? (
                        <svg className="w-5 h-5 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {session.complete && session.briefTitle
                            ? session.briefTitle
                            : 'Signal Session'}
                        </p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                          session.complete
                            ? 'bg-brand-teal/10 text-brand-teal'
                            : 'bg-yellow-50 text-yellow-600'
                        }`}>
                          {session.complete ? 'Complete' : SIGNAL_PHASE_LABELS[session.phase as keyof typeof SIGNAL_PHASE_LABELS] || session.phase}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>Turn {session.turn}</span>
                        <span>{formatTimeAgo(session.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Modules */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Modules</h2>
          <div className="space-y-4">
            {modules.map((mod) => (
              <div
                key={mod.number}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  mod.status === 'available'
                    ? 'border-brand-purple/20 hover:border-brand-purple/40 hover:shadow-md cursor-pointer'
                    : 'border-gray-100 opacity-75'
                }`}
                onClick={() => mod.path && navigate(mod.path)}
              >
                <div className="p-6">
                  <div className="flex items-start gap-5">
                    {/* Module number */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        mod.status === 'available'
                          ? 'bg-brand-purple text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <span className="text-lg font-bold">{mod.number}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-gray-900">{mod.title}</h2>
                        {mod.status === 'available' ? (
                          <span className="px-2 py-0.5 bg-brand-teal/10 text-brand-teal text-xs font-medium rounded-full">
                            Available
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-brand-purple font-medium mt-0.5">{mod.subtitle}</p>
                      <p className="text-sm text-gray-500 mt-2">{mod.description}</p>

                      {/* Meta */}
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {mod.time}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {mod.deliverable}
                        </span>
                      </div>
                    </div>

                    {/* Arrow for available modules */}
                    {mod.status === 'available' && (
                      <div className="flex-shrink-0 self-center">
                        <svg className="w-5 h-5 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
