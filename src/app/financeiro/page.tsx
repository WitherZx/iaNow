'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'

export default function Page() {
  return (
    <DashboardLayout>
      <PageContainer title='FINANCEIRO' subtitle='Página em desenvolvimento.'>
        <div className='p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-center'>
          Módulo financeiro em breve.
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
