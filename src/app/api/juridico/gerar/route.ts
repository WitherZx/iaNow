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
      return NextResponse.json({ error: 'Erro ao buscar organização do usuário' }, { status: 500 })
    }

    let orgId = membership?.organization_id
    let userId = user?.id

    if (!orgId) {
      if (!user) {
        // Guest Mode: Assign to the first available organization as sandbox
        const { data: sandbox } = await adminClient.from('organizations').select('id').limit(1).single() as any
        orgId = sandbox?.id

        if (orgId) {
          // Fallback user_id: Pegar um admin da organização para persistir o documento sem violar o NOT NULL
          const { data: adminMember } = await adminClient
            .from('memberships')
            .select('user_id')
            .eq('organization_id', orgId)
            .limit(1)
            .single() as any
          userId = adminMember?.user_id
        }
      }
      
      if (!orgId) {
         return NextResponse.json({ error: 'Sua conta não possui uma organização vinculada. Complete o onboarding.' }, { status: 400 })
      }
    }

    const body = await req.json()
    const { 
      tipoContrato, nivel, perfilPartes, objetivo, foro, partyA, partyB, parametros,
      documentId, refineContent, prompt,
      skipAudit // NOVO: Flag para não atualizar o audit
    } = body

    // --- MODO REFINAMENTO ---
    if (documentId && refineContent && prompt) {
        // Se skipAudit for true, pedimos para a IA manter o tom mas não focamos tanto na estrutura JSON completa de auditoria se quisermos economizar,
        // mas o mais seguro é pedir o JSON e simplesmente não salvar o 'audit' no banco.
        
        const systemPrompt = `Você é um editor jurídico sênior brasileiro. Sua tarefa é aplicar ALTERAÇÕES em um contrato existente com base nas instruções do usuário.
        
        CONTRATO ATUAL:
        ${refineContent}
        
        REGRAS:
        1. Mantanha o tom formal e a validade jurídica brasileira.
        2. Retorne o contrato COMPLETO com as alterações aplicadas.
        3. ${skipAudit ? 'Não se preocupe com uma nova auditoria detalhada agora.' : 'Forneça uma nova auditoria de risco baseada no texto alterado.'}
        4. PROIBIDO fornecer qualquer bloco de assinatura ao final do documento. Não inclua linhas para assinatura, nomes das partes para rubricar ou campos como "[Local], [Data]". O documento deve encerrar na última cláusula, pois a assinatura será feita via plataforma digital externa.
        
        FORMATO DE SAÍDA (JSON):
        {
          "contract": "Texto completo do contrato em Markdown",
          "audit": {
             "score": ${skipAudit ? '0' : '0 a 100'},
             "risk_level": "baixo" | "médio" | "alto",
             "suggestions": []
          }
        }`

        const userPrompt = `INSTRUÇÕES DE AJUSTE: ${prompt}. Gere o novo JSON completo.`

        // Aguarda a IA
        const aiResponse = await askAI(userPrompt, systemPrompt)
        let rawResponse = aiResponse.content.trim()
        if (rawResponse.includes('```json')) rawResponse = rawResponse.split('```json')[1].split('```')[0].trim()
        else if (rawResponse.startsWith('```')) rawResponse = rawResponse.replace(/^```/, '').replace(/```$/, '').trim()

        let parsedData: { contract: string; audit: any }
        try {
          parsedData = JSON.parse(rawResponse)
        } catch (e) {
          parsedData = { contract: rawResponse, audit: { score: 70, risk_level: 'médio', suggestions: [] } }
        }

        const adminApi = adminClient as any
        
        // BUSCAR O DOCUMENTO ATUAL PARA NAO PERDER METADATA
        const { data: currentDoc } = await adminApi.from('generated_documents').select('metadata').eq('id', documentId).single();
        
        // CONSTRUIR O UPDATE
        const updateData: any = {
          content: parsedData.contract.trim(),
        }
        
        // SÓ ATUALIZA O AUDIT SE NÃO FOR 'skipAudit'
        if (!skipAudit) {
           updateData.metadata = {
              ...(currentDoc?.metadata || {}), // preserva os metadados MANTENDO O GUEST_ID, parties, etc
              ...body, // adiciona os do body
              audit: parsedData.audit,
              refinedAt: new Date().toISOString(),
           }
           
           if (!currentDoc?.metadata?.guest_id && guestId) {
             updateData.metadata.guest_id = guestId;
           }
        }

        await adminApi.from('generated_documents').update(updateData).eq('id', documentId)

        return NextResponse.json({ 
          success: true, 
          content: parsedData.contract, 
          audit: skipAudit ? null : parsedData.audit 
        })
    }

    // --- MODO GERAÇÃO INICIAL ---
    if (!tipoContrato || !foro) {
      return NextResponse.json({ error: 'Missing document info' }, { status: 400 })
    }

    const systemPrompt = `Você é um especialista jurídico brasileiro com foco em contratos empresariais, LGPD e direito societário.

Sua função é gerar documentos jurídicos completos, claros, válidos no Brasil e adaptados ao contexto fornecido pelo usuário.

Siga rigorosamente as instruções abaixo:

1. CONTEXTO
* Tipo de contrato: {{tipo_contrato}}
* Nível de complexidade: {{nivel}}
* Perfil das partes: {{perfil_partes}}
* Objetivo do contrato: {{objetivo}}

2. DADOS DAS PARTES
   {{partes}}

3. PARÂMETROS DO CONTRATO
   {{parametros}}

4. REGRAS DE GERAÇÃO E ESTRUTURAÇÃO
* Utilize linguagem jurídica clara e profissional
* PROIBIDO uso de emojis, ícones ou qualquer caractere decorativo. Apenas formatação de texto puro (Markdown).
* Estruture o contrato com cláusulas numeradas
* Adapte o nível de detalhamento conforme o nível escolhido.
* MANDATÓRIO: O contrato foi solicitado e será emitido pela PARTE A. Portanto, a minuta deve IMPRETERIVELMENTE ser elaborada DE FORMA FAVORÁVEL À PARTE A. Maximize a proteção jurídica da Parte A, reduza suas responsabilidades sempre que possível, e aplique garantias, exigências e penalidades mais rígidas sobre a Parte B.
* Inclua obrigatoriamente:
  * Objeto do contrato
  * Obrigações das partes (Favorecendo e protegendo a atuação da Parte A)
  * Valores e pagamentos (se aplicável, com forte regramento contra inadimplência por parte de B)
  * Prazo e vigência
  * Rescisão (condicionada para dificultar a saída imotivada da Parte B)
  * Penalidades (focadas em garantir a execução por Parte B)
  * Confidencialidade (quando relevante)
  * Proteção de dados (LGPD, se houver dados pessoais)
  * Foro
* PROIBIDO incluir blocos de assinatura ao final do documento. Não coloque linhas pontilhadas, campos de data (ex: "[Local], [Data]") ou espaços para nomes dos contratantes assinarem. O contrato deve terminar logo após a última cláusula, pois a assinatura ocorrerá em plataforma digital externa separada.
* Sempre que houver risco jurídico relevante, inclua cláusulas de proteção adicionais em benefício da Parte A automaticamente.
* Nunca invente informações não fornecidas se forem cruciais. Quando faltar informação crítica, faça suposições genéricas seguras (ex: "valor a ser definido entre as partes").

5. PERSONALIZAÇÃO INTELIGENTE
* Se for contrato de prestação de serviços: incluir cláusula de escopo e limitação de responsabilidade
* Se envolver dados pessoais: incluir cláusulas de LGPD
* Se houver pagamento recorrente: incluir regras de inadimplência e suspensão
* Se houver mais de um sócio: incluir regras de governança e saída

6. FORMATO DE SAÍDA (OBRIGATÓRIO)
* Retorne APENAS um objeto JSON válido.
* Não inclua blocos de código markdown ou texto explicativo fora do JSON.
* A estrutura deve ser rigorosamente:
{
  "contract": "O texto completo do contrato em Markdown",
  "audit": {
    "score": 0 a 100 (número inteiro refletindo a robustez),
    "risk_level": "baixo" | "médio" | "alto",
    "critical_clauses": [
       { "name": "Nome da Cláusula", "present": true/false, "strength": "low" | "medium" | "high", "note": "Breve justificativa" }
    ],
    "missing_details": ["Lista de dados que ficaram vagos ou faltaram"],
    "suggestions": ["3 a 5 sugestões rápidas para o usuário melhorar o contrato"]
  }
}
* Linguagem formal jurídica brasileira.
* Use escape de aspas e quebras de linha corretas para o JSON no campo 'contract'.`

    const partesStr = `PARTE A (${partyA?.role || 'Polo Ativo'}):
Nome/Razão Social: ${partyA?.name || 'Não informado'}
Documento: ${partyA?.document || 'Não informado'} ${partyA?.rg ? `| RG/IE: ${partyA.rg}` : ''}
Ficha: ${[partyA?.nationality, partyA?.maritalStatus, partyA?.profession].filter(Boolean).join(', ') || 'Informações básicas não detalhadas'} ${partyA?.birthDate ? `| Nasc: ${partyA.birthDate}` : ''}
Endereço: ${partyA?.address || 'Não informado'}

PARTE B (${partyB?.role || 'Polo Passivo'}):
Nome/Razão Social: ${partyB?.name || 'Não informado'}
Documento: ${partyB?.document || 'Não informado'} ${partyB?.rg ? `| RG/IE: ${partyB.rg}` : ''}
Ficha: ${[partyB?.nationality, partyB?.maritalStatus, partyB?.profession].filter(Boolean).join(', ') || 'Informações básicas não detalhadas'} ${partyB?.birthDate ? `| Nasc: ${partyB.birthDate}` : ''}
Endereço: ${partyB?.address || 'Não informado'}`

    const aiPrompt = `POR FAVOR, GERE O DOCUMENTO ABAIXO COM BASE NOS DADOS INJETADOS NO SEU PADRÃO:

CONTEXTO PREENCHIDO
Tipo de contrato: ${tipoContrato}
Nível de complexidade: ${nivel}
Perfil das partes: ${perfilPartes}
Objetivo do contrato: ${objetivo}
Foro de Eleição: ${foro}

DADOS DAS PARTES E QUALIFICAÇÃO
${partesStr}

PARÂMETROS E CLÁUSULAS ADICIONAIS / CONTEXTO:
${parametros || 'Nenhum contexto de cláusula específica extra informada.'}`

    const aiModel = 'Minerva'

    console.log('[JuridicoGerar] Process starting...', { userId, guestId, orgId })

    // 1. INSERTS PLACEHOLDER FIRST for immediate visibility
    const { data: document, error: docError } = await adminClient
      .from('generated_documents')
      .insert({
        organization_id: orgId,
        created_by: userId || null,
        title: `${tipoContrato}`,
        document_type: 'custom',
        ai_model: aiModel,
        status: 'generating',
        metadata: { 
          ...body,
          guest_id: guestId,
          is_guest: !user
        }
      } as any)
      .select().single() as any

    if (docError) {
      console.error('[JuridicoGerar] INSERT ERROR:', docError)
      throw docError
    }

    console.log('[JuridicoGerar] Document placeholder created successfully:', document.id)

    try {
      const aiResponse = await askAI(aiPrompt, systemPrompt)
      let rawResponse = aiResponse.content.trim()
      if (rawResponse.includes('```json')) rawResponse = rawResponse.split('```json')[1].split('```')[0].trim()
      else if (rawResponse.startsWith('```')) rawResponse = rawResponse.replace(/^```/, '').replace(/```$/, '').trim()

      let parsedData: any
      try {
        parsedData = JSON.parse(rawResponse)
      } catch (e) {
        parsedData = { 
          contract: rawResponse, 
          audit: { risk_level: 'médio', points: [] } 
        }
      }

      const adminApi = adminClient as any
      try {
        console.log(`[JuridicoGerar] AI Generation finished. Updating doc ${document.id}...`)
        const { error: updateError } = await adminApi.from('generated_documents').update({
          content: parsedData.contract.trim(),
          status: 'ready',
          metadata: {
            ...document.metadata,
            audit: parsedData.audit || parsedData.auditoria || null,
            title: parsedData.title || document.title,
            updated_at: new Date().toISOString()
          }
        }).eq('id', document.id)

        if (updateError) {
          console.error('[JuridicoGerar] UPDATE ERROR:', updateError)
          throw updateError
        }
        console.log('[JuridicoGerar] Document updated successfully to READY.')
      } catch (dbErr) {
        console.error('[JuridicoGerar] Catch block - DB Update Error:', dbErr)
      }

      if (user) {
        await adminApi.from('activity_logs').insert({
          organization_id: orgId,
          user_id: user.id,
          resource_type: 'juridico',
          resource_id: document.id,
          action: 'create',
          description: `Gerou documento jurídico: ${tipoContrato}`
        })
      }

      return NextResponse.json({ 
        success: true, 
        documentId: document.id,
        status: 'ready'
      })
    } catch (e: unknown) {
      console.error('AI Generation Error:', e)
      const adminApi = adminClient as any
      await adminApi.from('generated_documents').update({
        status: 'failed',
        content: 'Falha na geração do documento pelo motor IA.'
      }).eq('id', document.id)
      
      const detail = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e)
      return NextResponse.json(
        { error: 'Falha na geração do documento pelo motor IA.', detail },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('API Error Juridico:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
