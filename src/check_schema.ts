import { createClient } from './src/lib/supabase/client'

async function check() {
  const supabase = createClient()
  const { data, error } = await supabase.from('organizations').select('*').limit(1)
  console.log('Org:', JSON.stringify(data?.[0], null, 2))
  
  const { data: partners, error: pError } = await supabase.from('partners').select('*').limit(1)
  console.log('Partner:', JSON.stringify(partners?.[0], null, 2))
}

check()
