const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  const plans = [
    {
      name: 'iaNow Free Explorer',
      slug: 'free',
      price_monthly: 0,
      features: ['1 Estratégia', '1 Contrato', '1 Protocolo'],
      limits: { strategy: 1, legal: 1, protocol: 1 },
      is_public: true,
      status: 'active'
    },
    {
      name: 'Plano Pro iaNow',
      slug: 'pro',
      price_monthly: 49.90,
      features: ['Estratégia Ilimitada', 'Jurídico Ilimitado', 'Jus Postulandi Express Ilimitado', 'Suporte Prioritário'],
      limits: { strategy: -1, legal: -1, protocol: -1 },
      is_public: true,
      status: 'active'
    }
  ];

  for (const plan of plans) {
    const { data, error } = await supabase
      .from('plans')
      .upsert(plan, { onConflict: 'slug' });

    if (error) console.error(`Erro no plano ${plan.slug}:`, error);
    else console.log(`Plano ${plan.slug} pronto!`);
  }
}

seed();
