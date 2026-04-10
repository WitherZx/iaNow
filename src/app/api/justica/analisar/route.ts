import { NextResponse } from 'next/server'
import { askAI } from '@/lib/openrouter'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { processData, petitionContent, documentList } = body

    if (!processData) {
      return NextResponse.json({ error: 'Missing process data' }, { status: 400 })
    }

    const systemPrompt = `Você é a Minerva, a inteligência jurídica da plataforma iaNow.
Sua especialidade é análise estratégica de processos judiciais, inspirada na sabedoria e justiça da deusa Minerva.

OBJETIVO:
Analisar os dados, movimentações e o CONTEÚDO DOS DOCUMENTOS de um processo judicial.
Você deve fornecer insights estratégicos, claros e autoritativos. 

⚠️ IMPORTANTE: 
Se o conteúdo da petição ('petitionContent') estiver PRESENTE, sua análise deve cruzar o que foi pedido na inicial com o que está acontecendo na linha do tempo.
Se o 'petitionContent' estiver AUSENTE, você deve avisar no campo "resumo" que a análise é parcial pois não teve acesso aos documentos fundamentais.

DADOS DO PROCESSO:
Número: ${processData.number}
Status: ${processData.status}
Tribunal: ${processData.court}
Movimentações: ${JSON.stringify(processData.movements)}

CONTEXTO ADICIONAL:
Documentos Encontrados: ${JSON.stringify(documentList || [])}
Conteúdo da Petição Inicial: ${petitionContent ? petitionContent.slice(0, 5000) : 'NÃO DISPONÍVEL'}

FORMATO DE RESPOSTA (JSON estrito, sem markdown):
{
  "resumo": "Breve parágrafo resumindo a situação atual do processo. Mencione se a análise foi baseada em documentos reais ou apenas metadados.",
  "traducao_leigo": "Explicação detalhada e simples para uma pessoa comum entender exatamente o que está acontecendo e o que as últimas movimentações significam na prática.",
  "insights": ["Insight estratégico 1", "Insight estratégico 2", "Insight estratégico 3"],
  "proximos_passos": ["Ação recomendada 1", "Ação recomendada 2"],
  "alerta_risco": "Se houver algum risco imediato (prazos, decisões desfavoráveis), destaque aqui. Se não houver risco, retorne null."
}`

    const userPrompt = `Analise as movimentações recentes deste processo e forneça sua orientação estratégica como Minerva.`

    const aiResponse = await askAI(userPrompt, systemPrompt)
    let rawResponse = aiResponse.content.trim()
    
    // Cleanup JSON if AI wraps it in markdown
    if (rawResponse.includes('```json')) {
      rawResponse = rawResponse.split('```json')[1].split('```')[0].trim()
    } else if (rawResponse.startsWith('```')) {
      rawResponse = rawResponse.replace(/^```/, '').replace(/```$/, '').trim()
    }

    const analysis = JSON.parse(rawResponse)
    return NextResponse.json(analysis)

  } catch (error: any) {
    console.error('API Error Process Analysis:', error)
    return NextResponse.json({ error: 'Falha na análise da Minerva' }, { status: 500 })
  }
}
