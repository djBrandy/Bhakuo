import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function backup() {
  console.log('--- Alexander Data Backup ---')
  console.log('Fetching translations...')
  
  const { data, error } = await supabase
    .from('translations')
    .select('*')

  if (error) {
    console.error('Error fetching data:', error.message)
    return
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `alexander_backup_${timestamp}.json`
  
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2))
  
  console.log(`Success! Backup saved to: ${fileName}`)
  console.log(`Total words backed up: ${data.length}`)
}

backup()
