import { NextResponse } from 'next/server'
import { askAI } from '@/lib/openrouter'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { strategyId, prompt } = body

    if (!strategyId || !prompt) {
      return NextResponse.json({ error: 'Missing logic' }, { status: 400 })
    }

    // 1. Fetch existing strategy
    const { data: strategy, error: fetchError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', strategyId)
      .single() as any

    if (fetchError || !strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    const currentContent = JSON.stringify(strategy.content, null, 2)

    const systemPrompt = `Você é o estrategista sênior do iaNow. 
O usuário deseja AJUSTAR uma estratégia existente.
Abaixo está o JSON da estratégia atual. 
Sua tarefa é modificar este JSON seguindo as instruções do usuário, mantendo EXATAMENTE a mesma estrutura de chaves.
NÃO mude a estrutura do JSON, apenas o conteúdo dos campos conforme solicitado.
Estrutura exigida: title, description, pillars (array), actionPlan (array com task e impact), aiInsights (array).

JSON ATUAL:
${currentContent}`

    const userPrompt = `INSTRUÇÃO DE AJUSTE: ${prompt}

Gere o novo JSON completo com os ajustes aplicados.`

    const aiResponse = await askAI(userPrompt, systemPrompt)
    
    let content = aiResponse.content
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0].trim()
    }

    const parsedContent = JSON.parse(content)

    // 2. Update strategy in DB (Using Admin Client to ensures bypass RLS if needed for owners)
    const adminClient = createAdminClient() as any
    const { error: updateError } = await adminClient
      .from('strategies')
      .update({
        content: parsedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', strategyId)

    if (updateError) throw updateError

    // ── REGISTRAR ATIVIDADE ─────────────────────────────────────
    await adminClient.from('activity_logs').insert({
      organization_id: strategy.organization_id,
      user_id: user.id,
      resource_type: 'strategy',
      resource_id: strategyId,
      action: 'refine',
      description: `Ajustou a estratégia: ${parsedContent.title}`,
      metadata: { strategy_id: strategyId, prompt }
    })
    return NextResponse.json({ 
      success: true, 
      content: parsedContent 
    })

  } catch (error: any) {
    console.error('Refine Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
