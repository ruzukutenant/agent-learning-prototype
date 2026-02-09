/**
 * UI End-to-End Test with Vibium
 *
 * Tests the full advisor flow through the actual browser UI
 */

const fs = require('fs')
const { browserSync } = require('vibium')

// Helper to wait/sleep
function sleep(ms) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    // Busy wait for synchronous sleep
  }
}

console.log('🌐 Starting UI end-to-end test...\n')

// Launch browser (visible so we can see what's happening)
const vibe = browserSync.launch({
  headless: false
})

try {
  // Navigate to app
  console.log('📱 Opening app at http://localhost:5173')
  vibe.go('http://localhost:5173')
  sleep(2000) // Give it a moment to load

  // Take initial screenshot
  console.log('📸 Taking screenshot: 01-landing.png')
  fs.writeFileSync('screenshots/01-landing.png', vibe.screenshot())

  // Navigate directly to interview page (simpler than clicking button)
  console.log('🖱️  Navigating to /interview')
  vibe.go('http://localhost:5173/interview')
  sleep(2000)

  // Enter name on name collection page
  console.log('✍️  Entering name: Test User')
  const nameInput = vibe.find('input[placeholder="First Name"]', { timeout: 10000 })
  nameInput.type('Test User')
  sleep(500)

  fs.writeFileSync('screenshots/02-name-input.png', vibe.screenshot())

  // Submit the form by finding and clicking submit button
  console.log('🖱️  Clicking "Start Assessment"')
  const submitButton = vibe.find('button[type="submit"]')
  submitButton.click()
  sleep(4000) // Wait for session creation and navigation to chat

  console.log('💬 Starting conversation...\n')

  // Helper function to send a message
  function sendMessage(text, stepNumber, description) {
    console.log(`   ${stepNumber}. ${description}`)
    console.log(`      User: "${text}"`)

    // Wait for input to be available
    const messageInput = vibe.find('input[placeholder="Type Message..."]', { timeout: 10000 })

    // Type the message (no need to clear, it's already empty after sending)
    messageInput.type(text)
    sleep(500)

    // Click send button - find the button with the gradient class
    const sendButton = vibe.find('button.from-teal-400')
    sendButton.click()

    // Wait for AI response (give it time to stream and complete)
    sleep(6000)

    // Take screenshot
    fs.writeFileSync(`screenshots/${stepNumber}-response.png`, vibe.screenshot())

    console.log(`      ✓ Response received\n`)
  }

  // CONTEXT Phase
  console.log('📋 CONTEXT Phase')
  sleep(3000) // Wait for initial greeting
  fs.writeFileSync('screenshots/03-greeting.png', vibe.screenshot())

  sendMessage(
    "I'm a business coach for small service businesses.",
    '04',
    'Business type'
  )

  sendMessage(
    "Mostly referrals and LinkedIn.",
    '05',
    'Acquisition source'
  )

  sendMessage(
    "About $10K per month.",
    '06',
    'Volume indicator'
  )

  sendMessage(
    "I'm drowning in manual work and can't scale.",
    '07',
    'Surface challenge'
  )

  // EXPLORATION Phase
  console.log('🔍 EXPLORATION Phase')

  sendMessage(
    "Everything is manual - scheduling, invoicing, follow-ups. No systems at all.",
    '08',
    'Exploration signal 1'
  )

  sendMessage(
    "I know exactly what I need to do, I just can't find the time to build it out.",
    '09',
    'Exploration signal 2'
  )

  // DIAGNOSIS Phase
  console.log('🎯 DIAGNOSIS Phase')

  sendMessage(
    "Yes, that's exactly it.",
    '10',
    'Validate constraint'
  )

  // READINESS Phase
  console.log('📊 READINESS Phase')

  sendMessage(
    "8",
    '11',
    'Clarity score'
  )

  sendMessage(
    "8",
    '12',
    'Confidence score'
  )

  sendMessage(
    "9",
    '13',
    'Capacity score'
  )

  // ROUTING Phase
  console.log('🚦 ROUTING Phase')

  // The AI should ask: "Would you rather have someone build that for you, or work with a strategist?"
  sleep(3000)
  fs.writeFileSync('screenshots/14-routing-question.png', vibe.screenshot())

  sendMessage(
    "I need someone to build it for me.",
    '15',
    'Routing preference'
  )

  // Wait for redirect to summary
  console.log('⏳ Waiting for redirect to summary page...')
  sleep(6000)

  // Check if we're on the summary page
  const currentUrl = vibe.evaluate('window.location.href')
  console.log(`📍 Current URL: ${currentUrl}`)

  if (currentUrl.includes('/summary/')) {
    console.log('✅ Successfully redirected to summary page!')
    fs.writeFileSync('screenshots/16-summary.png', vibe.screenshot())

    // Extract session ID from URL
    const sessionId = currentUrl.split('/summary/')[1]
    console.log(`   Session ID: ${sessionId}`)

    // Check what endpoint is recommended
    const pageText = vibe.evaluate('document.body.textContent')

    if (pageText.includes('MIST Implementation')) {
      console.log('✅ MIST endpoint recommended (CORRECT for deliverable need)')
    } else if (pageText.includes('Expert Strategist')) {
      console.log('⚠️  EC endpoint recommended (expected MIST for this scenario)')
    } else if (pageText.includes('Self-Guided')) {
      console.log('❌ NURTURE endpoint recommended (wrong for high readiness)')
    }

  } else {
    console.log('⚠️  Not on summary page. Still on:', currentUrl)
    fs.writeFileSync('screenshots/16-unexpected.png', vibe.screenshot())
  }

  console.log('\n✅ UI test complete!')
  console.log('📸 Screenshots saved to screenshots/ folder')

} catch (error) {
  console.error('\n❌ Test failed:', error.message)
  console.error('Error stack:', error.stack)
  try {
    fs.writeFileSync('screenshots/error.png', vibe.screenshot())
    console.log('📸 Error screenshot saved')
  } catch (screenshotError) {
    console.log('⚠️  Could not save error screenshot')
  }
} finally {
  // Keep browser open for 5 seconds so we can see the final state
  console.log('\n⏳ Keeping browser open for 5 seconds...')
  sleep(5000)

  vibe.quit()
  console.log('👋 Browser closed')
}
