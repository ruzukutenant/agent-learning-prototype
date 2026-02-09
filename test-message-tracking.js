/**
 * Test tracking multiple messages by their position on screen
 */

const { browserSync } = require('vibium')

function sleep(ms) {
  const start = Date.now()
  while (Date.now() - start < ms) {}
}

const vibe = browserSync.launch({ headless: false })

try {
  // Navigate and start chat
  vibe.go('http://localhost:5173/interview')
  sleep(2000)

  const nameInput = vibe.find('input[placeholder="First Name"]')
  nameInput.type('Test User')
  sleep(500)

  const submitButton = vibe.find('button[type="submit"]')
  submitButton.click()
  sleep(5000)

  console.log('\n=== Testing message tracking by position ===\n')

  // Get first message
  const msg1 = vibe.find('.self-start')
  const box1 = msg1.boundingBox()
  const text1 = msg1.text()

  console.log('Message 1:')
  console.log('  Text:', text1.substring(0, 60) + '...')
  console.log('  Position Y:', box1.y)
  console.log('  Height:', box1.height)

  // Send a response to get a second message
  console.log('\nSending response to trigger next message...')
  const input = vibe.find('input[placeholder="Type Message..."]')
  input.type("I'm a business coach for small service businesses.")

  const sendBtn = vibe.find('button.from-teal-400')
  sendBtn.click()

  sleep(8000) // Wait for AI response

  // Try to find if there's a way to get the SECOND .self-start element
  console.log('\nLooking for second message...')
  const msg2 = vibe.find('.self-start')
  const box2 = msg2.boundingBox()
  const text2 = msg2.text()

  console.log('Found element:')
  console.log('  Text:', text2.substring(0, 60) + '...')
  console.log('  Position Y:', box2.y)
  console.log('  Same as first?', text2 === text1)

  console.log('\n=== Conclusion ===')
  if (text2 === text1) {
    console.log('❌ Still finding the FIRST message')
    console.log('   Position tracking won\'t help - find() always returns first match')
  } else {
    console.log('✅ Found a different message!')
  }

  sleep(3000)

} finally {
  vibe.quit()
}
