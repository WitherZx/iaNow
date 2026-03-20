const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://thxblqqvkcabzwbizhch.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGJscXF2a2NhYnp3Yml6aGNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQyNjM1NywiZXhwIjoyMDg5MDAyMzU3fQ.J_oWsVLHiiGfNr-YjY96bc_zYPMyVBxeKCQCRysLEls'
)

async function check() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'partners' })
  if (error) {
    // If RPC doesn't exist, try a dummy insert to get error with columns
    const { error: insertError } = await supabase.from('partners').insert({ dummy: 'column' })
    console.log('Insert error showing columns:', insertError?.message)
  } else {
    console.log('Columns:', data)
  }
}

check()
