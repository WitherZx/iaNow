const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabase.from('generated_documents').select('created_by, metadata').eq('id', '6aa08189-a20b-4f81-99d1-9d82d9604665').single();
  console.log('Result:', JSON.stringify(data));
  console.log('Error:', error);
}
test();
