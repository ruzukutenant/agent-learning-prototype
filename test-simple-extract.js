/**
 * Test extracting messages using element API instead of evaluate
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

  console.log('\n=== Trying to extract messages ===\n')

  // Try finding a specific element
  try {
    const elem = vibe.find('.self-start', { timeout: 5000 })
    console.log('Found element with .self-start')
    console.log('Element info:', elem.info)
    console.log('Element text:', elem.text())
  } catch (e) {
    console.log('Could not find .self-start:', e.message)
  }

  // Try finding any div
  try {
    const div = vibe.find('div')
    console.log('\nFound a div')
    console.log('Div text:', div.text().substring(0, 100))
  } catch (e) {
    console.log('Could not find div:', e.message)
  }

  console.log('\n=== END ===\n')

  sleep(5000)
} finally {
  vibe.quit()
}
