import { useState, useEffect, useRef } from 'react'

interface UseTypingAnimationOptions {
  text: string
  isAnimating: boolean
  durationMs?: number
  onTextChange?: () => void  // Callback when displayed text grows (for scrolling)
}

/**
 * Hook that animates text character-by-character with timing control
 * Returns the current visible substring and whether animation is complete
 */
export function useTypingAnimation({
  text,
  isAnimating,
  durationMs = 2000,
  onTextChange,
}: UseTypingAnimationOptions) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const onTextChangeRef = useRef(onTextChange)

  // Keep ref updated
  useEffect(() => {
    onTextChangeRef.current = onTextChange
  }, [onTextChange])

  useEffect(() => {
    // If not animating, show full text immediately
    if (!isAnimating) {
      setDisplayedText(text)
      setIsComplete(true)
      return
    }

    // Reset state when text changes
    setDisplayedText('')
    setIsComplete(false)

    const textLength = text.length
    if (textLength === 0) {
      setIsComplete(true)
      return
    }

    // Calculate delay per character for smooth animation
    const delayPerChar = durationMs / textLength
    let currentIndex = 0

    const interval = setInterval(() => {
      currentIndex++
      setDisplayedText(text.substring(0, currentIndex))

      // Trigger scroll callback periodically (every 20 chars or on complete)
      if (onTextChangeRef.current && (currentIndex % 20 === 0 || currentIndex >= textLength)) {
        onTextChangeRef.current()
      }

      if (currentIndex >= textLength) {
        clearInterval(interval)
        setIsComplete(true)
      }
    }, delayPerChar)

    return () => clearInterval(interval)
  }, [text, isAnimating, durationMs])

  return {
    displayedText,
    isComplete,
  }
}
