
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Missing env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function listAll() {
  const { data: configs } = await supabase.from('app_configs').select('*')
  console.log('--- CONFIGS ---')
  console.log(JSON.stringify(configs, null, 2))
  
  const { data: plans } = await supabase.from('plans').select('*')
  console.log('--- PLANS ---')
  console.log(JSON.stringify(plans, null, 2))
}

listAll()
