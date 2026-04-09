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
   - VALIDAÇÃO DE DOCUMENTO: Se o Autor for Pessoa Física, o documento deve ser um CPF (000.000.000-00). Se o Réu for Empresa, o documento deve ser um CNPJ (00.000.000/0000-00).
   - NUNCA troque essas informações. Se os dados fornecidos parecerem inconsistentes (ex: CNPJ no Autor PF), corrija para o formato correto ou deixe em branco se não tiver certeza absoluta.
3. Dos Fatos (Narrativa cronológica detalhada baseada nos dados fornecidos).
4. Do Direito (Fundamentação jurídica com CDC, CC, etc.).
5. Dos Pedidos e Valor da Causa.

IMPORTANTE: Use os fatos reais informados. Se o usuário mencionou pesos, valores e locais específicos, eles DEVEM constar na petição. Jamais use placeholders se houver dados.

O RESULTADO DEVE SER UM JSON VÁLIDO:
{
  "petition": "Markdown completo",
  "tipo_acao": "Título curto",
  "score": 0 a 100,
  "auditoria": {
     "pontos_fortes": ["..."],
     "falhas_detectadas": ["..."],
     "instrucoes_protocolo": ["Passo prático 1 (ex: Acessar portal do TJ)", "Passo prático 2 (ex: Clicar em Novo Processo)"],
     "documentos_necessarios": ["RG/CPF", "Comprovante de Residência"],
     "provas_recomendadas": ["Prova 1 (ex: Prints do WhatsApp)", "Prova 2 (ex: Nota Fiscal n. 123)"],
     "onde_protocolar": {
        "orgao": "Ex: Juizado Especial Cível de [Cidade]",
        "portal": "Link sugerido do TJ do Estado",
        "instrucao": "Ex: Procurar o setor de Atermação"
     }
  }
}

IMPORTANTE: Diferencie 'documentos_necessarios' (que são documentos de identificação) de 'provas_recomendadas' (que são as evidências dos fatos narrados). Seja específico sobre as provas (ex: se houve dano material, mencione a nota fiscal).
Não coloque documentos no campo 'instrucoes_protocolo'. Use 'instrucoes_protocolo' apenas para a sequência de ações práticas.`

    const userPrompt = isRefining 
      ? `PETIÇÃO ATUAL:
${diagnosticData.petition_content}

SOLICITAÇÃO DE AJUSTE:
${diagnosticData.refinePrompt}

Ajuste a petição e atualize a auditoria se necessário.`
      : `DADOS PARA GERAR PETIÇÃO:
- Tipo: ${diagnosticData.problemType}
- Comarca: ${diagnosticData.comarca || 'Deixar para o usuário preencher'}

QUALIFICAÇÃO DO AUTOR:
- Nome: ${diagnosticData.authorName}
- Tipo: ${diagnosticData.authorType === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}
- Documento: ${diagnosticData.authorDocument}
- E-mail: ${diagnosticData.authorEmail || 'Não informado'}
- Telefone: ${diagnosticData.authorPhone || 'Não informado'}
- Endereço: ${diagnosticData.authorAddress || 'Não informado'}

QUALIFICAÇÃO DO RÉU:
- Nome: ${diagnosticData.defendantName}
- Tipo: ${diagnosticData.defendantType === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}
- Documento: ${diagnosticData.defendantDocument || 'Não informado'}
- E-mail: ${diagnosticData.defendantEmail || 'Não informado'}
- Telefone: ${diagnosticData.defendantPhone || 'Não informado'}
- Endereço: ${diagnosticData.defendantAddress || 'Não informado'}

SOBRE OS FATOS:
- Narrativa: ${diagnosticData.whatHappened}
- Data do ocorrido: ${diagnosticData.whenHappened}

VALORES DA CAUSA:
- Dano Material: R$ ${diagnosticData.materialDamage}
- Dano Moral: R$ ${diagnosticData.moralDamage}
- Valor Total Estimado: R$ ${diagnosticData.estimatedValue}
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

    // Função auxiliar para limpar e converter valores monetários
    const parseCurrency = (val: any): number => {
      if (!val) return 0
      if (typeof val === 'number') return val
      const clean = String(val)
        .replace(/R\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
      return parseFloat(clean) || 0
    }

    const valorTotal = parseCurrency(diagnosticData.estimatedValue || diagnosticData.valor_causa || 0)

    if (isRefining && demandId) {
      const { error: updateError } = await adminApi
        .from('justice_demands')
        .update({
          tipo_acao: parsedData.tipo_acao,
          valor_causa: valorTotal,
          score_risco: parsedData.score,
          metadata: {
             ...diagnosticData,
             petition_content: parsedData.petition,
             auditoria: parsedData.auditoria,
             refined_at: new Date().toISOString()
          }
        } as any)
        .eq('id', demandId)

      if (updateError) throw updateError
      return NextResponse.json({ success: true, demandId })
    } else {
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
