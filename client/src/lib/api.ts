import type { Session, CreateSessionResponse, MessageAttachment, SignalSessionMessage, SignalPhase, CreativeBrief } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { headers, ...restOptions } = options
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

export const api = {
  // Sessions
  createSession: (userName: string) =>
    fetchAPI<CreateSessionResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ userName }),
    }),

  getSession: (sessionId: string) =>
    fetchAPI<{ session: Session }>(`/sessions/${sessionId}`),

  updateSession: (sessionId: string, updates: Partial<Session>) =>
    fetchAPI<{ session: Session }>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // Chat - Routes to server with orchestrator
  sendMessage: (sessionId: string, message: string, wasVoice: boolean = false, attachments?: MessageAttachment[], metaCookies?: { fbp?: string; fbc?: string }) =>
    fetchAPI<{ session: Session; userMessage?: any; advisorMessage?: any; complete: boolean; state: any; components?: { message: string; components: Array<{ type: string }> } }>(
      `/chat/${sessionId}/message`,
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          wasVoice,
          attachments,
          useOrchestrator: true,  // Use new orchestrator system
          meta_fbp: metaCookies?.fbp,
          meta_fbc: metaCookies?.fbc,
        }),
      }
    ),

  // Voice cleanup - separate fast call (~1-2s) to clean transcription before sending to AI
  cleanupVoice: (text: string) =>
    fetchAPI<{ cleanedText: string }>('/chat/cleanup-voice', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  getMessages: (sessionId: string) =>
    fetchAPI<{ messages: any[] }>(`/chat/${sessionId}/messages`),

  // Email
  sendSummaryEmail: (sessionId: string) =>
    fetchAPI<{ success: boolean }>('/email/send-summary', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  sendResumeEmail: (sessionId: string) =>
    fetchAPI<{ success: boolean }>('/email/send-resume', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  // Invite codes
  generateInviteCodes: (sessionId: string) =>
    fetchAPI<{ codes: string[] }>('/invite/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  validateInviteCode: (code: string) =>
    fetchAPI<{ valid: boolean; reason?: string; code?: string }>(`/invite/validate/${code}`),

  redeemInviteCode: (code: string, email?: string) =>
    fetchAPI<{ success: boolean }>('/invite/redeem', {
      method: 'POST',
      body: JSON.stringify({ code, email }),
    }),

  // Webhook
  sendNurtureWebhook: (sessionId: string) =>
    fetchAPI<{ success: boolean }>('/webhook/nurture', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  // Admin
  adminLogin: (password: string) =>
    fetchAPI<{ success: boolean }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  getAdminSessions: (password: string, page: number = 1, limit: number = 75, filter: string = 'all', search: string = '', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), filter, search })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    return fetchAPI<{ sessions: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/admin/sessions?${params.toString()}`,
      { headers: { 'x-admin-password': password } }
    )
  },

  getAdminStats: (password: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return fetchAPI<{ stats: any }>(`/admin/stats${qs}`, {
      headers: { 'x-admin-password': password },
    })
  },

  getAdminSessionDetail: (sessionId: string, password: string) =>
    fetchAPI<{ session: any; messages: any[] }>(`/admin/sessions/${sessionId}`, {
      headers: { 'x-admin-password': password },
    }),

  getSplitTestResults: (password: string) =>
    fetchAPI<{ tests: any[]; testConfigs: any[] }>('/admin/split-tests', {
      headers: { 'x-admin-password': password },
    }),

  createSplitTest: (password: string, data: { testName: string; location: string; variants: any[] }) =>
    fetchAPI<{ test: any }>('/admin/split-tests', {
      method: 'POST',
      headers: { 'x-admin-password': password },
      body: JSON.stringify(data),
    }),

  endSplitTest: (password: string, id: string, winner?: string) =>
    fetchAPI<{ test: any }>(`/admin/split-tests/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-password': password },
      body: JSON.stringify({ winner }),
    }),

  getActiveSplitTests: () =>
    fetchAPI<{ tests: any[] }>('/split-tests/active'),

  exportAdminCSV: async (password: string) => {
    const response = await fetch(`${API_BASE}/admin/export`, {
      headers: { 'x-admin-password': password },
    })
    if (!response.ok) throw new Error('Export failed')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `advisor-sessions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  },

  // ============================================
  // Signal Session API
  // ============================================

  listSignalSessions: () =>
    fetchAPI<{
      sessions: {
        sessionId: string;
        phase: SignalPhase;
        turn: number;
        hasBrief: boolean;
        complete: boolean;
        createdAt: string;
        updatedAt: string;
        briefTitle: string | null;
        preview: string | null;
      }[];
    }>('/signal-session/sessions'),

  startSignalSession: () =>
    fetchAPI<{
      sessionId: string;
      message: string;
      phase: SignalPhase;
      turnCount: number;
    }>('/signal-session/start', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  sendSignalMessage: (sessionId: string, message: string) =>
    fetchAPI<{
      message: string;
      phase: SignalPhase;
      turnCount: number;
      complete: boolean;
      brief?: CreativeBrief;
      decision: { action: string; reasoning: string };
    }>(`/signal-session/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  getSignalSession: (sessionId: string) =>
    fetchAPI<{
      sessionId: string;
      phase: SignalPhase;
      turn: number;
      hasInsight: boolean;
      hasArc: boolean;
      hasBrief: boolean;
      messageCount: number;
    }>(`/signal-session/${sessionId}`),

  getSignalMessages: (sessionId: string) =>
    fetchAPI<{ messages: SignalSessionMessage[] }>(`/signal-session/${sessionId}/messages`),

  getSignalBrief: (sessionId: string, format?: 'json' | 'markdown') => {
    const query = format ? `?format=${format}` : '';
    return fetchAPI<{ brief: CreativeBrief }>(`/signal-session/${sessionId}/brief${query}`);
  },

  exportSignalBriefMarkdown: async (sessionId: string) => {
    const response = await fetch(`${API_BASE}/signal-session/${sessionId}/brief?format=markdown`);
    if (!response.ok) throw new Error('Export failed');
    return response.text();
  },
}
