import { api } from './api'

const STORAGE_PREFIX = 'cma_split_'

/**
 * Get or assign a variant for a split test.
 * Persists in localStorage so users always see the same variant.
 * Use ?variant=X URL param to force a variant for previews.
 */
export function getVariant(testName: string, variants: string[]): string {
  if (variants.length === 0) throw new Error('At least one variant required')

  // URL param override (for previews)
  const params = new URLSearchParams(window.location.search)
  const forced = params.get('variant')
  if (forced && variants.includes(forced)) {
    return forced
  }

  // Check localStorage for existing assignment
  const key = `${STORAGE_PREFIX}${testName}`
  const stored = localStorage.getItem(key)
  if (stored && variants.includes(stored)) {
    return stored
  }

  // Randomly assign
  const variant = variants[Math.floor(Math.random() * variants.length)]
  localStorage.setItem(key, variant)
  return variant
}

export interface SplitTestVariant {
  key: string
  headline: string
  subheadline?: string  // Used by landing page tests
  cta?: string
  // Component test fields
  description?: string
  button_text?: string
}

export interface ActiveSplitTest {
  id: string
  test_name: string
  location: string
  variants: SplitTestVariant[]
  winner: string | null
}

let cachedTests: ActiveSplitTest[] | null = null

export async function fetchActiveTests(): Promise<ActiveSplitTest[]> {
  if (cachedTests !== null) return cachedTests
  try {
    const { tests } = await api.getActiveSplitTests()
    cachedTests = tests
    return tests
  } catch {
    return []
  }
}

export interface ComponentVariant {
  testName: string
  variant: string
  headline?: string
  description?: string
  button_text?: string
}

/**
 * Get the active split test variant for a component location.
 * Returns null if no active test targets this component.
 */
export async function getComponentVariant(location: string): Promise<ComponentVariant | null> {
  const tests = await fetchActiveTests()
  const test = tests.find(t => t.location === location)
  if (!test) return null

  // If a winner is set, always return winner variant
  if (test.winner) {
    const winnerVariant = test.variants.find(v => v.key === test.winner)
    if (winnerVariant) {
      return {
        testName: test.test_name,
        variant: winnerVariant.key,
        headline: winnerVariant.headline,
        description: winnerVariant.description,
        button_text: winnerVariant.button_text,
      }
    }
  }

  // Assign variant via getVariant (localStorage-persisted)
  const variantKeys = test.variants.map(v => v.key)
  const assignedKey = getVariant(test.test_name, variantKeys)
  const assignedVariant = test.variants.find(v => v.key === assignedKey)
  if (!assignedVariant) return null

  return {
    testName: test.test_name,
    variant: assignedVariant.key,
    headline: assignedVariant.headline,
    description: assignedVariant.description,
    button_text: assignedVariant.button_text,
  }
}
