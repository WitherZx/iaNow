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

    const adminClient = createAdminClient()
    
    // Buscar a organização do usuário (mais robusto)
    const { data: membership, error: memberError } = user ? await adminClient
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle() as any : { data: null, error: null }

    if (memberError) {
      console.error('Membership Fetch Error:', memberError)
    }

    let orgId = membership?.organization_id
    let fallbackUserId = user?.id
    
    if (!orgId) {
      if (!user) {
        const { data: sandbox } = await adminClient
          .from('organizations')
          .select('id')
          .limit(1)
          .single() as any
        orgId = sandbox?.id
      }

      if (!orgId) {
        return NextResponse.json({ error: 'Sua conta não possui uma organização vinculada. Complete o onboarding.' }, { status: 400 })
      }
    }

    // Se for guest, precisamos de um user_id válido para não violar a constraint "not null" da tabela justice_demands
    if (!user && orgId) {
      const { data: adminMember } = await adminClient
        .from('memberships')
        .select('user_id')
        .eq('organization_id', orgId)
        .limit(1)
        .maybeSingle() as any
      
      if (adminMember?.user_id) {
        fallbackUserId = adminMember.user_id
      }
    }

    const body = await req.json()
    const { diagnosticData, demandId } = body

    if (!diagnosticData) {
      return NextResponse.json({ error: 'Missing diagnostic data' }, { status: 400 })
    }

    const isRefining = diagnosticData.isRefining

    const systemPrompt = `Você é um especialista em Juizado Especial Cível (JEC) no Brasil. 
Sua tarefa é ${isRefining ? 'aplicar ALTERAÇÕES em uma petição' : 'gerar uma PETIÇÃO INICIAL'} com base nos dados fornecidos.

ESTA PETIÇÃO É PARA JUS POSTULANDI (O PRÓPRIO CIDADÃO ATUANDO SEM ADVOGADO).
REGRAS CRÍTICAS:
1. NÃO coloque campos para nome de advogado, OAB ou assinatura de advogado no final.
2. A petição deve terminar apenas com local, data e o nome do AUTOR.
3. NÃO peça 'honorários advocatícios' nos pedidos, pois no JEC em 1ª instância não há condenação em honorários (exceto má-fé).
4. Use linguagem clara e direta, mas juridicamente fundamentada.

ESTRUTURA DA PETIÇÃO:
1. Endereçamento (Selecione o JEC competente com base na cidade do autor ou réu).
2. Qualificação Completa (Autor e Réu).
3. Dos Fatos (Narrativa cronológica).
4. Do Direito (Fundamentação jurídica com CDC, CC, etc.).
5. Dos Pedidos e Valor da Causa.

ORIENTAÇÃO LEGAL ADICIONAL:
- Se for fornecida uma 'Jurisprudência de Referência', utilize-a como BASE LEGAL PRINCIPAL para fundamentar o pedido, citando-a ou explicando por que o caso do autor se assemelha àquela decisão.

O RESULTADO DEVE SER UM JSON VÁLIDO:
{
  "petition": "Markdown completo",
  "tipo_acao": "Título curto",
  "score": 0 a 100,
  "auditoria": {
     "pontos_fortes": ["..."],
     "falhas_detectadas": ["..."],
     "instrucoes_protocolo": ["Passo prático 1 (ex: Acessar portal do TJ)", "Passo prático 2 (ex: Clicar em Novo Processo)"],
     "documentos_necessarios": ["Item do documento 1 (ex: RG/CPF)", "Item do documento 2 (ex: Comprovante de Residência)"],
     "onde_protocolar": {
        "orgao": "Ex: Juizado Especial Cível de [Cidade]",
        "portal": "Link sugerido do TJ do Estado (ex: TJSP, TJRJ)",
        "instrucao": "Ex: Procurar o setor de Atermação ou usar o portal [Link]"
     }
  }
}

IMPORTANTE: Não coloque documentos no campo 'instrucoes_protocolo'. Use 'instrucoes_protocolo' apenas para a sequência de ações práticas. 
Coloque a lista de documentos exclusivamente em 'documentos_necessarios'.`

    const userPrompt = isRefining 
      ? `PETIÇÃO ATUAL:
${diagnosticData.petition_content}

SOLICITAÇÃO DE AJUSTE:
${diagnosticData.refinePrompt}

Ajuste a petição e atualize a auditoria se necessário.`
      : `DADOS PARA GERAR PETIÇÃO:
- Tipo: ${diagnosticData.problemType}
- Comarca: ${diagnosticData.comarca || 'Deixar para o usuário preencher'}
- Autor: ${diagnosticData.authorName}, CPF: ${diagnosticData.authorDocument}, Endereço: ${diagnosticData.authorAddress}
- Réu: ${diagnosticData.defendantName}, CPF: ${diagnosticData.defendantDocument}, Endereço: ${diagnosticData.defendantAddress}
- Fatos: ${diagnosticData.whatHappened} no dia ${diagnosticData.whenHappened}
- Danos: R$ ${diagnosticData.materialDamage} (Material), R$ ${diagnosticData.moralDamage} (Moral)
- Total: R$ ${diagnosticData.estimatedValue}
${diagnosticData.jurisprudence ? `\n- JURISPRUDÊNCIA DE REFERÊNCIA (USE COMO BASE): ${diagnosticData.jurisprudence}` : ''}

Gere o JSON completo.`

    const aiResponse = await askAI(userPrompt, systemPrompt)
    let rawResponse = aiResponse.content.trim()
    if (rawResponse.includes('```json')) rawResponse = rawResponse.split('```json')[1].split('```')[0].trim()
    else if (rawResponse.startsWith('```')) rawResponse = rawResponse.replace(/^```/, '').replace(/```$/, '').trim()

    let parsedData: any
    try {
      parsedData = JSON.parse(rawResponse)
    } catch (e) {
      parsedData = { 
        petition: rawResponse, 
        tipo_acao: 'Indenizatória',
        score: 70,
        auditoria: { pontos_fortes: [], falhas_detectadas: [], instrucoes_protocolo: [], documentos_necessarios: [], onde_protocolar: { orgao: 'JEC Local' } }
      }
    }

    const adminApi = adminClient as any

    if (isRefining && demandId) {
      const { error: updateError } = await adminApi
        .from('justice_demands')
        .update({
          tipo_acao: parsedData.tipo_acao,
          score_risco: parsedData.score,
          metadata: {
             ...diagnosticData,
             petition_content: parsedData.petition,
             auditoria: parsedData.auditoria,
             refined_at: new Date().toISOString()
          }
        })
        .eq('id', demandId)

      if (updateError) throw updateError
      return NextResponse.json({ success: true, demandId })
    } else {
      const valorTotal = Number(diagnosticData.estimatedValue || 0)
      const { data: demand, error: demandError } = await adminApi
        .from('justice_demands')
        .insert({
          organization_id: orgId,
          user_id: fallbackUserId,
          status: 'ready',
          tipo_acao: parsedData.tipo_acao,
          descricao_fatos: diagnosticData.whatHappened,
          valor_causa: valorTotal,
          score_risco: parsedData.score,
          metadata: {
             ...diagnosticData,
             petition_content: parsedData.petition,
             auditoria: parsedData.auditoria,
             generated_at: new Date().toISOString(),
             guest_id: guestId
          }
        } as any)
        .select().single() as any

      if (demandError) throw demandError
      return NextResponse.json({ success: true, demandId: demand.id })
    }

  } catch (error: any) {
    console.error('API Error Justice:', error)
    return NextResponse.json({ error: error.message || JSON.stringify(error) || 'Erro desconhecido' }, { status: 500 })
  }
}
