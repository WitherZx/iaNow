import { NextResponse } from 'next/server'
import { DataJudService } from '@/lib/services/datajud'
import { createJusticeDemandAction } from '@/app/actions/justice-actions'

export async function POST(req: Request) {
  try {
    const { documentNumber } = await req.json()
    
    if (!documentNumber) {
      return NextResponse.json({ error: 'Número do documento ou processo é obrigatório' }, { status: 400 })
    }

    const info = await DataJudService.getProcessInfo(documentNumber)
    
    const demandData = {
      tipo_acao: 'Acompanhamento Estratégico',
      status: 'ready',
      metadata: {
        process_number: info.number,
        court: info.court,
        last_status: info.status
      }
    }
    const createRes = await createJusticeDemandAction(demandData)

    return NextResponse.json({ 
       success: true, 
       process: info,
       id: createRes.data?.id
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
