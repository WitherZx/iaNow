'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/shared/Card'
import { Button } from '@/components/shared/Button'
import { 
  MessageSquare, 
  Send, 
  User, 
  Loader2, 
  CheckCircle2, 
  Upload, 
  Calculator,
  Gavel,
  ArrowRight,
  Plus
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { PartnerSelector } from '@/components/shared/PartnerSelector'

interface Message {
  role: 'bot' | 'user'
  content: string | React.ReactNode
  type?: 'text' | 'selector' | 'upload' | 'summary'
}

interface MinervaGuidedFormProps {
  onComplete: (data: any) => void
  initialUser?: any
}

export function MinervaGuidedForm({ onComplete, initialUser }: MinervaGuidedFormProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentStep, setCurrentStep] = useState<string>('welcome')
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [formData, setFormData] = useState({
    problemType: '',
    authorName: initialUser?.name || '',
    authorDocument: initialUser?.document || '',
    defendantName: '',
    whatHappened: '',
    whenHappened: '',
    materialDamage: '0',
    moralDamage: '0',
    evidenceFiles: [] as any[]
  })
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  useEffect(() => {
    // Initial message
    addBotMessage("Olá! Sou a Minerva. Vou te ajudar a estruturar sua petição do JEC (Pequenas Causas) de forma simples e rápida.")
    setTimeout(() => {
      addBotMessage("Para começar, me conte em poucas palavras: o que aconteceu? Qual é o seu problema hoje?")
      setCurrentStep('describe_problem')
    }, 1000)
  }, [])

  const addBotMessage = (content: string | React.ReactNode, type: Message['type'] = 'text') => {
    setIsTyping(true)
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', content, type }])
      setIsTyping(false)
    }, 800)
  }

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'user', content }])
  }

  const handleSend = () => {
    if (!inputValue.trim()) return
    const val = inputValue
    addUserMessage(val)
    setInputValue('')
    processStep(val)
  }

  const processStep = (val: string) => {
    switch (currentStep) {
      case 'describe_problem':
        setFormData(prev => ({ ...prev, whatHappened: val }))
        addBotMessage("Entendi. Isso parece ser um caso importante. Agora, quem é a pessoa ou empresa que você está processando?")
        addBotMessage(
          <div className="w-full mt-4">
            <PartnerSelector 
              label="Selecionar Réu"
              onSelect={(p) => handleDefendantSelect(p)}
              placeholder="Busque ou cadastre um réu..."
            />
          </div>,
          'selector'
        )
        setCurrentStep('select_defendant')
        break
      
      case 'ask_time':
        setFormData(prev => ({ ...prev, whenHappened: val }))
        addBotMessage("Certo. Para o cálculo do JEC, você teve algum prejuízo financeiro direto (ex: valor de um produto, conserto, etc)? Se sim, qual o valor?")
        setCurrentStep('ask_material_damage')
        break

      case 'ask_material_damage':
        const material = val.replace(/\D/g, '')
        setFormData(prev => ({ ...prev, materialDamage: material }))
        addBotMessage("E quanto à reparação por danos morais (sofrimento, humilhação ou transtorno)? Qual valor você considera justo?")
        setCurrentStep('ask_moral_damage')
        break

      case 'ask_moral_damage':
        const moral = val.replace(/\D/g, '')
        const finalData = { ...formData, moralDamage: moral }
        setFormData(finalData)
        showSummary(finalData)
        break
    }
  }

  const handleDefendantSelect = (partner: any) => {
    setFormData(prev => ({ ...prev, defendantName: partner.name, defendantId: partner.id }))
    addUserMessage(`O réu é: ${partner.name}`)
    addBotMessage(`Legal, já tenho os dados da ${partner.name}. E quando esse problema aconteceu?`)
    setCurrentStep('ask_time')
  }

  const showSummary = (data: any) => {
    const total = Number(data.materialDamage) + Number(data.moralDamage)
    const limit = 1412 * 20

    addBotMessage(
      <div className="space-y-4 p-4 bg-white rounded-2xl border-2 border-primary/10 shadow-sm mt-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <CheckCircle2 className="text-primary" size={20} />
          <span className="font-black text-slate-900 uppercase tracking-tight">Resumo da Demanda</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase">Réu</span>
            <span className="text-slate-900 font-black">{data.defendantName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase">Total Pedido</span>
            <span className={cn("font-black", total > limit ? "text-red-500" : "text-primary")}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </span>
          </div>
        </div>

        {total > limit && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-[10px] text-red-600 font-bold leading-relaxed">
            Atenção: O valor excede o limite do JEC (20 salários mínimos). Recomenda-se ajustar os valores ou consultar um advogado.
          </div>
        )}

        <Button 
          onClick={() => onComplete(data)}
          className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20"
        >
          Gerar Petição Agora <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>,
      'summary'
    )
  }

  return (
    <Card padding="none" className="w-full flex flex-col h-[600px] border-slate-100 shadow-xl rounded-[32px] overflow-hidden bg-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-slate-100 shadow-lg shadow-primary/5">
            <img src="/minerva-icon.png" alt="Minerva" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 uppercase tracking-tight">Conversa com Minerva</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coleta Inteligente Ativa</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Gavel className="text-slate-200" size={32} />
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30"
      >
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={cn(
              "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[85%] flex gap-3",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm overflow-hidden",
                msg.role === 'user' ? "bg-slate-900 text-white" : "bg-white border border-slate-100"
              )}>
                {msg.role === 'user' ? <User size={14} /> : <img src="/minerva-icon.png" alt="M" className="w-6 h-6 object-contain" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm",
                msg.role === 'user' 
                  ? "bg-slate-900 text-white rounded-tr-none" 
                  : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
              )}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-in fade-in duration-300">
             <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
               <img src="/minerva-icon.png" alt="..." className="w-5 h-5 object-contain animate-pulse" />
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Minerva está escrevendo...</span>
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center gap-3">
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite aqui..."
            className="flex-1 h-14 pl-6 pr-16 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="absolute right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg shadow-primary/20"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </Card>
  )
}
