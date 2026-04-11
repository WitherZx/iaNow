'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { History, Plus, ChevronRight, MessageSquare, Trash2, Check, Clock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

// Actions
import {
  createChatSession,
  getChatMessages,
  saveChatMessage,
  updateSessionMetadata,
  deleteChatSession
} from '@/app/actions/chat-actions'

// Types & Config
import { Message, MinervaAssistantProps, ModuleType } from '@/types/minerva'
import { WIZARD_CONFIG } from '@/constants/minerva-wizard'
import { scrapeConversationContext } from '@/utils/minerva-parsers'

// Sub-components
import { MinervaChatInput } from './MinervaChatInput'
import { MinervaChatMessage } from './MinervaChatMessage'

export function MinervaAssistant({ userName, onToggleView, initialPrompt, defaultModule }: MinervaAssistantProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const isMounted = useRef(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // --- STATE ---
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [history, setHistory] = useState<{ id: string, title: string, date: string }[]>([])
  const [wizardData, setWizardData] = useState<Record<string, any>>({})
  const [lastSubmittedStep, setLastSubmittedStep] = useState<number>(0)
  const [latestResultPath, setLatestResultPath] = useState<string | null>(null)

  // --- HYDRATION & SESSION STORAGE ---
  // Use session storage for flags that should reset on hard refresh (F5) 
  // but persist on soft navigation or tab switching.
  useEffect(() => {
    isMounted.current = true
    
    // Load History
    const savedHistory = localStorage.getItem('minerva_chat_history')
    if (savedHistory) setHistory(JSON.parse(savedHistory))

    const init = async () => {
      setIsInitializing(true)
      try {
        // Isolation: Check if this tab already has an active session
        const tabActiveSession = sessionStorage.getItem('minerva_tab_session_id')
        const globalActiveSession = localStorage.getItem('minerva_active_session_id')
        
        const targetSessionId = tabActiveSession || globalActiveSession

        if (targetSessionId) {
          const { messages: msgs } = await getChatMessages(targetSessionId)
          if (msgs && msgs.length > 0) {
            setMessages(msgs)
            setSessionId(targetSessionId)
            sessionStorage.setItem('minerva_tab_session_id', targetSessionId)
            
            // Restore Wizard State
            const savedWizard = localStorage.getItem(`minerva_wizard_${targetSessionId}`)
            if (savedWizard) setWizardData(JSON.parse(savedWizard))
            
            const savedStep = localStorage.getItem(`minerva_last_step_${targetSessionId}`)
            if (savedStep) setLastSubmittedStep(parseInt(savedStep))
            
            const savedResult = localStorage.getItem(`minerva_result_${targetSessionId}`)
            if (savedResult) setLatestResultPath(savedResult)

            setIsInitializing(false)
            return
          }
        }

        // Fresh Start
        const { session: newSession } = await createChatSession()
        if (newSession) {
          setSessionId(newSession.id)
          sessionStorage.setItem('minerva_tab_session_id', newSession.id)
          localStorage.setItem('minerva_active_session_id', newSession.id)

          const greeting = `Olá, ${userName === 'Usuário' ? 'em que posso ajudar?' : userName + '! Como posso auxiliar sua empresa hoje?'}`
          const initialMsgs: Message[] = [{ role: 'bot', content: greeting }]
          setMessages(initialMsgs)
          
          await saveChatMessage({
            sessionId: newSession.id,
            role: 'assistant',
            content: greeting
          })
        }
      } catch (e) {
        console.error('Failed to initialize session', e)
        toast.error('Erro ao conectar com a base de conhecimento.')
      } finally {
        setIsInitializing(false)
      }
    }

    init()

    return () => { isMounted.current = false }
  }, []) // userName excluded from deps to prevent re-init if prop changes during session

  // --- AUTO SCROLL ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // --- MODULE & STEP LOGIC ---
  const activeModule = useMemo(() => {
    if (defaultModule) return defaultModule
    const rawContent = messages.map(m => m.content).join(' ').toLowerCase()
    const content = rawContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    const scraped = scrapeConversationContext(messages)
    if (scraped.companyName || scraped.sector || wizardData.companyName || wizardData.sector) return 'estrategia'
    if (wizardData.tipoContrato || wizardData.perfilPartes || scraped.tipoContrato) return 'juridico'
    if (wizardData.problemType || wizardData.whenHappened || scraped.problemType) return 'justica'

    if (content.includes('estrategia') || content.includes('diagnostico') || content.includes('crescimento')) return 'estrategia'
    if (content.includes('justica') || content.includes('processo') || content.includes('demanda') || content.includes('protocolo')) return 'justica'
    if (content.includes('juridico') || content.includes('contrato')) return 'juridico'

    return 'general'
  }, [messages, wizardData, defaultModule])

  const currentModuleConfig = (WIZARD_CONFIG as any)[activeModule]
  const maxSteps = currentModuleConfig ? Object.keys(currentModuleConfig).length : 4

  const wizardStep = useMemo(() => {
    const lastBotMsg = [...messages].reverse().find(m => m.role === 'bot')
    const content = lastBotMsg?.content.toLowerCase() || ''

    // Sinais explícitos de que a IA já concluiu a análise e está pronta para gerar
    if (content.includes('processado com sucesso') || 
        content.includes('podemos gerar o protocolo') || 
        content.includes('podemos gerar o contrato') ||
        content.includes('gerar seu diagnóstico')) return (maxSteps + 1)

    if (lastSubmittedStep >= maxSteps) return (maxSteps + 1)
    return Math.min(lastSubmittedStep + 1, maxSteps)
  }, [messages, lastSubmittedStep, maxSteps])

  const stepperLabels = useMemo(() => {
    switch (activeModule) {
      case 'justica': return ['PROBLEMA', 'PARTES', 'VALORES', 'ANÁLISE']
      case 'estrategia': return ['NEGÓCIO', 'DADOS', 'METAS', 'VISÃO', 'ANÁLISE']
      case 'juridico': return ['CONTRATO', 'DADOS', 'REVISÃO', 'ANÁLISE']
      default: return ['SESSÃO', 'DADOS', 'REVISÃO', 'ANÁLISE', 'RESULTADO']
    }
  }, [activeModule])

  // --- PERSISTENCE ---
  const saveGameState = (currMessages: Message[], currWizard?: any, step?: number, result?: string | null) => {
    if (!sessionId) return
    localStorage.setItem(`minerva_messages_${sessionId}`, JSON.stringify(currMessages))
    if (currWizard) localStorage.setItem(`minerva_wizard_${sessionId}`, JSON.stringify(currWizard))
    if (step !== undefined) localStorage.setItem(`minerva_last_step_${sessionId}`, step.toString())
    if (result !== undefined) localStorage.setItem(`minerva_result_${sessionId}`, result || '')
  }

  const updateHistory = (firstUserMsg: string) => {
    if (!sessionId) return
    setHistory(prev => {
      if (prev.find(h => h.id === sessionId)) return prev
      const newHistory = [
        {
          id: sessionId,
          title: firstUserMsg.length > 40 ? firstUserMsg.substring(0, 40) + '...' : firstUserMsg,
          date: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        },
        ...prev
      ]
      localStorage.setItem('minerva_chat_history', JSON.stringify(newHistory))
      return newHistory
    })
  }

  // --- ACTIONS ---
  const handleSendMessage = async (text: string) => {
    if (!sessionId || isProcessing) return

    const userMsg: Message = { role: 'user', content: text }
    
    // Save locally and DB
    setMessages(prev => {
      const updated = [...prev, userMsg]
      saveGameState(updated)
      return updated
    })
    
    await saveChatMessage({ sessionId, role: 'user', content: text })

    if (messages.filter(m => m.role === 'user').length === 0) {
      updateHistory(text)
    }

    // Reset wizard if this is a new flow starting after completion
    if (wizardStep > maxSteps) {
      setWizardData({})
      setLastSubmittedStep(0)
      setLatestResultPath(null)
      saveGameState(messages, {}, 0, null)
    }

    setIsTyping(true)

    try {
      let accumulatedContent = ''
      let toolCalls: any[] = []
      
      // Request loop
      const performRequest = async (isContinuation = false): Promise<string | null> => {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: [...messages, userMsg].map(m => ({
              role: m.role === 'bot' || m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content
            })),
            wizardData,
            activeModule,
            currentStep: wizardStep,
            isContinuation
          })
        })

        if (!response.ok) throw new Error('API Error')
        
        const reader = response.body?.getReader()
        if (!reader) throw new Error('Reader Error')

        const decoder = new TextDecoder()
        let lastReason: string | null = null
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const dataStr = line.replace('data: ', '')
            if (dataStr === '[DONE]') break

            try {
              const data = JSON.parse(dataStr)
              const choice = data.choices[0]
              const delta = choice?.delta
              lastReason = choice?.finish_reason || null

              if (delta?.content) accumulatedContent += delta.content
              if (delta?.tool_calls) {
                delta.tool_calls.forEach((tc: any) => {
                  const idx = tc.index ?? 0
                  if (!toolCalls[idx]) {
                    toolCalls[idx] = { id: tc.id, type: 'function', function: { name: tc.function?.name, arguments: '' } }
                  }
                  if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments
                })
              }

              setMessages(prev => {
                const draft = [...prev]
                const last = draft[draft.length - 1]
                if (last && last.role === 'bot') {
                   draft[draft.length - 1] = { ...last, content: accumulatedContent, toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
                } else {
                   draft.push({ role: 'bot', content: accumulatedContent, toolCalls: toolCalls.length > 0 ? toolCalls : undefined })
                }
                return draft
              })
            } catch (e) {}
          }
        }
        return lastReason
      }

      let finishReason = await performRequest()
      let recursion = 0
      while (finishReason === 'length' && recursion < 2) {
        finishReason = await performRequest(true)
        recursion++
      }

      setMessages(prev => {
        saveGameState(prev)
        return prev
      })

      await saveChatMessage({ 
        sessionId, role: 'assistant', content: accumulatedContent, toolCalls: toolCalls.length > 0 ? toolCalls : null 
      })

    } catch (error) {
       console.error('Chat Error:', error)
       toast.error('Ocorreu um problema na comunicação.')
    } finally {
      setIsTyping(false)
    }
  }

  const handleFormSubmit = (fields: any[], data: Record<string, string>) => {
    const updated = { ...wizardData, ...data }
    setWizardData(updated)
    const nextStep = lastSubmittedStep + 1
    setLastSubmittedStep(nextStep)
    saveGameState(messages, updated, nextStep)

    updateSessionMetadata(sessionId!, { wizardData: updated, lastSubmittedStep: nextStep })

    const summary = fields.map(f => {
      const val = data[`${f.id}_name`] || data[f.id] || '-'
      const label = data[`${f.id}_role`] || f.label
      return `**${label}**: ${val}`
    }).join(' • ')

    handleSendMessage(`Informações de **${fields[0]?.label || 'dados'}** enviadas: ${summary}`)
  }

  const handleAction = async (path: string) => {
    // Se não for um caminho de geração (/novo), é apenas navegação simples
    if (!path.includes('/novo')) {
      router.push(path)
      return
    }

    setIsProcessing(true)
    
    // UI Feedback
    const procMsg: Message = { 
      role: 'bot', 
      content: `Iniciando geração do seu **${path.includes('estrategia') ? 'Diagnóstico' : path.includes('juridico') ? 'Contrato' : 'Caso'}**. Por favor, aguarde...`,
      skipWizard: true
    }
    setMessages(prev => [...prev, procMsg])

    try {
      let endpoint = '/api/ai/strategy'
      let payload: any = {}

      if (path.includes('estrategia')) {
        endpoint = '/api/ai/strategy'
        payload = { diagnosticData: { ...wizardData } }
      } else if (path.includes('juridico')) {
        endpoint = '/api/juridico/gerar'
        payload = {
           tipoContrato: wizardData.tipoContrato || 'Contrato',
           nivel: wizardData.nivel || 'Básico',
           sideToFavor: wizardData.sideToFavor || 'Equilibrado',
           perfilPartes: wizardData.perfilPartes || '',
           objetivo: wizardData.objetivo || '',
           foro: wizardData.foro || '',
           partyA: { 
             name: wizardData.parteA_name, 
             document: wizardData.parteA_doc, 
             address: wizardData.parteA_address, 
             type: wizardData.parteA_type,
             contact: wizardData.parteA_contact,
             role: wizardData.parteA_role || 'Contratante' 
           },
           partyB: { 
             name: wizardData.parteB_name, 
             document: wizardData.parteB_doc, 
             address: wizardData.parteB_address, 
             type: wizardData.parteB_type,
             contact: wizardData.parteB_contact,
             role: wizardData.parteB_role || 'Contratado' 
           },
           parametros: wizardData.parametros || ''
        }
      } else {
        endpoint = '/api/justica/gerar'
        payload = { 
          diagnosticData: { 
            ...wizardData,
            authorName: wizardData.autor_name,
            authorDocument: wizardData.autor_doc,
            authorType: wizardData.autor_type?.toLowerCase(),
            authorAddress: wizardData.autor_address,
            defendantName: wizardData.reu_name,
            defendantDocument: wizardData.reu_doc,
            defendantType: wizardData.reu_type?.toLowerCase(),
            defendantAddress: wizardData.reu_address,
            estimatedValue: (Number(wizardData.materialDamage || 0) + Number(wizardData.moralDamage || 0)).toString()
          } 
        }
      }

      const res = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) })
      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error || 'Erro na geração')

      // Resolve specific IDs from different APIs
      const resolvedId = result.strategyId || result.documentId || result.demandId || result.id
      let successPath = result.path

      if (!successPath && resolvedId) {
        if (path.includes('estrategia')) successPath = `/estrategia/${resolvedId}`
        else if (path.includes('juridico')) successPath = `/juridico/${resolvedId}`
        else if (path.includes('justica')) successPath = `/justica/${resolvedId}`
        else successPath = path.replace('/novo', `/${resolvedId}`)
      }

      if (!successPath) successPath = path.replace('/novo', '/view')
      
      setLatestResultPath(successPath)
      
      // Invalida o cache para atualizar as listas e o dashboard automaticamente
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['juridico-documents'] })
      queryClient.invalidateQueries({ queryKey: ['justice-cases'] })
      queryClient.invalidateQueries({ queryKey: ['strategies'] })

      const successMsg: Message = {
        role: 'bot',
        skipWizard: true,
        content: `✅ **Execução finalizada com sucesso!**
        
A sua solicitação foi processada. Clique no botão abaixo para acessar o resultado final.

[ACTION: ${successPath}]`
      }

      setMessages(prev => {
        const updated = [...prev, successMsg]
        saveGameState(updated, wizardData, lastSubmittedStep, successPath)
        return updated
      })

      // Invalidate dashboard tags
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      }, 1000)

    } catch (e: any) {
      toast.error('Erro ao processar ação.')
      setMessages(prev => [...prev, { role: 'bot', content: `❌ Erro: ${e.message}` }])
    } finally {
      setIsProcessing(false)
    }
  }

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Deseja excluir esta conversa?')) {
      await deleteChatSession(id)
      const newHistory = history.filter(h => h.id !== id)
      setHistory(newHistory)
      localStorage.setItem('minerva_chat_history', JSON.stringify(newHistory))
      if (sessionId === id) {
        setMessages([])
        setSessionId(null)
        sessionStorage.removeItem('minerva_tab_session_id')
      }
    }
  }

  // --- RENDER ---
  return (
    <div className="w-full flex-1 flex flex-row bg-white overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Header */}
        <header className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-700 flex items-center justify-center border border-slate-100 shadow-md relative shrink-0">
              <img src="/minerva-icon.png" alt="Minerva AI" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 text-[12px] sm:text-sm">
                Minerva <span className="hidden sm:inline-block text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">IA Ativa</span>
              </h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Plataforma iaNow</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onToggleView} className="px-3 py-2 rounded-xl border border-slate-200 text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 transition-all flex items-center gap-1">
              <span className="hidden sm:inline">Visualização Tradicional</span>
              <span className="sm:hidden">Dashboard</span>
            </button>
            <button 
              onClick={() => setIsHistoryOpen(!isHistoryOpen)} 
              className={cn("p-2 rounded-xl border transition-all", isHistoryOpen ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 border-slate-200")}
            >
              <History size={18} />
            </button>
          </div>
        </header>

        {/* Status & Stepper */}
        <div className="px-4 sm:px-8 py-4 border-b border-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Sessão</span>
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                isTyping ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"
              )}>
                {isTyping && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                {isTyping ? 'Analisando' : 'Sessão Ativa'}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {stepperLabels.map((label, idx) => {
                const step = idx + 1
                const active = wizardStep === step
                const done = wizardStep > step
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all",
                        active ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-100" : done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-100 text-slate-300"
                      )}>
                        {done ? <Check size={12} strokeWidth={4} /> : step}
                      </div>
                      <span className={cn("hidden sm:block text-[8px] font-black uppercase tracking-widest", active ? "text-blue-600" : "text-slate-300")}>{label}</span>
                    </div>
                    {idx < stepperLabels.length - 1 && <div className="w-4 sm:w-8 h-[2px] bg-slate-100 mb-4" />}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <main 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar"
        >
          {messages.length === 0 && Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="w-full h-20 bg-slate-50 animate-pulse rounded-2xl" />
          ))}

          {messages.map((msg, i) => (
            <MinervaChatMessage
              key={`${sessionId}-${i}`}
              msg={msg}
              index={i}
              isLast={i === messages.length - 1}
              isTyping={isTyping}
              isProcessing={isProcessing}
              activeModule={activeModule}
              wizardStep={wizardStep}
              maxSteps={maxSteps}
              wizardData={wizardData}
              allMessages={messages}
              onSendMessage={handleSendMessage}
              onFormSubmit={handleFormSubmit}
              onActionClick={handleAction}
            />
          ))}

          {/* Prompt Chips */}
          {!isTyping && messages.length === 1 && (
            <div className="flex flex-wrap gap-2 justify-center pt-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
               {[
                 { label: "Criar Contrato", prompt: "Quero criar um novo contrato jurídico" },
                 { label: "Novo Processo", prompt: "Quero iniciar um novo processo judicial" },
                 { label: "Nova Estratégia", prompt: "Quero montar uma estratégia de negócio" }
               ].map((chip, i) => (
                 <button key={i} onClick={() => handleSendMessage(chip.prompt)} className="px-4 py-2 bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 hover:border-blue-600 hover:text-blue-600 rounded-xl transition-all shadow-sm uppercase tracking-wider">
                   {chip.label}
                 </button>
               ))}
            </div>
          )}
        </main>

        {/* Input */}
        <footer className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0">
          <MinervaChatInput 
            onSendMessage={handleSendMessage} 
            isProcessing={isTyping || isProcessing} 
            placeholder="Descreva sua necessidade para a Minerva..."
          />
          <p className="mt-3 text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">
            iaNow Minerva AI • Inteligência Estratégica e Jurídica em Tempo Real
          </p>
        </footer>
      </div>

      {/* Sidebar History */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-[100] bg-slate-100 border-l border-slate-200 shadow-2xl lg:shadow-none lg:static transition-all duration-300 flex flex-col group h-full overflow-hidden",
        isHistoryOpen ? "w-[85vw] sm:w-80" : "w-0 opacity-0 pointer-events-none"
      )}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm flex items-center gap-2">
               <Clock size={16} className="text-blue-600" /> Histórico
            </h4>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sessões Recentes</p>
          </div>
          <button 
            onClick={() => {
              const newId = `session-${Date.now()}`
              setSessionId(newId)
              sessionStorage.setItem('minerva_tab_session_id', newId)
              setMessages([{ role: 'bot', content: 'Olá! Sou a Minerva. Como posso ajudar hoje?' }])
            }}
            className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-white/50">
          {history.map((item) => (
             <div 
               key={item.id} 
               onClick={() => {
                 setSessionId(item.id)
                 sessionStorage.setItem('minerva_tab_session_id', item.id)
                 localStorage.setItem('minerva_active_session_id', item.id)
                 const saved = localStorage.getItem(`minerva_messages_${item.id}`)
                 if (saved) setMessages(JSON.parse(saved))
                 if (window.innerWidth < 1024) setIsHistoryOpen(false)
               }}
               className={cn(
                 "p-4 rounded-2xl border transition-all cursor-pointer group/item relative",
                 sessionId === item.id ? "bg-white border-blue-600 shadow-md ring-1 ring-blue-600/10" : "bg-white/50 border-slate-100 hover:bg-white hover:border-slate-200"
               )}
             >
               <h5 className={cn("text-xs font-bold truncate pr-6", sessionId === item.id ? "text-blue-600" : "text-slate-700")}>{item.title}</h5>
               <p className="text-[9px] font-black text-slate-300 uppercase mt-1">{item.date}</p>
               <button onClick={(e) => deleteSession(item.id, e)} className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all">
                 <Trash2 size={12} />
               </button>
             </div>
          ))}
          {history.length === 0 && (
             <div className="h-40 flex flex-col items-center justify-center text-slate-300 text-center p-4">
                <MessageSquare size={32} className="mb-2 opacity-20" />
                <p className="text-[10px] uppercase font-black tracking-widest">Sem histórico</p>
             </div>
          )}
        </div>
      </aside>
    </div>
  )
}
