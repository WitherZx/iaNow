const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://thxblqqvkcabzwbizhch.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGJscXF2a2NhYnp3Yml6aGNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQyNjM1NywiZXhwIjoyMDg5MDAyMzU3fQ.J_oWsVLHiiGfNr-YjY96bc_zYPMyVBxeKCQCRysLEls'
)

async function check() {
  const { error } = await supabase.from('organizations').update({ dummy: 1 }).eq('id', 'dummy')
  console.log('Org cols error:', error?.message)
}

check()
