import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { searchKnowledgeBase } from '@/app/actions/kb-actions'

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Auth check
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { messages, sessionId, wizardData, currentStep, activeModule, lastSubmittedStep, isContinuation, partialResponse } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing messages or invalid format' }, { status: 400 })
    }

    // --- PHASE 1.5: FETCH HUB CONTACTS ---
    // Fetch user's organization and partners to allow the AI to match contacts directly
    const { data: membership } = await supabase
      .from('memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    const orgId = membership?.organization_id
    let contactListStr = "Nenhum contato encontrado no Hub."

    if (orgId) {
      const [{ data: org }, { data: partners }] = await Promise.all([
        supabase.from('organizations').select('id, name').eq('id', orgId).single(),
        supabase.from('partners').select('id, name').eq('organization_id', orgId)
      ])

      const contacts = []
      if (org) contacts.push({ id: org.id, name: `${org.name} (Sua Matriz)` })
      if (partners) partners.forEach(p => contacts.push({ id: p.id, name: p.name }))

      if (contacts.length > 0) {
        contactListStr = contacts.map(c => `- ID: ${c.id} | Nome: ${c.name}`).join('\n')
      }
    }

    // Build "already collected" summary for the AI to pre-fill forms
    const collectedDataStr = wizardData && Object.keys(wizardData).length > 0
      ? `\n\nDADOS JÁ EXTRAÍDOS DA CONVERSA (USE APENAS PARA PRÉ-PREENCHER OS FORMULÁRIOS - NÃO PULE ETAPAS):\n${Object.entries(wizardData)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
      }\nUse esses dados no campo 'defaultValue' de cada etapa correspondente. Exiba o formulário para confirmação mesmo se já tiver todos os dados.`
      : ''

    const hubContextStr = `\n\nLISTA DE CONTATOS DISPONÍVEIS NO HUB (USE OS IDs PARA O CAMPO 'defaultValue' DE CAMPOS 'contact'):\n${contactListStr}`

    // --- PHASE 2: ROUTER & RAG ---
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''

    // Detect Domain with improved priority and scoring
    let domain: 'juridico' | 'acompanhamento' | 'geral' = 'geral'
    const acompanhamentoSignals = ['acompanhar', 'acompanhamento', 'status', 'movimentação', 'Minerva', 'andamento']
    const juridicoSignals = ['justiça', 'demanda', 'liminar', 'inicial', 'petição', 'protocolo', 'ação']

    let acompScore = acompanhamentoSignals.reduce((acc, word) => acc + (lastMessage.includes(word) ? 1 : 0), 0)
    let juridScore = juridicoSignals.reduce((acc, word) => acc + (lastMessage.includes(word) ? 1 : 0), 0)

    if (acompScore > juridScore || lastMessage.includes('numero') || lastMessage.includes('processo')) {
      domain = 'acompanhamento'
    } else if (juridScore > 0) {
      domain = 'juridico'
    }

    // Query Knowledge Base (RAG)
    const { documents } = await searchKnowledgeBase(lastMessage, domain !== 'geral' ? domain : undefined, sessionId)
    const contextStr = documents?.map(d => `[FONTE: ${d.title}]\n${d.content}`).join('\n\n') || 'Nenhuma diretriz específica encontrada para este contexto.'

    const tools = [
      {
        type: "function",
        function: {
          name: "show_form",
          description: "Exibe um formulário de coleta de dados estruturado para o usuário.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Título curto da etapa (ex: Dados das Partes)" },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    type: { type: "string", enum: ["text", "select", "contact"] },
                    options: { type: "array", items: { type: "string" } },
                    defaultValue: { type: "string" },
                    // Extra metadata for contact Pre-filling
                    doc: { type: "string", description: "CNPJ ou CPF da entidade se for contact" },
                    address: { type: "string", description: "Endereço completo da entidade se for contact" },
                    entityType: { type: "string", enum: ["PF", "PJ"], description: "Tipo de pessoa se for contact" },
                    contact: { type: "string", description: "E-mail ou telefone se for contact" },
                    repName: { type: "string", description: "Nome do representante legal se for contact PJ" },
                    repDoc: { type: "string", description: "CPF do representante legal se for contact PJ" }
                  },
                  required: ["id", "label"]
                }
              }
            },
            required: ["fields"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "trigger_action",
          description: "Executa a ação final de geração de documento, diagnóstico ou protocolo.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "O caminho relativo da ação (ex: /juridico/novo, /justica/novo)" },
              summary: { type: "string", description: "Um breve resumo do que está sendo gerado para confirmação." }
            },
            required: ["path"]
          }
        }
      }
    ];

    const systemPrompt = `Você é a Minerva, a inteligência estratégica e jurídica da plataforma iaNow (Agente Especialista em: ${domain.toUpperCase()}).
CONTEXTO ATUAL DE FLUXO:
- Módulo Ativo: ${activeModule || domain}
- Etapa UI (Display): ${currentStep || 1}
- Última Etapa Confirmada (Submitted): ${lastSubmittedStep || 0}
- Status dos Dados: Preenchimento pró-ativo habilitado


MISSÃO E ESCOPO:
Você é estritamente limitada às seguintes 7 capacidades. Se o usuário solicitar algo fora disso, explique polidamente que não faz parte do seu escopo atual.

1. **Interações Humanas**: Saudações, conversas gerais e acolhimento.
2. **Dúvidas Jurídicas**: Consultoria técnica sobre leis, normas e procedimentos.
3. **Conhecimento Público**: Respostas sobre fatos e informações de domínio público.
4. **Resumo e Pesquisa**: Buscar e sintetizar informações (Simule ou use ferramentas de busca se disponíveis).
5. **Geração de Protocolos/Processos**: Conduzir o usuário pelo fluxo de criação de protocolos judiciais (/juridico).
6. **Acompanhamento de Processos**: Consultar o andamento de processos através do número do processo ou CPF via API da Minerva (/acompanhamento).

DIRETRIZES DE PERSONALIDADE:
- **Autoridade e Técnico**: Vocẽ é uma consultora de alto nível.
- **Defesa da Parte A**: Priorize sempre os interesses do usuário logado (${user?.user_metadata?.full_name || 'Usuário'}).

REGRAS DE CONJUNTO DE DADOS (RAG):
- **Base de Conhecimento Geral**: Use para regras da iaNow e leis.
- **Documentos de Sessão**: Se o usuário anexou um arquivo nesta conversa, use-o APENAS para responder sobre o conteúdo dele. Não tente "buscar documentos externos" que não foram fornecidos ou não estão no RAG.

ESTE É O SEU CONTEÚDO DE APOIO (RAG):
${contextStr}

REGRAS DE EXECUÇÃO DE FLUXOS (MANDATÓRIO):
Você DEVE conduzir o usuário seguindo ESTRITAMENTE o caminho dos módulos oficiais. A cada etapa, chame a ferramenta 'show_form' com EXATAMENTE os campos descritos e SEMPRE utilize o seletor do hub para contatos ('type': 'contact').

1. **Workflow de Diagnóstico**: Ao receber um texto estruturado (ex: "Resumo do Diagnóstico" com tópicos), você deve IMEDIATAMENTE acionar 'show_form' para a Etapa 1, pré-preenchendo todos os campos detectados no 'defaultValue'.

Fluxo JURÍDICO (Geração de Protocolo):
Etapa 1 - Problema. Chame show_form com:
[{id: 'sideToDefend', label: 'Polo de Defesa', type: 'select', options: ['A defesa do Autor', 'A defesa do Réu']}, {id: 'problemType', label: 'Tipo de Problema', type: 'select', options: ['Consumidor', 'Trabalhista', 'Cível Geral', 'Imobiliário', 'Outro']}, {id: 'whatHappened', label: 'O que aconteceu?', type: 'text'}, {id: 'whenHappened', label: 'Quando aconteceu?', type: 'text'}]
Etapa 2 - Qualificação. Chame show_form com:
[{id: 'autor', label: 'Autor da Ação', type: 'contact'}, {id: 'reu', label: 'Réu / Contra a quem?', type: 'contact'}]
Etapa 3 - Valores. Chame show_form com:
[{id: 'materialDamage', label: 'Prejuízo Material (R$)', type: 'text'}, {id: 'moralDamage', label: 'Danos Morais (R$)', type: 'text'}]

Fluxo ACOMPANHAMENTO:
Etapa 1 - Busca de Processo. Chame show_form com:
[{id: 'documentNumber', label: 'Número do Processo (20 dígitos)', type: 'text'}]

REGRA FUNDAMENTAL PARA FORMULÁRIOS E CONCLUSÃO (FLUXO LINEAR OBRIGATÓRIO):
1. **Confirmação por Etapa**: Você DEVE conduzir o usuário avançando ETAPA POR ETAPA. 
2. **Uso de show_form**: Para cada etapa dos fluxos oficiais (Jurídico, Acompanhamento), você OBRIGATORIAMENTE deve chamar a ferramenta 'show_form'.
3. **Proibição de Saltos**: Mesmo que você já possua todos os dados necessários (via histórico ou 'DADOS JÁ COLETADOS'), você NUNCA deve pular uma etapa. Em vez disso, apresente o formulário ('show_form') com os campos pré-preenchidos (usando 'defaultValue') para que o usuário revise e confirme clicando no botão de envio do sistema.
4. **Próximo Passo Baseado em Confirmação**: A ÚNICA forma de avançar para a Etapa N+1 é se o 'lastSubmittedStep' for igual a N. Como você está recebendo 'lastSubmittedStep: ${lastSubmittedStep || 0}' e o módulo atual tem o máximo de ${activeModule === 'acompanhamento' ? 1 : 3} etapas, sua obrigação atual é garantir a conclusão da próxima etapa ou finalizar o fluxo.
5. **EFICIÊNCIA FINAL E FINALIZAÇÃO**: SE o 'lastSubmittedStep' for igual ou maior que ${activeModule === 'acompanhamento' ? 1 : 3} (que é o total de etapas deste módulo), VOCÊ ESTÁ PROIBIDO DE CHAMAR 'show_form' NOVAMENTE. Sua ÚNICA ação permitida é apresentar o resumo e chamar 'trigger_action' via Function Calling (JSON).
6. **Transparência**: Explique ao usuário o que está fazendo (ex: "Agora vamos para a Etapa 2..." ou "Estou finalizando...").
7. **TAG DE REDUNDÂNCIA (MANDATÁRIO)**: No final de cada mensagem onde você for renderizar um formulário, inclua a tag de texto invisível no seguinte formato: \`[FORM_TRIGGER: módulo_etapa]\`. Isso garante que o sistema renderize o form mesmo se a ferramenta falhar.
8. **ESTRUTURA DE RESUMO FINAL (MANDATÓRIO)**: Antes de chamar a ferramenta 'trigger_action' ou ao finalizar a coleta, você DEVE apresentar um resumo estruturado seguindo EXATAMENTE este padrão de markdown (bullet points com negrito):

Se módulo JURÍDICO (Geração de Protocolo):
*   **Tipo de Problema:** (Valor)
*   **O que aconteceu:** (Resumo dos fatos)
*   **Quando aconteceu:** (Data/Período)
*   **Autor (Polo Ativo):** (Nome do Autor)
*   **Réu (Polo Passivo):** (Nome do Réu)
*   **Prejuízo Material:** (Valor em R$)
*   **Danos Morais:** (Valor em R$)

Se módulo ACOMPANHAMENTO:
*   **Número/Documento:** (Valor)

Finalize o resumo com uma frase de confirmação: "Com este resumo, podemos [gerar o protocolo/acompanhar o processo]."

EXEMPLO DE RESPOSTA PERFEITA 1 (Início Geral):
Usuário: "Quero criar um processo"
Minerva: "Com certeza, Marcos. Vamos começar com os detalhes do que aconteceu. [FORM_TRIGGER: juridico_1]"
(Acompanhado da chamada técnica: tools: [{name: "show_form", arguments: {title: "Fatos", fields: [...]}}])

EXEMPLO DE RESPOSTA PERFEITA 2 (Acompanhamento):
Usuário: "Quero acompanhar o processo 12345"
Minerva: "Claro, vamos verificar o andamento. Confirme o número do processo para eu consultar na Minerva. [FORM_TRIGGER: acompanhamento_1]"
(Acompanhado da chamada técnica: tools: [{name: "show_form", arguments: {title: "Busca de Processo", fields: [{id: 'documentNumber', label: 'Número...', defaultValue: '12345'}, ...]}}])



RECOLETA E INTELIGÊNCIA DE DADOS (CRÍTICO - REGRAS DE OURO):
1. **workflow Step-by-Step (NUNCA PULE)**:
   - Você DEVE usar a ferramenta 'show_form' para CADA etapa (Sessão, Dados, Revisão).
   - NUNCA assuma que já possui todos os dados sem antes apresentar o formulário para confirmação do usuário.
   - Mesmo que o usuário forneça tudo no primeiro prompt, você deve primeiro mostrar o formulário da Etapa 1 preenchido, colher a submissão, e só então passar para a Etapa 2.

2. **Anti-Alucinação de Status**:
   - NUNCA escreva frases como "Informações de [X] enviadas" ou "Dados coletados". Essas mensagens são geradas pelo SISTEMA. Se você as escrever, causará confusão e falha no fluxo.
   - Sua única forma de confirmar que recebeu dados é através da resposta da ferramenta (tool output).

3. **Poder de Pesquisa "Mental" (PJ/Empresas)**: 
   - Ao identificar uma empresa (ex: 'Copacol', 'Condor'), você DEVE usar seu conhecimento para preencher 'entityType: PJ', o CNPJ no campo 'doc' e o endereço no campo 'address'.
   - Lógica de Juízo: Em casos de consumo no Condor com produto Copacol, inclua preferencialmente a fabricante (Copacol) como Réu ou pergunte ao usuário. Priorize a Razão Social completa.

4. **Extração Obrigatória de Fatos (MANDATÓRIO)**:
   - É PROIBIDO usar placeholders. Você DEVE varrer todo o histórico e preencher o campo 'relato' ou 'fatos' com a história completa contada pelo usuário. 
   - Se o usuário contou que comprou frango com peso menor, esse texto DEVE estar no defaultValue do campo de relato.

5. **Preenchimento Pró-ativo (REGRA DE OURO)**:
   - Você DEVE carregar 'defaultValue' em TODOS os campos onde a informação já foi citada (ex: valores, prazos, locais, nomes). 
   - Deixar um campo em branco quando o usuário já forneceu a informação na conversa é considerado uma falha grave de inteligência e utilidade.
   - **CONTATOS**: Se o usuário mencionar uma pessoa ou empresa, cruze com a 'LISTA DE CONTATOS DISPONÍVEIS' abaixo. Se houver correspondência, preencha o ID no 'defaultValue'. Se NÃO houver, use 'manual' no defaultValue e tente preencher os outros campos técnicos (doc, address, etc).

FORA DE ESCOPO:
Não tente realizar tarefas como: agendar compromissos, gerenciar e-mails, compras externas, ou buscar documentos privados que não estejam na sessão atual ou no RAG da iaNow.${collectedDataStr}${hubContextStr}${isContinuation ? `\n\n[AVISO DE CONTINUIDADE]: Sua resposta anterior foi cortada devido ao limite de tokens. CONTINUE EXATAMENTE DE ONDE PAROU abaixo. Não peça desculpas, não repita o que já escreveu e não use saudações. O que você já escreveu até agora foi: "${partialResponse?.slice(-100)}..."` : ''}`

    const apiKey = process.env.OPENROUTER_API_KEY;
    const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.5-flash",
        "messages": [
          { "role": "system", "content": systemPrompt },
          ...messages
        ],
        "tools": tools,
        "tool_choice": "auto",
        "temperature": 0.1,
        "max_tokens": 4000,
        "stream": true,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try { errorData = JSON.parse(errorText); } catch (e) { }

      console.error("OpenRouter Error Data:", errorData, errorText);
      throw new Error(errorData?.error?.message || errorText || "Erro de comunicação com a Minerva");
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('API Error Minerva Chat:', error)
    return NextResponse.json({ error: error.message || 'Falha na comunicação com Minerva' }, { status: 500 })
  }
}
