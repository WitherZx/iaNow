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

    // Build "already collected" summary for the AI to pre-fill forms
    const collectedDataStr = wizardData && Object.keys(wizardData).length > 0
      ? `\n\nDADOS JÁ EXTRAÍDOS DA CONVERSA (USE APENAS PARA PRÉ-PREENCHER OS FORMULÁRIOS - NÃO PULE ETAPAS):\n${
          Object.entries(wizardData)
            .filter(([, v]) => v && String(v).trim())
            .map(([k, v]) => `- ${k}: ${v}`)
            .join('\n')
        }\nUse esses dados no campo 'defaultValue' de cada etapa correspondente. Exiba o formulário para confirmação mesmo se já tiver todos os dados.`
      : ''

    // --- PHASE 2: ROUTER & RAG ---
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''
    
    // Detect Domain with improved priority and scoring
    let domain: 'juridico' | 'estrategia' | 'geral' = 'geral'
    const strategySignals = ['diagnóstico', 'estratégia', 'lucro', 'negócio', 'faturamento', 'equipe', 'vendas', 'empresa', 'b2b', 'b2c', 'crescimento']
    const juridicoSignals = ['contrato', 'justiça', 'processo', 'jurídico', 'comarca', 'foro', 'demanda', 'liminar']
    
    let stratScore = strategySignals.reduce((acc, word) => acc + (lastMessage.includes(word) ? 1 : 0), 0)
    let juridScore = juridicoSignals.reduce((acc, word) => acc + (lastMessage.includes(word) ? 1 : 0), 0)

    // Diagnósticos geralmente têm muitas palavras-chave de estratégia. Se houver um mix, estratégia ganha pela densidade.
    if (stratScore > juridScore) {
      domain = 'estrategia'
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
5. **Geração de Contratos**: Conduzir o usuário pelo fluxo de criação de documentos (/juridico).
6. **Estratégia de Negócio**: Diagnósticos empresariais e planos de crescimento (/estrategia).
7. **Processos Judiciais**: Acompanhamento e análise via DataJud/Escavador (/justica).

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

Fluxo JURÍDICO (Contratos):
Etapa 1 - Contexto do Contrato. Chame show_form com:
[{id: 'tipoContrato', label: 'Tipo de Documento', type: 'text'}, {id: 'perfilPartes', label: 'Perfil das Partes', type: 'text'}, {id: 'objetivo', label: 'Objetivo do Documento', type: 'text'}, {id: 'foro', label: 'Foro / Comarca', type: 'text'}]
Etapa 2 - Qualificação das Partes. Chame show_form com:
[{id: 'parteA', label: 'Parte A (Polo Ativo)', type: 'contact'}, {id: 'parteB', label: 'Parte B (Polo Passivo)', type: 'contact'}] (Preencha defaultValue com o nome caso detectado).
Etapa 3 - Parâmetros. Chame show_form com:
[{id: 'parametros', label: 'Parâmetros Específicos', type: 'text'}]

Fluxo ESTRATÉGIA (Diagnóstico):
Etapa 1 - Contexto da Empresa. Chame show_form com:
[{id: 'companyName', label: 'Nome da Organização', type: 'text'}, {id: 'sector', label: 'Setor de Atuação', type: 'select', options: ['Tecnologia & Software', 'Serviços Jurídicos', 'Varejo & E-commerce', 'Indústria & Logística', 'Outro...']}, {id: 'offeredSolution', label: 'Solução Oferecida', type: 'text'}, {id: 'size', label: 'Tamanho da Equipe', type: 'select', options: ['1-10', '11-50', '50+']}, {id: 'revenue', label: 'Faturamento Mensal', type: 'select', options: ['Até R$ 50k', 'R$ 50k - R$ 200k', 'R$ 200k - R$ 1M', 'Acima de R$ 1M']}]
Etapa 2 - Operação. Chame show_form com:
[{id: 'businessModel', label: 'Modelo de Negócio', type: 'select', options: ['B2B', 'B2C', 'Híbrido', 'SaaS']}, {id: 'digitalLevel', label: 'Nível Digital (1-5)', type: 'select', options: ['1 - Manual', '3 - Intermediário', '5 - Transformado']}, {id: 'mainPainPoint', label: 'Maior Gargalo/Incêndio hoje', type: 'text'}]
Etapa 3 - Riscos & Blindagem. Chame show_form com:
[{id: 'legalStatus', label: 'Status Jurídico', type: 'select', options: ['Estável', 'Riscos Trabalhistas', 'Fragilidade Contratual', 'Societário']}, {id: 'financialControl', label: 'Controle Financeiro', type: 'select', options: ['ERP/Sistema', 'Planilhas', 'Sem controle']}]
Etapa 4 - Visão. Chame show_form com:
[{id: 'goals', label: 'Objetivos Principais', type: 'text'}, {id: 'growthObstacle', label: 'O que impede de dobrar hoje?', type: 'text'}]

Fluxo JUSTIÇA (Processos):
Etapa 1 - Problema. Chame show_form com:
[{id: 'tipoProblema', label: 'Tipo de Problema', type: 'select', options: ['Consumidor', 'Trabalhista', 'Cível Geral', 'Imobiliário', 'Outro']}, {id: 'relato', label: 'O que aconteceu?', type: 'text'}, {id: 'quando', label: 'Quando aconteceu?', type: 'text'}]
Etapa 2 - Qualificação. Chame show_form com:
[{id: 'autor', label: 'Autor da Ação', type: 'contact'}, {id: 'reu', label: 'Réu / Contra a quem?', type: 'contact'}]
Etapa 3 - Valores. Chame show_form com:
[{id: 'danoMaterial', label: 'Prejuízo Material (R$)', type: 'text'}, {id: 'danoMoral', label: 'Danos Morais (R$)', type: 'text'}]

REGRA FUNDAMENTAL PARA FORMULÁRIOS E CONCLUSÃO (FLUXO LINEAR OBRIGATÓRIO):
1. **Confirmação por Etapa**: Você DEVE conduzir o usuário avançando ETAPA POR ETAPA. 
2. **Uso de show_form**: Para cada etapa dos fluxos oficiais (Jurídico, Estratégia, Justiça), você OBRIGATORIAMENTE deve chamar a ferramenta 'show_form'.
3. **Proibição de Saltos**: Mesmo que você já possua todos os dados necessários (via histórico ou 'DADOS JÁ COLETADOS'), você NUNCA deve pular uma etapa. Em vez disso, apresente o formulário ('show_form') com os campos pré-preenchidos (usando 'defaultValue') para que o usuário revise e confirme clicando no botão de envio do sistema.
4. **Próximo Passo Baseado em Confirmação**: A ÚNICA forma de avançar para a Etapa N+1 é se o 'lastSubmittedStep' for igual a N. Como você está recebendo 'lastSubmittedStep: ${lastSubmittedStep || 0}', sua obrigação atual é garantir a conclusão da etapa ${Math.min((lastSubmittedStep || 0) + 1, 4)}. 
5. **EFICIÊNCIA FINAL**: A ferramenta 'trigger_action' só pode ser chamada APÓS a conclusão bem-sucedida de TODAS as etapas de coleta (quando todos os forms foram preenchidos e enviados). Na resposta final, apresente o resumo e chame 'trigger_action' via Function Calling (JSON).
6. **Transparência**: Explique ao usuário o que está fazendo (ex: "Agora vamos para a Etapa 2 para qualificar as partes...").
7. **TAG DE REDUNDÂNCIA (MANDATÁRIO)**: No final de cada mensagem onde você for renderizar um formulário, inclua a tag de texto invisível no seguinte formato: \`[FORM_TRIGGER: módulo_etapa]\`. Isso garante que o sistema renderize o form mesmo se a ferramenta falhar.

EXEMPLO DE RESPOSTA PERFEITA:
Usuário: "Quero criar um contrato de TI"
Minerva: "Com certeza, Marcos. Vamos começar com o contexto do documento. [FORM_TRIGGER: juridico_1]"
(Acompanhado da chamada técnica: tools: [{name: "show_form", arguments: {title: "Contexto", fields: [...]}}])



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

FORA DE ESCOPO:
Não tente realizar tarefas como: agendar compromissos, gerenciar e-mails, compras externas, ou buscar documentos privados que não estejam na sessão atual ou no RAG da iaNow.${collectedDataStr}${isContinuation ? `\n\n[AVISO DE CONTINUIDADE]: Sua resposta anterior foi cortada devido ao limite de tokens. CONTINUE EXATAMENTE DE ONDE PAROU abaixo. Não peça desculpas, não repita o que já escreveu e não use saudações. O que você já escreveu até agora foi: "${partialResponse?.slice(-100)}..."` : ''}`

    const apiKey = process.env.OPENROUTER_API_KEY;
    const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-001",
        "messages": [
          { "role": "system", "content": systemPrompt },
          ...messages
        ],
        "tools": tools,
        "tool_choice": "auto",
        "temperature": 0.1,
        "stream": true,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Erro de comunicação com a Minerva");
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
    return NextResponse.json({ error: 'Falha na comunicação com Minerva' }, { status: 500 })
  }
}
