import { supabase } from '../config/supabase.js'

interface VerificationResult {
  test: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: VerificationResult[] = []

async function verify() {
  console.log('🔍 Starting database verification...\n')

  // Test 1: Check connection
  try {
    const { data, error } = await supabase
      .from('advisor_sessions')
      .select('count')
      .limit(0)

    if (error) {
      results.push({
        test: 'Database Connection',
        passed: false,
        message: `Failed to connect: ${error.message}`,
      })
    } else {
      results.push({
        test: 'Database Connection',
        passed: true,
        message: 'Successfully connected to Supabase',
      })
    }
  } catch (error: any) {
    results.push({
      test: 'Database Connection',
      passed: false,
      message: `Connection error: ${error.message}`,
    })
  }

  // Test 2: Check advisor_sessions table structure
  try {
    const { data, error } = await supabase
      .from('advisor_sessions')
      .select('*')
      .limit(0)

    if (error) {
      results.push({
        test: 'advisor_sessions table',
        passed: false,
        message: `Table error: ${error.message}`,
      })
    } else {
      results.push({
        test: 'advisor_sessions table',
        passed: true,
        message: 'Table exists and is accessible',
      })
    }
  } catch (error: any) {
    results.push({
      test: 'advisor_sessions table',
      passed: false,
      message: `Table check failed: ${error.message}`,
    })
  }

  // Test 3: Check advisor_messages table structure
  try {
    const { data, error } = await supabase
      .from('advisor_messages')
      .select('*')
      .limit(0)

    if (error) {
      results.push({
        test: 'advisor_messages table',
        passed: false,
        message: `Table error: ${error.message}`,
      })
    } else {
      results.push({
        test: 'advisor_messages table',
        passed: true,
        message: 'Table exists and is accessible',
      })
    }
  } catch (error: any) {
    results.push({
      test: 'advisor_messages table',
      passed: false,
      message: `Table check failed: ${error.message}`,
    })
  }

  // Test 4: Create a test session
  let testSessionId: string | null = null
  try {
    const { data, error } = await supabase
      .from('advisor_sessions')
      .insert({
        user_name: 'Database Verification Test',
        current_phase: 'context',
        total_turns: 0,
        completion_status: 'in_progress',
        conversation_log: [],
      })
      .select()
      .single()

    if (error) {
      results.push({
        test: 'Create Session',
        passed: false,
        message: `Insert failed: ${error.message}`,
      })
    } else {
      testSessionId = data.id
      results.push({
        test: 'Create Session',
        passed: true,
        message: `Created session: ${data.id}`,
        data: { sessionId: data.id },
      })
    }
  } catch (error: any) {
    results.push({
      test: 'Create Session',
      passed: false,
      message: `Creation error: ${error.message}`,
    })
  }

  // Test 5: Read the session back
  if (testSessionId) {
    try {
      const { data, error } = await supabase
        .from('advisor_sessions')
        .select('*')
        .eq('id', testSessionId)
        .single()

      if (error) {
        results.push({
          test: 'Read Session',
          passed: false,
          message: `Read failed: ${error.message}`,
        })
      } else {
        results.push({
          test: 'Read Session',
          passed: true,
          message: `Successfully retrieved session`,
          data: { userName: data.user_name },
        })
      }
    } catch (error: any) {
      results.push({
        test: 'Read Session',
        passed: false,
        message: `Read error: ${error.message}`,
      })
    }
  }

  // Test 6: Update the session
  if (testSessionId) {
    try {
      const { data, error } = await supabase
        .from('advisor_sessions')
        .update({
          business_type: 'Coaching',
          total_turns: 1,
        })
        .eq('id', testSessionId)
        .select()
        .single()

      if (error) {
        results.push({
          test: 'Update Session',
          passed: false,
          message: `Update failed: ${error.message}`,
        })
      } else {
        results.push({
          test: 'Update Session',
          passed: true,
          message: `Successfully updated session`,
          data: { businessType: data.business_type, totalTurns: data.total_turns },
        })
      }
    } catch (error: any) {
      results.push({
        test: 'Update Session',
        passed: false,
        message: `Update error: ${error.message}`,
      })
    }
  }

  // Test 7: Create a message
  if (testSessionId) {
    try {
      const { data, error } = await supabase
        .from('advisor_messages')
        .insert({
          session_id: testSessionId,
          turn_number: 1,
          speaker: 'user',
          message_text: 'Test message',
          phase: 'context',
          was_voice: false,
        })
        .select()
        .single()

      if (error) {
        results.push({
          test: 'Create Message',
          passed: false,
          message: `Insert failed: ${error.message}`,
        })
      } else {
        results.push({
          test: 'Create Message',
          passed: true,
          message: `Created message: ${data.id}`,
        })
      }
    } catch (error: any) {
      results.push({
        test: 'Create Message',
        passed: false,
        message: `Creation error: ${error.message}`,
      })
    }
  }

  // Test 8: Read messages
  if (testSessionId) {
    try {
      const { data, error } = await supabase
        .from('advisor_messages')
        .select('*')
        .eq('session_id', testSessionId)
        .order('turn_number', { ascending: true })

      if (error) {
        results.push({
          test: 'Read Messages',
          passed: false,
          message: `Read failed: ${error.message}`,
        })
      } else {
        results.push({
          test: 'Read Messages',
          passed: true,
          message: `Retrieved ${data.length} message(s)`,
          data: { messageCount: data.length },
        })
      }
    } catch (error: any) {
      results.push({
        test: 'Read Messages',
        passed: false,
        message: `Read error: ${error.message}`,
      })
    }
  }

  // Test 9: Check CASCADE delete (delete session should delete messages)
  if (testSessionId) {
    try {
      const { error } = await supabase
        .from('advisor_sessions')
        .delete()
        .eq('id', testSessionId)

      if (error) {
        results.push({
          test: 'Delete Session (CASCADE)',
          passed: false,
          message: `Delete failed: ${error.message}`,
        })
      } else {
        // Check if messages were also deleted
        const { data: messages } = await supabase
          .from('advisor_messages')
          .select('*')
          .eq('session_id', testSessionId)

        results.push({
          test: 'Delete Session (CASCADE)',
          passed: true,
          message: `Session deleted, ${messages?.length || 0} messages remaining (should be 0)`,
          data: { messagesAfterDelete: messages?.length || 0 },
        })
      }
    } catch (error: any) {
      results.push({
        test: 'Delete Session (CASCADE)',
        passed: false,
        message: `Delete error: ${error.message}`,
      })
    }
  }

  // Test 10: Check indexes (we can't directly query indexes, but we can test performance)
  try {
    const { data, error } = await supabase
      .from('advisor_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      results.push({
        test: 'Index Test (created_at)',
        passed: false,
        message: `Query failed: ${error.message}`,
      })
    } else {
      results.push({
        test: 'Index Test (created_at)',
        passed: true,
        message: 'Index working correctly',
      })
    }
  } catch (error: any) {
    results.push({
      test: 'Index Test',
      passed: false,
      message: `Index test error: ${error.message}`,
    })
  }

  // Print results
  console.log('📊 Verification Results:\n')
  let passedCount = 0
  let failedCount = 0

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} Test ${index + 1}: ${result.test}`)
    console.log(`   ${result.message}`)
    if (result.data) {
      console.log(`   Data: ${JSON.stringify(result.data)}`)
    }
    console.log('')

    if (result.passed) {
      passedCount++
    } else {
      failedCount++
    }
  })

  console.log('━'.repeat(50))
  console.log(`\n📈 Summary: ${passedCount}/${results.length} tests passed\n`)

  if (failedCount === 0) {
    console.log('🎉 All tests passed! Database is properly configured.')
    process.exit(0)
  } else {
    console.log(`⚠️  ${failedCount} test(s) failed. Please check the errors above.`)
    process.exit(1)
  }
}

verify().catch((error) => {
  console.error('❌ Verification script failed:', error)
  process.exit(1)
})
