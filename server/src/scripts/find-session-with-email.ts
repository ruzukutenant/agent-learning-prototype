import { supabase } from '../config/supabase.js'

async function findSessionsWithEmail() {
  const { data: sessions } = await supabase
    .from('advisor_sessions')
    .select('id, user_name, user_email, constraint_category, email_sent')
    .not('constraint_category', 'is', null)
    .not('user_email', 'is', null)
    .limit(5)

  console.log('Sessions with email and completed assessment:')
  sessions?.forEach((s, i) => {
    console.log(`${i + 1}. ${s.user_name} - ${s.user_email} - ${s.constraint_category}`)
    console.log(`   ID: ${s.id} - Email sent: ${s.email_sent}`)
  })
}

findSessionsWithEmail()
