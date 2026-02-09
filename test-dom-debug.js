/**
 * Debug script to see what's in the DOM
 */

const { browserSync } = require('vibium')

function sleep(ms) {
  const start = Date.now()
  while (Date.now() - start < ms) {}
}

const vibe = browserSync.launch({ headless: false })

try {
  // Navigate and set up
  vibe.go('http://localhost:5173/interview')
  sleep(2000)

  const nameInput = vibe.find('input[placeholder="First Name"]')
  nameInput.type('Test User')
  sleep(500)

  const submitButton = vibe.find('button[type="submit"]')
  submitButton.click()
  sleep(5000) // Wait for chat to load

  console.log('\n=== DOM DEBUG ===\n')

  // Check URL
  const url = vibe.evaluate('window.location.href')
  console.log('URL:', url)

  // Check for self-start elements
  const selfStartCount = vibe.evaluate('document.querySelectorAll(".self-start").length')
  console.log('Elements with .self-start:', selfStartCount)

  // Check for max-w elements (parent divs)
  const maxWCount = vibe.evaluate('document.querySelectorAll("[class*=\\"max-w-\\"]").length')
  console.log('Elements with max-w:', maxWCount)

  // Get all classes on page
  const allClasses = vibe.evaluate('Array.from(new Set(Array.from(document.querySelectorAll("*")).flatMap(el => Array.from(el.classList)))).sort().join(", ")')
  console.log('\nAll CSS classes found:', allClasses.substring(0, 500))

  // Try to get message text directly
  const bodyText = vibe.evaluate('document.body.textContent')
  console.log('\nBody text (first 200 chars):', bodyText.substring(0, 200))

  // Try different selectors
  const divs = vibe.evaluate('document.querySelectorAll("div").length')
  console.log('\nTotal divs:', divs)

  console.log('\n=== END DEBUG ===\n')

  sleep(5000)
} finally {
  vibe.quit()
}
