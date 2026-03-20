const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkSchema() {
  const { data, error } = await supabase.from('partners').select('*').limit(1)
  if (data && data.length > 0) {
    console.log('Partners Columns:', Object.keys(data[0]))
    console.log('Sample Partner Data:', JSON.stringify(data[0], null, 2))
  } else {
    console.log('No partners found or error:', error)
  }
}

checkSchema()
