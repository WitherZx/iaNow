
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for update

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Missing env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function updatePlans() {
  const plans = [
    {
      slug: 'free',
      name: 'Free Explorer',
      price_monthly: 0,
      features: ['1 Geração de Estratégia', '1 Geração Jurídica (Contrato)', '1 Protocolo Jus Postulandi'],
      limits: { strategy: 1, legal: 1, protocol: 1 },
      status: 'active',
      is_public: true
    },
    {
      slug: 'pro',
      name: 'Plano Pro',
      price_monthly: 99.90,
      features: ['Estratégia Ilimitada', 'Jurídico Ilimitado', 'Jus Postulandi Ilimitado', 'Suporte Prioritário'],
      limits: { strategy: -1, legal: -1, protocol: -1 },
      status: 'active',
      is_public: true
    }
  ]

  for (const plan of plans) {
    const { data, error } = await supabase
      .from('plans')
      .upsert(plan, { onConflict: 'slug' })

    if (error) console.error(`Error updating plan ${plan.slug}:`, error)
    else console.log(`Plan ${plan.slug} updated successfully!`)
  }
}

updatePlans()
