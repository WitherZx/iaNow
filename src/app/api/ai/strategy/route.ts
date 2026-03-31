import { NextResponse } from 'next/server'
import { askAI } from '@/lib/openrouter'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const guestId = req.headers.get('X-Guest-Id')

    if (!user && !guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { diagnosticData } = body

    if (!diagnosticData) {
      return NextResponse.json({ error: 'Missing diagnostic data' }, { status: 400 })
    }

    const systemPrompt = `Você é o motor de inteligência do iaNow, um sistema de Execução Sistêmica para empresas. 
Sua missão é gerar um plano estratégico de alto impacto baseado nos dados de diagnóstico fornecidos.
O plano deve ser prático, focado em "blindagem" empresarial e "execução instantânea".
Retorne o resultado em formato JSON estruturado com as seguintes chaves:
- title: Título da estratégia (impactante)
- description: Resumo executivo (focado em solução)
- pillars: Array de 3 pilares principais (cada um com title, description e priority: 'Alta', 'Média' ou 'Baixa')
- actionPlan: Lista de 5 passos imediatos (cada um com task e impact)
- aiInsights: 2 insights profundos e "fora da caixa" sobre o negócio.`

    const prompt = `DADOS DO DIAGNÓSTICO PARA ANÁLISE:
Organização: ${diagnosticData.companyName}
Site: ${diagnosticData.website || 'Não informado'}
Setor: ${diagnosticData.sector}
Solução Oferecida: ${diagnosticData.offeredSolution}
Tamanho da Equipe: ${diagnosticData.size}
Faturamento Mensal: ${diagnosticData.revenue}
Modelo de Negócio: ${diagnosticData.businessModel}
Nível de Digitalização: ${diagnosticData.digitalLevel}/5
Principal "Incêndio" (Dor): ${diagnosticData.mainPainPoint}
Desafios Adicionais: ${diagnosticData.challenges?.join(', ') || 'Nenhum'}
Objetivos de Curto Prazo: ${diagnosticData.goals?.join(', ') || 'Nenhum'}
Gargalo de Crescimento: ${diagnosticData.growthObstacle}

Gere o plano estratégico em JSON agora.`

    const aiModel = 'Minerva'

    // ── PERSISTÊNCIA NO BANCO DE DADOS (Imediata) ──────────────────────────
    const adminClient = createAdminClient()
    
    // 1. Buscar a organização do usuário
    let { data: membership } = user ? await adminClient
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .single() as any : { data: null }

    let orgId = membership?.organization_id

    if (!orgId) {
      if (user) {
        // ── AUTO-PROVISIONING: Criar organização para o usuário no primeiro uso ──
        console.log('Criando organização padrão para o usuário:', user.email)
        
        const companyName = diagnosticData.companyName || 'Minha Empresa'
        const slug = `${companyName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`

        const { data: newOrg, error: orgError } = await adminClient
          .from('organizations')
          .insert({ name: companyName, slug: slug, status: 'active' } as any)
          .select().single() as any

        if (orgError) throw orgError
        orgId = newOrg.id

        const { data: adminRole } = await adminClient
          .from('roles').select('id').eq('name', 'admin').single() as any

        const { error: memError } = await adminClient
          .from('memberships')
          .insert({
            organization_id: orgId,
            user_id: user.id,
            role_id: adminRole?.id || 'admin',
            status: 'active'
          } as any)

        if (memError) throw memError
      } else {
        // Support Guest Mode
        const { data: sandbox } = await adminClient.from('organizations').select('id').limit(1).single() as any
        orgId = sandbox?.id
        
        if (!orgId) {
           return NextResponse.json({ error: 'Organização não encontrada para convidados' }, { status: 404 })
        }
      }
    }

    // 2. Salvar o Diagnóstico
    const { data: diagnostic, error: diagError } = await adminClient
      .from('diagnostics')
      .insert({
        organization_id: orgId,
        created_by: user?.id || null,
        title: `Diagnóstico: ${diagnosticData.companyName}`,
        sector: diagnosticData.sector,
        company_size: diagnosticData.size,
        revenue_range: diagnosticData.revenue,
        main_challenges: diagnosticData.challenges,
        goals: diagnosticData.goals,
        metadata: { raw_answers: diagnosticData, guest_id: guestId },
        status: 'completed'
      } as any)
      .select().single() as any

    if (diagError) throw diagError

    // 3. Salvar a Estratégia em estado PROCESSING (Placeholder)
    const { data: strategy, error: stratError } = await adminClient
      .from('strategies')
      .insert({
        organization_id: orgId,
        diagnostic_id: diagnostic.id,
        created_by: user?.id || null,
        title: 'Gerando Estratégia...',
        description: 'A Inteligência Artificial está processando seu diagnóstico e construindo seu plano de atuação imediato.',
        ai_model: aiModel,
        content: {},
        metadata: { guest_id: guestId },
        status: 'processing'
      } as any)
      .select().single() as any

    if (stratError) throw stratError

    // ── GERAÇÃO SINCRONIZADA (Aguardando IA para Vercel) ──────────────────────────
    try {
      const aiResponse = await askAI(prompt, systemPrompt)
      let content = aiResponse.content
      if (content.includes('```json')) {
        content = content.split('```json')[1].split('```')[0].trim()
      }

      let parsedContent
      try {
        parsedContent = JSON.parse(content)
      } catch (e) {
        console.error("Erro ao fazer parse do JSON da IA", e)
        parsedContent = { 
          title: "Estratégia Gerada", 
          description: "Plano gerado com base no diagnóstico.", 
          pillars: [], 
          actionPlan: [], 
          aiInsights: [] 
        }
      }

      // Atualiza para ACTIVE
      const adminApi = adminClient as any
      await adminApi.from('strategies').update({
        title: parsedContent.title,
        description: parsedContent.description,
        content: parsedContent,
        status: 'active'
      }).eq('id', strategy.id)

      if (user) {
        // Registra a atividade APÓS finalizar
        await adminApi.from('activity_logs').insert({
          organization_id: orgId,
          user_id: user.id,
          resource_type: 'strategy',
          resource_id: strategy.id,
          action: 'create',
          description: `Concluiu o plano estratégico: ${parsedContent.title}`,
          metadata: { strategy_id: strategy.id, version: 1 }
        })
      }

      return NextResponse.json({ 
        success: true, 
        strategyId: strategy.id,
        status: 'ready'
      })
    } catch (e) {
      console.error('Erro na thread da IA:', e)
      const adminApi = adminClient as any
      await adminApi.from('strategies').update({
        status: 'failed',
        title: 'Falha na IA',
        description: 'A inteligência não conseguiu processar este plano.'
      }).eq('id', strategy.id)

      return NextResponse.json({ error: 'A inteligência não conseguiu processar este plano no momento.' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
