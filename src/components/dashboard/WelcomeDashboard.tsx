'use client'

import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import {
  Lightbulb,
  Gavel,
  HelpCircle,
  FileText,
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface WelcomeDashboardProps {
  userName: string
  onActivateMinerva: () => void
}

export function WelcomeDashboard({ userName, onActivateMinerva }: WelcomeDashboardProps) {
  const faqSections = [
    {
      title: 'Estratégia & Operação',
      items: [
        {
          question: 'Como gerar minha primeira estratégia?',
          answer: 'Clique em "CRIAR ESTRATÉGIA" e descreva seu objetivo. Nossa IA fará um scan completo de riscos e oportunidades em segundos.'
        },
        {
          question: 'O que é o Assistente Minerva?',
          answer: 'É a nossa IA conversacional de elite (Baseada em DeepSeek R1) que te guia em tempo real por todas as funções da plataforma.'
        },
        {
          question: 'Posso editar as estratégias geradas?',
          answer: 'Com certeza. Você tem total controle para ajustar, expandir ou refinar qualquer insight gerado pela nossa inteligência.'
        }
      ]
    },
    {
      title: 'Segurança & Dados',
      items: [
        {
          question: 'Meus dados são usados para treinamento?',
          answer: 'Não. Garantimos isolamento total. Suas informações são privadas e nunca alimentam modelos de IA públicos.'
        },
        {
          question: 'É seguro gerar contratos aqui?',
          answer: 'Sim. Utilizamos templates validados juridicamente e criptografia de nível bancário (AES-256) em todos os documentos.'
        },
        {
          question: 'Como funciona a blindagem de dados?',
          answer: 'Toda interação é criptografada de ponta a ponta, com auditoria constante para garantir conformidade com a LGPD.'
        }
      ]
    },
    {
      title: 'Justiça & Processos',
      items: [
        {
          question: 'O que é Jus Postulandi?',
          answer: 'É o seu direito de ingressar na justiça sem advogado em causas de até 20 salários mínimos via Juizados Especiais.'
        },
        {
          question: 'Como a iaNow ajuda em processos?',
          answer: 'Automatizamos a redação de petições e o acompanhamento de movimentações nos tribunais (Rede DataJud).'
        },
        {
          question: 'Posso acompanhar processos externos?',
          answer: 'Sim. Basta inserir o número do processo no módulo de Justiça para que a iaNow monitore atualizações para você.'
        }
      ]
    }
  ]

  return (
    <div className="flex flex-col gap-y-12 animate-in fade-in duration-700 max-w-full overflow-x-hidden pt-4 md:pt-0">

      {/* Hero: Sidebar left + Content right */}
      <div className="flex flex-col-reverse lg:flex-row gap-20 w-full">

        {/* Left Sidebar — Professional module panel */}
        <aside className="w-full lg:w-[320px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col self-stretch">
          {/* Sidebar Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Módulos</p>
            <p className="text-sm font-semibold text-slate-700">Escolha por onde começar</p>
          </div>

          {/* Module Items */}
          <nav className="flex flex-col flex-1 divide-y divide-slate-100">
            <ModuleSidebarItem
              title="Estratégia"
              description="Planos de ação com IA sistêmica"
              icon={<Lightbulb size={19} />}
              href="/estrategia"
              color="blue"
            />
            <ModuleSidebarItem
              title="Contratos"
              description="Documentos jurídicos em segundos"
              icon={<FileText size={19} />}
              href="/juridico/novo"
              color="emerald"
            />
            <ModuleSidebarItem
              title="Processos"
              description="Jus Postulandi sem burocracia"
              icon={<Gavel size={19} />}
              href="/justica/novo"
              color="indigo"
            />
          </nav>

          {/* Sidebar Footer */}
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80">
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              💡 Todos os módulos são assistidos por IA em tempo real.
            </p>
          </div>
        </aside>

        {/* Right: Main content */}
        <div className="flex-1 flex flex-col gap-y-6 items-start text-left justify-center py-2">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
            Bem-vindo à Nova Era da Gestão
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-[3.5rem] font-black text-slate-950 leading-[1.1] tracking-tight w-full">
            Olá, <span className="text-primary">{userName}</span>.<br />
            Vamos blindar seu negócio?
          </h1>
          <p className="text-slate-500 text-base md:text-xl font-medium leading-relaxed w-full max-w-xl">
            Você ainda não possui documentos ativos. Escolha um módulo ao lado para começar ou deixe a Minerva te guiar.
          </p>

          <div className="mt-2 w-full sm:w-auto">
            <Button
              onClick={onActivateMinerva}
              className="h-auto min-h-[48px] py-3 w-full sm:w-auto px-4 sm:px-8 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] font-bold text-[13px] sm:text-base md:text-lg bg-primary hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 group whitespace-nowrap"
            >
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 sm:mr-3 text-blue-200 group-hover:rotate-12 transition-transform shrink-0" />
              <span>Conheça a Assistente Minerva</span>
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ Overlay Section */}
      <div className="pt-12 border-t border-slate-100">
        <div className="flex flex-col gap-y-12">
          <div className="flex flex-col gap-y-2 items-center text-center">
            <h2 className="text-3xl font-black text-slate-950 flex items-center gap-3">
              <HelpCircle className="text-primary" size={28} />
              Central de Ajuda & Tutoriais
            </h2>
            <p className="text-slate-500 font-medium italic">Tudo o que você precisa saber para dominar a plataforma iaNow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {faqSections.map((section, sIdx) => (
              <div key={sIdx} className="flex flex-col gap-y-6 w-full">
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-4 py-2 rounded-lg border border-primary/10 w-fit">
                  {section.title}
                </h3>
                <div className="flex flex-col gap-y-4 w-full">
                  {section.items.map((faq, fIdx) => (
                    <Card key={fIdx} className="p-4 md:p-5 bg-slate-50/50 border-slate-100 hover:border-primary/20 transition-all group w-full">
                      <h4 className="font-bold text-slate-800 text-xs md:text-sm mb-2 group-hover:text-primary transition-colors">{faq.question}</h4>
                      <p className="text-[12px] md:text-[13px] text-slate-600 leading-relaxed font-medium">{faq.answer}</p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Card className="bg-primary/5 border-primary/10 p-6 md:p-8 rounded-2xl md:rounded-3xl flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-primary/5">
              <ShieldCheck size={28} className="text-primary" />
            </div>
            <div className="flex flex-col gap-y-2 text-center md:text-left">
              <h3 className="text-base md:text-lg font-black text-slate-950 uppercase tracking-tight">Privacidade e Proteção de Dados</h3>
              <p className="text-slate-600 text-[12px] md:text-sm font-medium">Sua infraestrutura de dados é protegida por padrões bancários de segurança. Nenhum dado é utilizado para treinamento de modelos públicos.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ModuleSidebarItem({
  title,
  description,
  icon,
  href,
  color,
}: {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: 'blue' | 'emerald' | 'indigo'
}) {
  const iconColors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  }
  const hoverBg = {
    blue: 'hover:bg-blue-50/50',
    emerald: 'hover:bg-emerald-50/50',
    indigo: 'hover:bg-indigo-50/50',
  }

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-x-4 px-5 py-4 transition-all duration-200',
        hoverBg[color]
      )}
    >
      <div className={cn('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110', iconColors[color])}>
        {icon}
      </div>
      <div className="flex flex-col gap-y-0.5 flex-1 min-w-0">
        <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight group-hover:text-slate-950 transition-colors">{title}</span>
        <span className="text-[12px] text-slate-400 font-medium leading-snug truncate">{description}</span>
      </div>
      <ArrowRight size={15} className="shrink-0 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all duration-200" />
    </Link>
  )
}
