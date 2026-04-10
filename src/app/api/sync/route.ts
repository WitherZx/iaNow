import { NextResponse } from 'next/server'
import { syncHandlers } from '@/lib/sync/actions-map'

/**
 * Relay API: Ponto de entrada para execução de mutações em background.
 * Permite que o Service Worker execute Server Actions de forma "headless"
 * mantendo a autenticação via cookies (Supabase SSR).
 */
export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json()

    if (!action) {
      return NextResponse.json({ error: 'Action name is required' }, { status: 400 })
    }

    const handler = syncHandlers[action]
    if (!handler) {
      console.warn(`[RelayAPI] Action '${action}' não mapeada no actions-map.ts`)
      return NextResponse.json({ error: `Action '${action}' não encontrada` }, { status: 404 })
    }

    // Executa a ação mapeada. 
    // Nota: Como este é um App Route, ele tem acesso aos cookies da requisição
    // para que as Server Actions chamadas internamente funcionem autenticadas.
    const result = await handler(payload)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[RelayAPI] Erro ao processar mutação:', err)
    return NextResponse.json({ 
      error: 'Erro interno no processamento do sync',
      message: err.message 
    }, { status: 500 })
  }
}
