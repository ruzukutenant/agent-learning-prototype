import { useState, useEffect } from 'react'
import { Button } from '../components/ui/Button'

export function PromptEditor() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadPrompt()
  }, [])

  const loadPrompt = async () => {
    try {
      const response = await fetch('/api/prompt')
      const data = await response.json()
      setPrompt(data.prompt)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load prompt' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('http://localhost:3001/api/prompt', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      setMessage({ type: 'success', text: 'Prompt saved successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save prompt' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="text-gray-600">Loading prompt...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-page py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Prompt Editor</h1>
          <p className="text-gray-600">
            Edit the system prompt that CoachMira uses for conversations.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            System Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-teal focus:border-transparent resize-vertical font-mono text-sm"
            placeholder="Enter system prompt..."
          />
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={saving || !prompt.trim()}>
            {saving ? 'Saving...' : 'Save Prompt'}
          </Button>
          <Button variant="outline" onClick={loadPrompt} disabled={saving}>
            Reset
          </Button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Changes take effect immediately for new conversations</li>
            <li>• The prompt will be saved to data/system-prompt.txt</li>
            <li>• Session context is automatically appended to the base prompt</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
