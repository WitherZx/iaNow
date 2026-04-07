
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://thxblqqvkcabzwbizhch.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGJscXF2a2NhYnp3Yml6aGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjYzNTcsImV4cCI6MjA4OTAwMjM1N30.isg8Id60voMkEtWz49lWZBxfmAZtKNv4aKFKpXVKzBE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function listAll() {
  const { data: configs, error } = await supabase.from('app_configs').select('*').limit(1)
  if (error) {
    console.error('Error fetching configs:', error)
    return
  }
  console.log('--- TABLE STRUCTURE ---')
  if (configs && configs.length > 0) {
    console.log(Object.keys(configs[0]).join(', '))
  } else {
    // If table is empty, try to get column names from information_schema
    console.log('Table is empty')
  }
}

listAll()
