'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card } from '@/components/shared/Card'
import { Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/shared/Button'

export default function PessoasPage() {
  return (
    <DashboardLayout>
      <PageContainer
        title="GESTÃO DE PESSOAS"
        subtitle="Automação de contratos PJ/MEI e fiscalidade da folha."
        action={
          <Button className="shadow-lg shadow-primary/20">
            <UserPlus className="w-4 h-4 mr-2" /> Novo Contratado
          </Button>
        }
      >

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-dashed border-primary/20 flex flex-col items-center justify-center py-20 text-center">
            <Users size={48} className="text-primary/20 mb-4" />
            <p className="text-slate-500 font-medium">Nenhum prestador ou colaborador cadastrado.</p>
            <Button variant="link" className="mt-2 text-primary">Gerenciar fiscalidade da folha</Button>
          </Card>
        </div>
      </PageContainer>
    </DashboardLayout>
  )
}
