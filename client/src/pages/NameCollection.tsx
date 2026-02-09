import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { api } from '../lib/api'
import { sessionStorage } from '../lib/sessionStorage'
import { trackNameCollectionStart } from '../lib/analytics'
import { ExitIntentPopup } from '../components/ui/ExitIntentPopup'

export default function NameCollection() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError('Please enter at least 2 characters')
      return
    }

    setIsLoading(true)

    try {
      const { session } = await api.createSession(trimmedName)
      // Save session ID for resume functionality
      sessionStorage.save(session.id)

      // Track name collection started
      trackNameCollectionStart(session.id)

      navigate(`/chat/${session.id}`)
    } catch (err) {
      console.error('Error creating session:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-page">
      {/* Main Content - Centered */}
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg mx-auto text-center">
          {/* Badge */}
          <Badge className="mb-8">Free • Single session</Badge>

          {/* Headline */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight max-w-md mx-auto">
            Hi, I'm Mira—your strategic advisor
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-md mx-auto leading-relaxed">
            I help coaches identify what's really holding them back. Before we begin, what should I call you?
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              placeholder="First Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={error}
              autoFocus
              disabled={isLoading}
              autoComplete="given-name"
            />

            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating session...
                </span>
              ) : (
                'Start Assessment'
              )}
            </Button>
          </form>
        </div>
      </main>

      <ExitIntentPopup variant="name-collection" />
    </div>
  )
}
