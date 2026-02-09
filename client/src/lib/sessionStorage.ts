const SESSION_STORAGE_KEY = 'coachmira_session_id'

export const sessionStorage = {
  // Save current session ID
  save: (sessionId: string) => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  },

  // Get saved session ID
  get: (): string | null => {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to get session:', error)
      return null
    }
  },

  // Clear saved session
  clear: () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  },

  // Check if there's an active session
  hasSession: (): boolean => {
    return sessionStorage.get() !== null
  }
}
