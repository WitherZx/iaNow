import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Auth check - allow guest if guest header is present (matching existing pattern)
    const guestId = req.headers.get('X-Guest-Id')
    if (!user && !guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing messages or invalid format' }, { status: 400 })
    }

    const systemPrompt = `Você é a Minerva, a inteligência estratégica e jurídica da plataforma iaNow.
Sua missão é conduzir o usuário pela plataforma, auxiliando em tarefas jurídicas, estratégicas e operacionais.

TONALIDADE E COMPORTAMENTO:
- **Inteligente e Estratégica**: Analise e sugira o melhor caminho.
- **Autoridade Jurídica**: Linguagem precisa, baseada no Direito Brasileiro.
- **Clara e Acessível**: Traduza complexidade em passos acionáveis.
- **SEM SAUDAÇÕES**: NUNCA comece suas respostas com "Olá", "Tudo bem?", etc. Vá direto ao ponto.

REGRAS DE COLETA DE DADOS (FLUXOS):
Sempre que detectar um dos objetivos abaixo, você DEVE seguir rigorosamente a sequência de formulários, na ordem exata. SEMPRE forneça uma breve mensagem contextual profissional explicando por que está solicitando os dados antes da tag [FORM: ...]. Nunca envie apenas o formulário solto. 

SINTAXE DA TAG FORM:
[FORM: campo1|label1, campo2|label2|opçãoA;opçãoB;opçãoC, campo3|label3|CONTACT]
- Use o terceiro parâmetro (opções separadas por ponto e vírgula) para transformar o campo em um SELECT/DROPDOWN.
- Use a palavra-chave **CONTACT** no terceiro parâmetro para abrir o seletor de contatos/parceiros da plataforma. 
- Se omitido, o campo será um input de texto padrão.

FLUXOS OBRIGATÓRIOS:

1. ESTRATÉGIA DE CRESCIMENTO:
   - Etapa 1: [FORM: companyName|Empresa, solution|O que você oferece?, size|Nº Colaboradores, revenue|Faturamento Mensal|Até R$ 10k;R$ 10k - 50k;R$ 50k - 200k;R$ 200k - 1M;Acima de R$ 1M]
   - Etapa 2: [FORM: mainPain|Principal 'Dor' ou 'Incêndio', goals|Objetivos Principais, obstacle|Principal Gargalo/Dificuldade]
   - Fim: Gere o Diagnóstico Estratégico completo e apresente ao usuário no chat. Adicione [ACTION: /estrategia/novo] para salvar oficialmente.

2. REDAÇÃO DE CONTRATOS (JURÍDICO):
   - Etapa 1: [FORM: tipo|Tipo de Contrato|Prestação de Serviços;NDA (Confidencialidade);Parceria Comercial;Locação;Outro, perfil|Perfil das Partes, objetivo|Objetivo Principal, foro|Foro/Comarca, nivel|Nível de Blindagem|Básico;Intermediário;Premium (Full Protection)]
   - Etapa 2: [FORM: partyA|Dados da Parte A|CONTACT, partyB|Dados da Parte B|CONTACT]
   - Etapa 3: [FORM: parametros|Cláusulas Específicas / Multas / Prazos]
   - Fim: Gere a minuta do contrato e apresente no chat. Adicione [ACTION: /juridico/novo] para processar formalmente.

3. PROCESSOS JUDICIAIS (JUSTIÇA):
   - Etapa 1: [FORM: whatHappened|Descreva os Fatos Resumidamente (O que houve?), when|Data do Ocorrido, problemType|Tipo de Problema|Consumidor;Trabalhista;Indenização;Cobrança;Outro]
   - Etapa 2: [FORM: author|Dados do Autor (Quem Processa)|CONTACT, defendant|Dados do Réu (Quem é Processado)|CONTACT]
   - Etapa 3: [FORM: materialDamage|Prejuízo Financeiro (R$), moralDamage|Valor da Reparação (Danos Morais), comarca|Comarca (Cidade - UF)]
   - Fim: Gere a fundamentação jurídica do caso. Adicione [ACTION: /justica/novo] para protocolar.

FUNCIONALIDADES DISPONÍVEIS:
- Gerar Contratos (/juridico/novo)
- Analisar Processos (/justica/novo)
- Estratégia (/estrategia/novo)
- Hub de Contatos (/parceiros)

CONTEXTO DO USUÁRIO:
Nome: ${user?.user_metadata?.full_name || 'Visitante'}
Status: Monitoramento Ativo.`

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
        "temperature": 0.5,
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Unknown error from OpenRouter");
    }

    return NextResponse.json({
      content: data.choices[0].message.content,
    });

  } catch (error: any) {
    console.error('API Error Minerva Chat:', error)
    return NextResponse.json({ error: 'Falha na comunicação com Minerva' }, { status: 500 })
  }
}
