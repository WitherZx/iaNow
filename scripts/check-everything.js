const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://thxblqqvkcabzwbizhch.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGJscXF2a2NhYnp3Yml6aGNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQyNjM1NywiZXhwIjoyMDg5MDAyMzU3fQ.J_oWsVLHiiGfNr-YjY96bc_zYPMyVBxeKCQCRysLEls'
)

async function check() {
  const { data, error } = await supabase.from('partners').select().limit(1)
  // Even if empty, we might get column names if we use a specific query type or inspect the error of a bad query
  // But let's try to find ANY existing partner first
  console.log('Error if any:', error)
  console.log('Data:', data)
  
  // Try to inspect the public schema via information_schema
  const { data: cols, error: colError } = await supabase.rpc('get_columns', { t_name: 'partners' })
  console.log('Cols RPC:', cols)
  
  // Fallback: try to insert and catch column error
  const { error: insErr } = await supabase.from('partners').insert({ dummy_col: 1 })
  console.log('Ins Error:', insErr?.message)
}

check()
