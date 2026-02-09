import { getSession } from './src/services/session.js'

async function checkSession() {
  const session = await getSession('b34fd85d-8c96-4b1d-9b67-24b74e0e06a1')
  console.log(JSON.stringify(session, null, 2))
}

checkSession()
