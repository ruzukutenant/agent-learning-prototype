import pkg from 'pg'
const { Client } = pkg
import * as dotenv from 'dotenv'

dotenv.config()

// Extract the password from the secret key
const secretKey = process.env.SUPABASE_SECRET_KEY || ''
const password = secretKey.replace('sb_secret_', '')

// Construct connection string for Supabase
const connectionString = `postgresql://postgres.gqelaotedbyvysatnnsx:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

async function applyMigration() {
  try {
    await client.connect()
    console.log('✓ Connected to database')

    // Add conversation_state column
    console.log('Adding conversation_state column...')
    await client.query('ALTER TABLE advisor_sessions ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT NULL')
    console.log('✓ Added conversation_state column')

    // Add index
    console.log('Adding index...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_constraint ON advisor_sessions(constraint_category)')
    console.log('✓ Added index')

    console.log('\nMigration complete!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await client.end()
  }
}

applyMigration()
