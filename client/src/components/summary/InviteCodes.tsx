import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

interface InviteCodesProps {
  sessionId: string
}

export function InviteCodes({ sessionId }: InviteCodesProps) {
  const [codes, setCodes] = useState<string[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { codes } = await api.generateInviteCodes(sessionId)
        setCodes(codes)
      } catch (err) {
        console.error('Failed to generate invite codes:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [sessionId])

  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = code
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  const shareCode = async (code: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CoachMira Assessment Invite',
          text: `I just discovered what's really holding my business back. Try this free assessment — use my invite code: ${code}`,
          url: `https://advisor.coachmira.ai/?ref=${code}`,
        })
      } catch {
        // User cancelled share
      }
    }
  }

  if (isLoading) return null
  if (codes.length === 0) return null

  return (
    <div className="bg-gradient-to-br from-purple-50/60 to-white rounded-2xl border border-purple-100/80 overflow-hidden
                    shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(147,51,234,0.08)]">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600
                          flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">
              Share the clarity
            </h4>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Know someone who could use this? Share an invite code — they'll get the same free assessment you just took.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-2">
        {codes.map((code, i) => (
          <div key={code} className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-purple-100 font-mono text-base tracking-wider text-gray-900 text-center">
              {code}
            </div>
            <button
              onClick={() => copyCode(code, i)}
              className="px-3 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl
                         transition-all duration-200 flex-shrink-0"
            >
              {copiedIndex === i ? 'Copied!' : 'Copy'}
            </button>
            {typeof navigator.share === 'function' && (
              <button
                onClick={() => shareCode(code)}
                className="p-2.5 text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200 flex-shrink-0"
                title="Share"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
