const { browser } = require('vibium')

async function test() {
  const vibe = await browser.launch({ headless: false })
  
  try {
    await vibe.go('http://localhost:5173/interview')
    
    const result = await vibe.evaluate('window.location.href')
    console.log('Result:', result)
    console.log('Type:', typeof result)
    
    const result2 = await vibe.evaluate('2 + 2')
    console.log('Math result:', result2)
    
  } finally {
    await vibe.quit()
  }
}

test()
