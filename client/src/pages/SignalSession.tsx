import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { SignalPhaseIndicator } from '../components/signal/SignalPhaseIndicator';
import { CreativeBriefCard } from '../components/signal/CreativeBriefCard';
import type { SignalPhase, SignalSessionMessage, CreativeBrief } from '../types';

export default function SignalSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // State
  const [messages, setMessages] = useState<SignalSessionMessage[]>([]);
  const [phase, setPhase] = useState<SignalPhase>('thread_opening');
  const [turnCount, setTurnCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [complete, setComplete] = useState(false);
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize session
  useEffect(() => {
    async function init() {
      if (sessionId) {
        // Existing session - load messages
        try {
          const [sessionData, messagesData] = await Promise.all([
            api.getSignalSession(sessionId),
            api.getSignalMessages(sessionId),
          ]);
          setPhase(sessionData.phase);
          setTurnCount(sessionData.turn);
          setMessages(messagesData.messages);
          setComplete(sessionData.phase === 'complete');
          if (sessionData.hasBrief) {
            const briefData = await api.getSignalBrief(sessionId);
            setBrief(briefData.brief);
          }
        } catch (err) {
          console.error('Failed to load session:', err);
          setError('Failed to load session');
        }
      } else {
        // New session - start fresh
        try {
          const result = await api.startSignalSession();
          navigate(`/signal/${result.sessionId}`, { replace: true });
          setMessages([{
            role: 'assistant',
            content: result.message,
            turnNumber: 1,
            timestamp: new Date().toISOString(),
          }]);
          setPhase(result.phase);
          setTurnCount(result.turnCount);
        } catch (err) {
          console.error('Failed to start session:', err);
          setError('Failed to start session');
        }
      }
      setIsInitializing(false);
    }
    init();
  }, [sessionId, navigate]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !sessionId) return;

    const userMessage: SignalSessionMessage = {
      role: 'user',
      content: inputValue.trim(),
      turnNumber: messages.length + 1,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const result = await api.sendSignalMessage(sessionId, userMessage.content);

      const assistantMessage: SignalSessionMessage = {
        role: 'assistant',
        content: result.message,
        turnNumber: messages.length + 2,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setPhase(result.phase);
      setTurnCount(result.turnCount);
      setComplete(result.complete);

      if (result.brief) {
        setBrief(result.brief);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Export brief as markdown
  const handleExportMarkdown = async () => {
    if (!sessionId) return;
    try {
      const markdown = await api.exportSignalBriefMarkdown(sessionId);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `creative-brief-${sessionId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Start new session
  const handleStartNew = () => {
    navigate('/signal');
    window.location.reload();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-peach via-white to-brand-lavender flex items-center justify-center">
        <div className="animate-pulse text-brand-purple font-medium">
          Starting Signal Session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-peach via-white to-brand-lavender">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <button
                onClick={() => navigate('/tm')}
                className="text-xs text-gray-400 font-medium hover:text-brand-purple transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                AI Time Machine
              </button>
              <h1 className="text-lg font-bold text-gray-900">Module 1: Signal Session</h1>
            </div>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Turn {turnCount}</span>
          </div>
          <SignalPhaseIndicator currentPhase={phase} />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Welcome Context Card - shows at start of session */}
        {messages.length <= 1 && !complete && (
          <div className="mb-6 bg-gradient-to-r from-brand-teal/5 to-brand-purple/5 rounded-2xl border border-brand-purple/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-purple text-lg">✦</span>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-brand-purple uppercase tracking-wide">
                    AI Time Machine • Module 1
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-1">
                    Signal Session: Outlining Content That Feels Alive
                  </h2>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  This is a <strong>design-before-writing</strong> conversation. We'll work together to clarify
                  one live idea, find its natural structure, and create an outline that makes drafting feel
                  easy and obvious.
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    10-15 minutes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Deliverable: Creative Brief
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    No polished idea needed
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4 mb-6">
          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-purple text-sm font-medium">S</span>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Creative Brief */}
        {brief && (
          <div className="mb-6">
            <CreativeBriefCard
              brief={brief}
              onExportMarkdown={handleExportMarkdown}
            />
          </div>
        )}

        {/* Complete state */}
        {complete && (
          <div className="space-y-6 pb-8">
            {/* Success banner */}
            <div className="bg-gradient-to-r from-brand-teal/5 to-brand-purple/5 rounded-2xl border border-brand-teal/20 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-teal/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Module 1 Complete</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    You've clarified your idea and built a creative brief. This is your blueprint for drafting —
                    everything you need to write with clarity and direction.
                  </p>
                </div>
              </div>
            </div>

            {/* What you accomplished */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">What You Built</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Core Insight</p>
                    <p className="text-xs text-gray-500 mt-0.5">The idea at the heart of your piece</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Narrative Arc</p>
                    <p className="text-xs text-gray-500 mt-0.5">A clear path from tension to resolution</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Reader Profile</p>
                    <p className="text-xs text-gray-500 mt-0.5">Who this is for and what they need</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next steps */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Suggested Next Steps</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="w-6 h-6 rounded-full bg-brand-purple text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Save your creative brief</p>
                    <p className="text-xs text-gray-500 mt-0.5">Copy or export it so you have it when you're ready to write.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="w-6 h-6 rounded-full bg-brand-purple text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Use it as your drafting guide</p>
                    <p className="text-xs text-gray-500 mt-0.5">When you sit down to write, open the brief. It tells you where to start, what to say, and how to structure the piece.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <span className="w-6 h-6 rounded-full bg-gray-300 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Continue to Module 2</p>
                    <p className="text-xs text-gray-500 mt-0.5">In the next module, you'll turn this brief into a full draft with AI assistance. <span className="text-brand-purple font-medium">Coming soon.</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/tm')}
                className="px-6 py-2.5 bg-brand-purple text-white rounded-full font-medium hover:bg-brand-purple/90 transition-colors"
              >
                Back to Modules
              </button>
              <button
                onClick={handleStartNew}
                className="px-6 py-2.5 bg-white text-gray-700 rounded-full font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Start a New Signal Session
              </button>
              <button
                onClick={handleExportMarkdown}
                className="px-6 py-2.5 bg-white text-gray-700 rounded-full font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Export Brief
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Input area */}
      {!complete && (
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Share your thoughts..."
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-3 bg-brand-purple text-white rounded-2xl font-medium hover:bg-brand-purple/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: SignalSessionMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-gray-100' : 'bg-brand-purple/10'
        }`}
      >
        <span className={`text-sm font-medium ${isUser ? 'text-gray-600' : 'text-brand-purple'}`}>
          {isUser ? 'Y' : 'S'}
        </span>
      </div>

      {/* Message */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-brand-purple text-white rounded-tr-sm'
            : 'bg-white text-gray-900 rounded-tl-sm'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}
