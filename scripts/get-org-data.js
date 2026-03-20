const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://thxblqqvkcabzwbizhch.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGJscXF2a2NhYnp3Yml6aGNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQyNjM1NywiZXhwIjoyMDg5MDAyMzU3fQ.J_oWsVLHiiGfNr-YjY96bc_zYPMyVBxeKCQCRysLEls'
)

async function check() {
  const { data, error } = await supabase.from('organizations').select('*').limit(1)
  if (data && data[0]) {
    console.log('Org columns:', Object.keys(data[0]))
    console.log('First org:', JSON.stringify(data[0], null, 2))
  } else {
    console.log('No data found or error:', error)
  }
}

check()
