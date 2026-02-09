import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

console.log('Using Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

async function createStorageBucket() {
  console.log('Creating chat-attachments storage bucket...')

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }

    const existingBucket = buckets?.find(b => b.id === 'chat-attachments')

    if (existingBucket) {
      console.log('✓ Bucket already exists')
      return
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('chat-attachments', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']
    })

    if (error) {
      console.error('Error creating bucket:', error)
    } else {
      console.log('✓ Created chat-attachments bucket')
    }

  } catch (err) {
    console.error('Error:', err)
  }
}

createStorageBucket().catch(console.error)
