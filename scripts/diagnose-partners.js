const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://thxblqqvkcabzwbizhch.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeGJscXF2a2NhYnp3Yml6aGNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQyNjM1NywiZXhwIjoyMDg5MDAyMzU3fQ.J_oWsVLHiiGfNr-YjY96bc_zYPMyVBxeKCQCRysLEls'
)

async function diagnose() {
  const slug = 'test-diag-' + Date.now()

  // Test 1: What if we omit 'category' entirely?
  const { error: e1 } = await supabase.from('partners').insert({ name: 'Diag1', slug: slug + '-1' })
  console.log('1. No category:', e1?.message || 'SUCCESS')

  // Test 2: category = 'pf'
  const { error: e2 } = await supabase.from('partners').insert({ name: 'Diag2', slug: slug + '-2', category: 'pf' })
  console.log('2. category=pf:', e2?.message || 'SUCCESS')

  // Test 3: category = 'pj'
  const { error: e3 } = await supabase.from('partners').insert({ name: 'Diag3', slug: slug + '-3', category: 'pj' })
  console.log('3. category=pj:', e3?.message || 'SUCCESS')

  // Test 4: category = 'cliente'
  const { error: e4 } = await supabase.from('partners').insert({ name: 'Diag4', slug: slug + '-4', category: 'cliente' })
  console.log('4. category=cliente:', e4?.message || 'SUCCESS')

  // Test 5: category = 'fornecedor'
  const { error: e5 } = await supabase.from('partners').insert({ name: 'Diag5', slug: slug + '-5', category: 'fornecedor' })
  console.log('5. category=fornecedor:', e5?.message || 'SUCCESS')

  // Test 6: category = 'parceiro'
  const { error: e6 } = await supabase.from('partners').insert({ name: 'Diag6', slug: slug + '-6', category: 'parceiro' })
  console.log('6. category=parceiro:', e6?.message || 'SUCCESS')

  // Test 7: category = null explicitly
  const { error: e7 } = await supabase.from('partners').insert({ name: 'Diag7', slug: slug + '-7', category: null })
  console.log('7. category=null:', e7?.message || 'SUCCESS')

  // Test 8: what does the schema cache say? Dummy column to get column list
  const { error: e8 } = await supabase.from('partners').insert({ dummy_field: 1 })
  console.log('8. Schema cache error:', e8?.message || 'SUCCESS')
}

diagnose()
