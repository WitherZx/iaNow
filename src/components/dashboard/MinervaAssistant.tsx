'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Send,
  User,
  Loader2,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Scale,
  History,
  Plus,
  MessageSquare,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Clock,
  ChevronDown,
  Check
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useRouter } from 'next/navigation'
import { FormSelect } from '@/components/shared/FormSelect'
import { PartnerSelector } from '@/components/shared/PartnerSelector'
import { toast } from 'sonner'

interface Message {
  role: 'bot' | 'user'
  content: string
}

interface MinervaAssistantProps {
  userName: string
  onToggleView: () => void
}

export function MinervaAssistant({ userName, onToggleView }: MinervaAssistantProps) {
  const ACTIVE_SESSION_KEY = 'minerva_active_session_id'

  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return `session-${Date.now()}`
    const active = localStorage.getItem('minerva_active_session_id')
    if (active) return active
    const historyStr = localStorage.getItem('minerva_chat_history')
    if (historyStr) {
      try {
        const hist = JSON.parse(historyStr)
        if (hist.length > 0) return hist[0].id
      } catch (e) { }
    }
    return `session-${Date.now()}`
  })

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined' || !sessionId) return []
    const saved = localStorage.getItem(`minerva_messages_${sessionId}`)
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { return [] }
    }
    return []
  })

  // Restore accidentally removed state
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const [history, setHistory] = useState<{ id: string, title: string, date: string }[]>([])
  const [wizardData, setWizardData] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [guestId, setGuestId] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    const current = localStorage.getItem('ianow_guest_id')
    if (current) return current
    const generated = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('ianow_guest_id', generated)
    return generated
  })

  const [latestResultPath, setLatestResultPath] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const getOrCreateGuestId = () => {
    if (typeof window === 'undefined') return ''
    const current = localStorage.getItem('ianow_guest_id')
    if (current) return current
    const generated = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('ianow_guest_id', generated)
    return generated
  }

  const fetchWithGuest = async (url: string, options: RequestInit = {}, retryOn401 = false) => {
    const resolvedGuestId = guestId || getOrCreateGuestId()
    if (!guestId) setGuestId(resolvedGuestId)
    const headers = {
      'Content-Type': 'application/json',
      'X-Guest-Id': resolvedGuestId,
      ...(options.headers || {})
    }

    let response = await fetch(url, { ...options, headers })

    if (retryOn401 && response.status === 401) {
      const renewedGuestId = getOrCreateGuestId()
      setGuestId(renewedGuestId)
      toast.error('Sessao de visitante expirada. Reconectando...')
      response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          'X-Guest-Id': renewedGuestId
        }
      })
    }

    return response
  }

  const activeModule = (() => {
    // Tentar detectar o módulo ativo baseado no histórico recente e wizardData
    const lastContextMsg = [...messages].reverse().find(m =>
      m.role === 'bot' && (m.content.includes('[FORM:') || m.content.includes('[ACTION:'))
    )
    const content = lastContextMsg?.content.toLowerCase() || ''

    if (content.includes('justica') || content.includes('processo') || content.includes('demanda') || content.includes('jus postulandi')) return 'justica'
    if (content.includes('juridico') || content.includes('contrato') || content.includes('prestação de serviço')) return 'juridico'
    if (content.includes('estrategia') || content.includes('diagnostico') || content.includes('crescimento')) return 'estrategia'

    return 'general'
  })()

  const wizardStep = (() => {
    // 1. Verificar se a ÚLTIMA mensagem do bot foi de sucesso
    const lastBotMsg = [...messages].reverse().find(m => m.role === 'bot')
    if (lastBotMsg?.content.includes('processado com sucesso')) return 5

    if (isProcessing) return 4

    const keys = Object.keys(wizardData)
    if (keys.length >= 5) return 3
    if (keys.length > 0) return 2
    return 1
  })()

  const stepperLabels = (() => {
    switch (activeModule) {
      case 'justica':
        return ['DEMANDA', 'FATOS', 'DADOS', 'ANÁLISE', 'PROTOCOLO']
      case 'estrategia':
        return ['NEGÓCIO', 'DADOS', 'METAS', 'ANÁLISE', 'PLANO']
      case 'juridico':
      default:
        return ['CONTRATO', 'DADOS', 'REVISÃO', 'ANÁLISE', 'RESULTADO']
    }
  })()

  // Initialize history and metadata
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('minerva_chat_history')
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory))
      }

      // Carregar dados extras da sessão (wizard, result)
      if (sessionId) {
        localStorage.setItem(ACTIVE_SESSION_KEY, sessionId)

        const savedWizard = localStorage.getItem(`minerva_wizard_${sessionId}`)
        if (savedWizard) {
          try { setWizardData(JSON.parse(savedWizard)) } catch (e) { setWizardData({}) }
        }

        const handleNewChat = () => {
          localStorage.removeItem(ACTIVE_SESSION_KEY)
          const newSessionId = `session-${Date.now()}`
          setSessionId(newSessionId)
          setMessages([])
          setWizardData({})
          setIsHistoryOpen(false)
          const newGuestId = getOrCreateGuestId()
        }

        const savedResult = localStorage.getItem(`minerva_result_${sessionId}`)
        setLatestResultPath(savedResult || null)
      }

      setGuestId(getOrCreateGuestId())
    } catch (e) {
      console.error('Failed to load history', e)
    }
  }, [sessionId])

  // Save/Update current session in history
  const updateHistory = (firstUserMsg: string) => {
    setHistory(prev => {
      // Check if session already exists
      const exists = prev.find(h => h.id === sessionId)
      if (exists) return prev

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

  const saveMessagesToStorage = (currSessionId: string, currMessages: Message[], resultPath?: string | null) => {
    localStorage.setItem(`minerva_messages_${currSessionId}`, JSON.stringify(currMessages))
    if (resultPath !== undefined) {
      localStorage.setItem(`minerva_result_${currSessionId}`, resultPath || '')
    }
  }

  const loadMessagesFromStorage = (targetSessionId: string) => {
    const saved = localStorage.getItem(`minerva_messages_${targetSessionId}`)
    if (saved) {
      setMessages(JSON.parse(saved))
    } else {
      const greeting = `Olá, ${userName}. Sou a Minerva, sua inteligência estratégica e jurídica. Como posso te auxiliar hoje?`
      setMessages([{ role: 'bot', content: greeting }])
    }

    const savedWizard = localStorage.getItem(`minerva_wizard_${targetSessionId}`)
    if (savedWizard) {
      try {
        setWizardData(JSON.parse(savedWizard))
      } catch (e) {
        setWizardData({})
      }
    } else {
      setWizardData({})
    }

    const savedResult = localStorage.getItem(`minerva_result_${targetSessionId}`)
    setLatestResultPath(savedResult || null)
  }

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Initial greeting if session is fresh
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = `Olá, ${userName}. Sou a Minerva, sua inteligência estratégica e jurídica. Como posso te auxiliar na sua blindagem institucional hoje?`
      const initialMsgs = [{ role: 'bot', content: greeting }] as Message[]
      setMessages(initialMsgs)
      saveMessagesToStorage(sessionId, initialMsgs)
    }
  }, [userName, messages.length, sessionId])

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return

    const userMsg: Message = { role: 'user', content: text }

    // Reset do Wizard e Banner se o usuário puxar outro assunto após finalizar um fluxo
    if (wizardStep === 5) {
      setLatestResultPath(null)
      localStorage.removeItem(`minerva_result_${sessionId}`)
      setWizardData({})
      localStorage.removeItem(`minerva_wizard_${sessionId}`)
    }

    // Update history on first user message
    if (messages.filter(m => m.role === 'user').length === 0) {
      updateHistory(text)
    }

    setMessages(prev => {
      const updated = [...prev, userMsg]
      saveMessagesToStorage(sessionId, updated)
      return updated
    })
    setInputValue('')
    setIsTyping(true)

    try {
      const response = await fetchWithGuest('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role === 'bot' ? 'assistant' : 'user',
            content: m.content
          }))
        })
      }, true)

      if (!response.ok) throw new Error(response.status === 401 ? 'Sessao nao autorizada' : 'API Error')

      const data = await response.json()
      const newBotMsg: Message = { role: 'bot', content: data.content }
      setMessages(prev => {
        const updated = [...prev, newBotMsg]
        saveMessagesToStorage(sessionId, updated)
        return updated
      })
    } catch (error) {
      console.error('Chat Error:', error)
      setMessages(prev => [...prev, { role: 'bot', content: "Desculpe, tive um problema de comunicação. Poderia tentar novamente?" }])
    } finally {
      setIsTyping(false)
    }
  }

  const parseActions = (text: string) => {
    const actionRegex = /\[ACTION: (.*?)\]/g
    const matches = Array.from(text.matchAll(actionRegex))
    const cleanText = text.replace(actionRegex, '').trim()

    return {
      text: cleanText,
      actions: matches.map(m => m[1])
    }
  }

  const parseForm = (text: string) => {
    const formRegex = /\[FORM: (.*?)\]/g
    const match = formRegex.exec(text)
    const cleanText = text.replace(formRegex, '').trim()

    if (!match) return { text: cleanText, fields: [] }

    const fields = match[1].split(',').map(f => {
      const parts = f.split('|').map(s => s.trim())
      const id = parts[0]
      const label = parts[1] || id
      const optionsStr = parts[2]
      const defaultValue = parts[3]

      const isContact = optionsStr === 'CONTACT'
      const options = optionsStr && !isContact ? optionsStr.split(';').map(o => o.trim()) : undefined

      return { id, label, options, isContact, defaultValue }
    })

    return {
      text: cleanText,
      fields
    }
  }

  const handleFormSubmit = (fields: { id: string, label: string }[], data: Record<string, string>) => {
    // Update accumulated wizard data
    setWizardData(prev => {
      const updated = { ...prev, ...data }
      localStorage.setItem(`minerva_wizard_${sessionId}`, JSON.stringify(updated))
      return updated
    })

    // Create a more professional, concise summary of data sent
    const formattedData = fields.map(f => {
      let val = data[f.id]
      if (data[`${f.id}_name`]) val = data[`${f.id}_name`] // Use descriptive name instead of UUID or 'manual'
      return `**${f.label}**: ${val || '-'}`
    }).join(' • ')

    const submissionText = `Informações de **${fields[0]?.label || 'dados'}** enviadas: ${formattedData}`
    handleSendMessage(submissionText)
  }

  const handleAction = async (path: string) => {
    // Check if it's a creation action that should be handled in background
    if (path.includes('/novo')) {
      // 1. Limpar o botão clicado do histórico (para não mostrar duplicado depois)
      setMessages(prev => {
        const updated = prev.map(m => {
          if (m.role === 'bot' && m.content.includes(`[ACTION: ${path}]`)) {
            return {
              ...m,
              content: m.content.replace(`[ACTION: ${path}]`, '').trim()
            }
          }
          return m
        })
        saveMessagesToStorage(sessionId, updated)
        return updated
      })

      setIsProcessing(true)

      try {
        let endpoint = '/api/ai/strategy'
        let payload: any = {}

        if (path.includes('estrategia')) {
          endpoint = '/api/ai/strategy'
          payload = {
            diagnosticData: {
              companyName: wizardData.companyName || wizardData.empresa || 'Empresa Confidencial',
              website: wizardData.website || '',
              offeredSolution: wizardData.solution || wizardData.solucao || 'Solução não informada',
              size: wizardData.size || wizardData.tamanho || 'Não informado',
              revenue: wizardData.revenue || wizardData.faturamento || 'Não informado',
              businessModel: wizardData.businessModel || wizardData.modelo_negocio || 'Indefinido',
              digitalLevel: wizardData.digitalLevel || wizardData.nivel_digital || 'Indefinido',
              mainPain: wizardData.mainPain || wizardData.dor_principal || 'Aumentar resultados',
              challenges: wizardData.challenges ? [wizardData.challenges] : [],
              goals: wizardData.goals ? [wizardData.goals] : [],
              growthObstacle: wizardData.obstacle || wizardData.obstaculo || 'Não informado'
            }
          }
        } else if (path.includes('juridico')) {
          endpoint = '/api/juridico/gerar'
          payload = {
            tipoContrato: wizardData.tipo || wizardData.tipoContrato || wizardData.tipo_contrato || 'Contrato Genérico',
            nivel: wizardData.nivel || wizardData.nivel_blindagem || 'Básico',
            perfilPartes: wizardData.perfil || wizardData.perfil_partes || 'Amigável',
            objetivo: wizardData.objetivo || wizardData.resumo_objeto || 'Formalizar relação entre as partes',
            foro: wizardData.foro || wizardData.comarca || wizardData.foro_eleicao || 'São Paulo - SP',
            partyA: {
              name: wizardData.partyA_name || wizardData.parteA_name || wizardData.parte1_name || wizardData.partea_name || 'Nome não qualificado',
              document: wizardData.partyA_doc || wizardData.parteA_doc || wizardData.parte1_doc || wizardData.partea_doc || 'Documento não informado',
              address: wizardData.partyA_address || wizardData.parteA_address || wizardData.parte1_address || wizardData.partea_address,
              type: wizardData.partyA_type || wizardData.parteA_type || wizardData.parte1_type || wizardData.partea_type || 'PF',
              contact: wizardData.partyA_contact || wizardData.parteA_contact || wizardData.parte1_contact || wizardData.partea_contact,
              representedBy: wizardData.partyA_rep_name || wizardData.parteA_rep_name || wizardData.parte1_rep_name || wizardData.partea_rep_name,
              representedByDoc: wizardData.partyA_rep_doc || wizardData.parteA_rep_doc || wizardData.parte1_rep_doc || wizardData.partea_rep_doc,
              rg: wizardData.partyA_rg || wizardData.parteA_rg || wizardData.parte1_rg || wizardData.partea_rg,
              nationality: wizardData.partyA_nationality || wizardData.parteA_nationality || wizardData.parte1_nationality || wizardData.partea_nationality,
              maritalStatus: wizardData.partyA_maritalStatus || wizardData.parteA_maritalStatus || wizardData.parte1_maritalStatus || wizardData.partea_maritalStatus,
              profession: wizardData.partyA_profession || wizardData.parteA_profession || wizardData.parte1_profession || wizardData.partea_profession
            },
            partyB: {
              name: wizardData.partyB_name || wizardData.parteB_name || wizardData.parte2_name || wizardData.parteb_name || 'Nome não qualificado',
              document: wizardData.partyB_doc || wizardData.parteB_doc || wizardData.parte2_doc || wizardData.parteb_doc || 'Documento não informado',
              address: wizardData.partyB_address || wizardData.parteB_address || wizardData.parte2_address || wizardData.parteb_address,
              type: wizardData.partyB_type || wizardData.parteB_type || wizardData.parte2_type || wizardData.parteb_type || 'PF',
              contact: wizardData.partyB_contact || wizardData.parteB_contact || wizardData.parte2_contact || wizardData.parteb_contact,
              representedBy: wizardData.partyB_rep_name || wizardData.parteB_rep_name || wizardData.parte2_rep_name || wizardData.parteb_rep_name,
              representedByDoc: wizardData.partyB_rep_doc || wizardData.parteB_rep_doc || wizardData.parte2_rep_doc || wizardData.parteb_rep_doc,
              rg: wizardData.partyB_rg || wizardData.parteB_rg || wizardData.parte2_rg || wizardData.parteb_rg,
              nationality: wizardData.partyB_nationality || wizardData.parteB_nationality || wizardData.parte2_nationality || wizardData.parteb_nationality,
              maritalStatus: wizardData.partyB_maritalStatus || wizardData.parteB_maritalStatus || wizardData.parte2_maritalStatus || wizardData.parteb_maritalStatus,
              profession: wizardData.partyB_profession || wizardData.parteB_profession || wizardData.parte2_profession || wizardData.parteb_profession
            },
            parametros: wizardData.parametros || wizardData.clausulas || 'Termos padrão.'
          }
        } else if (path.includes('justica')) {
          endpoint = '/api/justica/gerar'
          payload = {
            diagnosticData: {
              problemType: wizardData.problemType || wizardData.tipo_problema || 'Indenizatória',
              comarca: wizardData.comarca || wizardData.jurisdiction || wizardData.cidade || 'Foro correspondente',
              authorName: wizardData.author_name || wizardData.autor_name || wizardData.authorName || userName,
              authorDocument: wizardData.author_doc || wizardData.autor_doc || wizardData.authorDocument || 'CPF Inválido',
              authorAddress: wizardData.author_address || wizardData.autor_address || wizardData.authorAddress || 'Sem endereço',
              defendantName: wizardData.defendant_name || wizardData.reu_name || wizardData.defendant || 'Parte Ré',
              defendantDocument: wizardData.defendant_doc || wizardData.reu_doc || 'CNPJ/CPF Inválido',
              defendantAddress: wizardData.defendant_address || wizardData.reu_address || 'Endereço não informado',
              whatHappened: wizardData.whatHappened || wizardData.fatos || wizardData.what_happened || 'Resumo dos fatos não informado.',
              whenHappened: wizardData.when || wizardData.data_ocorrido || wizardData.when_happened || 'Não informado',
              materialDamage: wizardData.materialDamage || wizardData.dano_material || '0',
              moralDamage: wizardData.moralDamage || wizardData.dano_moral || '0',
              estimatedValue: Number(wizardData.materialDamage || wizardData.dano_material || 0) + Number(wizardData.moralDamage || wizardData.dano_moral || 0)
            }
          }
        }

        const response = await fetchWithGuest(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload)
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.detail || data.error || 'Falha no processamento')
        }

        setIsProcessing(false)
        const moduleName = path.includes('estrategia') ? 'Estratégia' : path.includes('juridico') ? 'Contrato' : 'Caso'
        const resultId = data.strategyId || data.documentId || data.demandId
        const resolvedResultPath = `${path.replace('/novo', '')}${resultId ? '/' + resultId : ''}`
        setLatestResultPath(resolvedResultPath)

        const finalMsg: Message = {
          role: 'bot',
          content: `✅ **${moduleName} processado com sucesso!**\n\nA execução foi finalizada em segundo plano com base nos dados fornecidos. Você já pode visualizar o resultado completo.\n\n[ACTION: ${resolvedResultPath}]`
        }

        setMessages(prev => {
          const updated = [...prev, finalMsg]
          saveMessagesToStorage(sessionId, updated, resolvedResultPath)
          return updated
        })
      } catch (error: any) {
        console.error('Action processing error:', error)
        setIsProcessing(false)
        setMessages(prev => [...prev, {
          role: 'bot',
          content: `❌ **Ocorreu um erro ao processar:** ${error.message}\n\n[ACTION: ${path}]`
        }])
      }
      return
    }

    // Default: just navigate
    router.push(path)
  }

  const getActionLabel = (path: string) => {
    if (path.includes('/juridico/novo')) return "Gerar Novo Contrato"
    if (path.includes('/justica/novo')) return "Iniciar Nova Demanda"
    if (path.includes('/estrategia/novo')) return "Criar Diagnóstico"
    if (path.match(/^\/juridico\/[^/]+/)) return "Ver Contrato Gerado"
    if (path.match(/^\/justica\/[^/]+/)) return "Ver Caso Gerado"
    if (path.match(/^\/estrategia\/[^/]+/)) return "Ver Estratégia Gerada"
    if (path.includes('/parceiros')) return "Ver Hub de Parceiros"
    return "Acessar Módulo"
  }

  const getActionIcon = (path: string) => {
    if (path.includes('/juridico/novo')) return <Scale size={16} />
    if (path.includes('/justica/novo')) return <ShieldCheck size={16} />
    if (path.includes('/estrategia/novo')) return <Zap size={16} />
    return null
  }

  return (
    <div className="w-full flex-1 flex flex-row bg-white overflow-hidden animate-in fade-in duration-500">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Header Contextual */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 overflow-hidden">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-slate-100 shadow-md relative shrink-0">
              <img src="/minerva-icon.png" alt="Minerva AI" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 text-[12px] sm:text-sm truncate">
                Minerva
                <span className="hidden sm:inline-block text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">IA Ativa</span>
                <span className="sm:hidden inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>
              </h3>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Plataforma iaNow</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleView}
              className="px-3 sm:px-4 py-2 sm:py-2 rounded-xl border border-slate-200 text-[9px] sm:text-[10px] font-black uppercase text-slate-400 hover:bg-white hover:text-slate-900 transition-all hover:border-slate-300 flex items-center gap-1"
            >
              <span className="hidden sm:inline">Visualização Tradicional</span>
              <span className="sm:hidden">Dashboard</span>
            </button>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={cn(
                "p-2 sm:p-2 rounded-xl border transition-all flex items-center justify-center",
                isHistoryOpen ? "bg-primary text-white border-primary" : "bg-white text-slate-400 border-slate-200 hover:text-slate-900"
              )}
              title="Histórico de Conversas"
            >
              <History size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
        <div className="px-4 sm:px-8 py-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Session Status */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Sessão</span>
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border",
                isProcessing
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100/50"
                  : wizardStep >= 2
                    ? "bg-blue-50 text-blue-600 border-blue-100/50"
                    : "bg-slate-50 text-slate-500 border-slate-100"
              )}>
                {isProcessing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                {!isProcessing && wizardStep >= 2 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                {!isProcessing && wizardStep < 2 && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                {isProcessing ? 'Processando' : wizardStep >= 2 ? 'Em coleta' : 'Visitante'}
              </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1 sm:gap-2 flex-grow sm:flex-grow-0 sm:justify-end">
              {stepperLabels.map((label, idx, arr) => {
                const stepNum = idx + 1
                const isActive = wizardStep === stepNum
                const isCompleted = wizardStep > stepNum
                const isPending = wizardStep < stepNum

                return (
                  <React.Fragment key={stepNum}>
                    <div className="flex flex-col items-center gap-1.5 relative group">
                      <div className={cn(
                        "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 shadow-sm border-2 relative z-10",
                        isActive
                          ? "bg-primary border-primary text-white scale-110 ring-4 ring-primary/10"
                          : isCompleted
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white border-slate-100 text-slate-300"
                      )}>
                        {isCompleted ? <Check size={12} strokeWidth={4} /> : stepNum}

                        {/* Glow for Active */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 pointer-events-none" />
                        )}
                      </div>
                      <span className={cn(
                        "hidden sm:block text-[8px] font-black uppercase tracking-widest transition-colors",
                        isActive ? "text-primary" : "text-slate-300"
                      )}>
                        {label}
                      </span>
                    </div>

                    {/* Connector Line */}
                    {idx < arr.length - 1 && (
                      <div className="flex-1 min-w-[8px] sm:min-w-[20px] h-[2px] bg-slate-100 self-center -translate-y-2 sm:-translate-y-2.5 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-700 ease-in-out",
                            wizardStep > stepNum ? "w-full bg-emerald-500" : "w-0 bg-slate-100"
                          )}
                        />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar scroll-smooth"
        >
          <div className="w-full space-y-8">
            {messages.map((msg, i) => {
              const { text: textNoActions, actions } = parseActions(msg.content)
              const { text, fields } = parseForm(textNoActions)

              return (
                <div
                  key={i}
                  className={cn(
                    "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[95%] sm:max-w-[85%] flex gap-3 sm:gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    {/* ... icon logic ... */}
                    <div className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm overflow-hidden",
                      msg.role === 'user' ? "bg-slate-950 text-white" : "bg-white border border-slate-100"
                    )}>
                      {msg.role === 'user' ? <User size={16} /> : <img src="/minerva-icon.png" alt="Minerva" className="w-7 h-7 object-contain" />}
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className={cn(
                        "p-4 text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap",
                        msg.role === 'user'
                          ? "bg-slate-950 text-white rounded-[20px] rounded-tr-none"
                          : "bg-slate-50 text-slate-800 rounded-[20px] rounded-tl-none"
                      )}>
                        {text}

                        {/* Form Fields Rendering */}
                        {fields.length > 0 && msg.role === 'bot' && (
                          <ChatForm
                            fields={fields}
                            onSubmit={(data) => handleFormSubmit(fields, data)}
                            isLastMessage={i === messages.length - 1}
                            isGuest={userName === 'Visitante'}
                          />
                        )}
                      </div>

                      {/* ... actions logic ... */}

                      {/* Action Buttons */}
                      {actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-300">
                          {actions.map((path, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAction(path)}
                              disabled={isProcessing}
                              className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-900 font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95 group disabled:opacity-50"
                            >
                              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : getActionIcon(path)}
                              {isProcessing ? "Processando..." : getActionLabel(path)}
                              {!isProcessing && <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {isTyping && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="flex gap-4 max-w-[80%]">
                  <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-white border border-slate-100 overflow-hidden shadow-sm">
                    <img src="/minerva-icon.png" alt="Typing" className="w-7 h-7 object-contain animate-pulse" />
                  </div>
                  <div className="bg-slate-50 p-5 flex items-center gap-3">
                    <Loader2 size={18} className="text-primary animate-spin" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Minerva está analisando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions (Floating Chips) - Somente se não estiver digitando */}
        {!isTyping && messages.length === 1 && (
          <div className="px-2 sm:px-8 pb-4 flex flex-wrap gap-2 justify-center animate-in fade-in slide-in-from-bottom-2 duration-700">
            {[
              { label: "Criar Contrato", icon: <Scale size={14} />, prompt: "Quero criar um novo contrato jurídico" },
              { label: "Novo Processo", icon: <ShieldCheck size={14} />, prompt: "Quero iniciar um novo processo judicial" },
              { label: "Nova Estratégia", icon: <Zap size={14} />, prompt: "Quero montar uma estratégia de negócio" }
            ].map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(chip.prompt)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-50 border border-slate-100 text-[10px] sm:text-xs font-bold text-slate-500 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all rounded-xl shadow-sm"
              >
                {chip.icon} <span className="truncate">{chip.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input de Mensagem */}
        <div className="p-3 sm:p-8 bg-white border-t border-slate-100 shrink-0">
          <div className="w-full">
            <div className="relative flex items-center">
              <div className="absolute left-6 text-slate-300 hidden sm:block">
                <Sparkles size={20} />
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSendMessage()}
                placeholder="Como a Minerva pode te ajudar hoje?"
                className="w-full h-12 sm:h-16 px-4 sm:pl-16 pr-[52px] sm:pr-20 bg-slate-50 border-2 border-slate-100 rounded-[16px] sm:rounded-[20px] text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/20 transition-all placeholder:text-slate-400 text-[13px] sm:text-base shadow-inner truncate"
                disabled={isTyping}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-1.5 sm:right-3 w-[36px] h-[36px] sm:w-12 sm:h-12 bg-primary text-white rounded-[10px] sm:rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-md sm:shadow-xl shadow-primary/20 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Send size={16} className="relative z-10 sm:w-5 sm:h-5" />
              </button>
            </div>
            <p className="mt-2 sm:mt-4 text-center text-[8px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">Powered by Minerva v4.0 • iaNow Security Engine</p>
          </div>
        </div>
      </div>

      {/* History Sidebar Backdrop for Mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-slate-900/40 z-[90] lg:hidden backdrop-blur-sm transition-opacity duration-300",
          isHistoryOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsHistoryOpen(false)}
      />

      {/* History Sidebar - Right Side */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-[100] bg-slate-200 border-l border-slate-100 shadow-2xl lg:shadow-none lg:static transition-all duration-300 flex flex-col group h-[100dvh] lg:h-full overflow-hidden",
        isHistoryOpen ? "translate-x-0 w-[85vw] sm:w-80 lg:opacity-100" : "translate-x-full w-[85vw] sm:w-80 lg:w-0 lg:translate-x-0 lg:opacity-0 lg:pointer-events-none"
      )}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0">
          <div className="flex flex-col gap-0.5">
            <h4 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 text-sm">
              <Clock size={14} className="text-primary" />
              Histórico
            </h4>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sessões Recentes</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-900 lg:hidden transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => {
                const newId = `session-${Date.now()}`
                setSessionId(newId)
                localStorage.setItem('minerva_active_session_id', newId)
                setWizardData({}) // Clear the wizard buffer for the new chat
                const greeting = `Olá, ${userName}. Sou a Minerva, sua inteligência estratégica e jurídica. Como posso te auxiliar hoje?`
                const initialMsg: Message = { role: 'bot', content: greeting }
                setMessages([initialMsg])
                saveMessagesToStorage(newId, [initialMsg])
                if (window.innerWidth < 1024) setIsHistoryOpen(false) // auto-close on mobile
              }}
              className="group relative flex items-center justify-center p-2.5 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 overflow-hidden"
              title="Nova Conversa"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <Plus size={20} className="relative z-10" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/50">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSessionId(item.id)
                localStorage.setItem('minerva_active_session_id', item.id)
                loadMessagesFromStorage(item.id)
                if (window.innerWidth < 1024) setIsHistoryOpen(false) // auto-close on mobile
              }}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer group/item relative flex items-start gap-3",
                sessionId === item.id
                  ? "bg-white border-slate-200 shadow-sm ring-1 ring-primary/5"
                  : "border-transparent hover:bg-white/60 hover:border-slate-100"
              )}
            >
              {/* Active Indicator Bar */}
              {sessionId === item.id && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
              )}

              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                sessionId === item.id ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400 group-hover/item:bg-primary/5 group-hover/item:text-primary/60"
              )}>
                <MessageSquare size={16} />
              </div>

              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mr-6">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.date}</span>
                </div>
                <h5 className={cn(
                  "text-[13px] font-bold leading-tight line-clamp-2 transition-colors",
                  sessionId === item.id ? "text-slate-900" : "text-slate-600 group-hover/item:text-slate-900"
                )}>
                  {item.title}
                </h5>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const newHistory = history.filter(h => h.id !== item.id)
                  setHistory(newHistory)
                  localStorage.setItem('minerva_chat_history', JSON.stringify(newHistory))
                  localStorage.removeItem(`minerva_messages_${item.id}`)
                  localStorage.removeItem(`minerva_wizard_${item.id}`)

                  if (sessionId === item.id) {
                    const newId = `session-${Date.now()}`
                    setSessionId(newId)
                    localStorage.setItem('minerva_active_session_id', newId)
                    loadMessagesFromStorage(newId)
                  }
                }}
                className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all p-1 bg-white rounded-md shadow-sm border border-slate-100"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {history.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                <MessageSquare size={32} className="text-slate-400" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Nenhum histórico encontrado ainda</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function ChatForm({
  fields,
  onSubmit,
  isLastMessage,
  isGuest
}: {
  fields: { id: string, label: string, options?: string[], isContact?: boolean, defaultValue?: string }[],
  onSubmit: (data: Record<string, string>) => void,
  isLastMessage: boolean,
  isGuest?: boolean
}) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initials: Record<string, string> = {}
    fields.forEach(f => {
      if (f.defaultValue) initials[f.id] = f.defaultValue
      // Se for visitante e for um campo de contato, inicia como manual
      if (isGuest && f.isContact) initials[f.id] = 'manual'
    })
    return initials
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14)
  }

  const formatCnpj = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      .slice(0, 18)
  }

  const formatDoc = (value: string, type: 'PF' | 'PJ') => {
    return type === 'PJ' ? formatCnpj(value) : formatCpf(value)
  }

  if (isSubmitted) return null

  return (
    <div className="mt-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase text-primary tracking-widest">
        <Plus size={12} /> Preencha os campos abaixo
      </div>

      <div className="grid grid-cols-1 gap-4">
        {fields.map(field => (
          <div key={field.id} className="space-y-1.5 flex flex-col">
            {field.isContact ? (
              <div className="space-y-3">
                {!isGuest && (
                  <PartnerSelector
                    label={field.label}
                    selectedId={formData[`${field.id}`]}
                    onSelect={(partner) => {
                      setFormData(prev => ({
                        ...prev,
                        [field.id]: partner.id,
                        [`${field.id}_name`]: partner.name,
                        [`${field.id}_doc`]: partner.document,
                        [`${field.id}_address`]: partner.address || '',
                        [`${field.id}_contact`]: partner.email || partner.phone || '',
                        [`${field.id}_rg`]: partner.metadata?.rg || '',
                        [`${field.id}_nationality`]: partner.metadata?.nacionalidade || partner.metadata?.nationality || '',
                        [`${field.id}_maritalStatus`]: partner.metadata?.estado_civil || partner.metadata?.maritalStatus || '',
                        [`${field.id}_profession`]: partner.metadata?.profissao || partner.metadata?.profession || '',
                      }))
                    }}
                    className={cn(!isLastMessage && "opacity-60 pointer-events-none")}
                  />
                )}

                {formData[field.id] === 'manual' && (
                  <div className={cn("flex flex-col gap-4 p-5 bg-amber-50/50 border border-amber-100 rounded-2xl animate-in fade-in duration-300", !isLastMessage && "opacity-60 pointer-events-none", isGuest && "mt-2")}>
                    {isGuest && (
                      <div className="text-[10px] font-black uppercase text-amber-700/50 tracking-widest mb-1">
                        Dados da {field.label}
                      </div>
                    )}

                    {/* Tipo de Pessoa Toggle */}
                    <div className="flex bg-white rounded-xl p-1 border border-amber-200/50 shadow-sm self-start">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => {
                          const isCurrentlyPf = (!prev[`${field.id}_type`] || prev[`${field.id}_type`] === 'PF')
                          if (!isCurrentlyPf) return prev // already PF
                          return {
                            ...prev,
                            [`${field.id}_type`]: 'PF',
                            [`${field.id}_doc`]: formatDoc(prev[`${field.id}_doc`] || '', 'PF')
                          }
                        })}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                          (!formData[`${field.id}_type`] || formData[`${field.id}_type`] === 'PF')
                            ? "bg-amber-100 text-amber-800 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Pessoa Física
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => {
                          const isCurrentlyPj = prev[`${field.id}_type`] === 'PJ'
                          if (isCurrentlyPj) return prev // already PJ
                          return {
                            ...prev,
                            [`${field.id}_type`]: 'PJ',
                            [`${field.id}_doc`]: formatDoc(prev[`${field.id}_doc`] || '', 'PJ')
                          }
                        })}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                          formData[`${field.id}_type`] === 'PJ'
                            ? "bg-amber-100 text-amber-800 shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Pessoa Jurídica
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">
                          {formData[`${field.id}_type`] === 'PJ' ? 'Razão Social' : 'Nome Completo'}
                        </label>
                        <input
                          type="text"
                          value={formData[`${field.id}_name`] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_name`]: e.target.value }))}
                          placeholder={formData[`${field.id}_type`] === 'PJ' ? 'Empresa LTDA...' : 'Nome do contato...'}
                          className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          disabled={!isLastMessage}
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">
                          {formData[`${field.id}_type`] === 'PJ' ? 'CNPJ' : 'CPF'}
                        </label>
                        <input
                          type="text"
                          value={formData[`${field.id}_doc`] || ''}
                          onChange={(e) => setFormData(prev => {
                            const pType = prev[`${field.id}_type`] as 'PF' | 'PJ' || 'PF'
                            return {
                              ...prev,
                              [`${field.id}_doc`]: formatDoc(e.target.value, pType)
                            }
                          })}
                          placeholder={formData[`${field.id}_type`] === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                          className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          disabled={!isLastMessage}
                        />
                      </div>

                      {formData[`${field.id}_type`] === 'PJ' && (
                        <>
                          <div className="space-y-1.5 flex flex-col">
                            <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">Nome do Rep. Legal (Opcional)</label>
                            <input
                              type="text"
                              value={formData[`${field.id}_rep_name`] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_rep_name`]: e.target.value }))}
                              placeholder="Nome do Sócio/Diretor (Se souber)..."
                              className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                              disabled={!isLastMessage}
                            />
                          </div>
                          <div className="space-y-1.5 flex flex-col">
                            <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">CPF do Representante (Opcional)</label>
                            <input
                              type="text"
                              value={formData[`${field.id}_rep_doc`] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_rep_doc`]: formatCpf(e.target.value) }))}
                              placeholder="000.000.000-00 (Se souber)"
                              className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                              disabled={!isLastMessage}
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">E-mail / Telefone (Opcional)</label>
                        <input
                          type="text"
                          value={formData[`${field.id}_contact`] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_contact`]: e.target.value }))}
                          placeholder="contato@exemplo.com ou (11) 9..."
                          className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          disabled={!isLastMessage}
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-[10px] font-black uppercase text-amber-700/70 tracking-wider ml-1">Endereço Completo (Opcional)</label>
                        <input
                          type="text"
                          value={formData[`${field.id}_address`] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_address`]: e.target.value }))}
                          placeholder="Rua, Número, Bairro, Cidade - UF"
                          className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                          disabled={!isLastMessage}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : field.options ? (
              <FormSelect
                label={field.label}
                value={formData[field.id] || ''}
                onChange={(val) => setFormData(prev => ({ ...prev, [field.id]: val }))}
                options={field.options}
                className={cn(!isLastMessage && "opacity-60 pointer-events-none")}
              />
            ) : (
              <>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">{field.label}</label>
                <textarea
                  value={formData[field.id] || ''}
                  onChange={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    setFormData(prev => ({ ...prev, [field.id]: target.value }))
                    // Auto-resize
                    target.style.height = 'auto'
                    target.style.height = target.scrollHeight + 'px'
                  }}
                  placeholder="..."
                  rows={1}
                  className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300 min-h-[46px] resize-none overflow-hidden"
                  disabled={!isLastMessage}
                />
              </>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          setIsSubmitted(true)
          onSubmit(formData)
        }}
        disabled={!isLastMessage || fields.some(f => {
          if (!formData[f.id]?.trim()) return true;
          if (formData[f.id] === 'manual') {
            const missingBasic = !formData[`${f.id}_name`]?.trim() || !formData[`${f.id}_doc`]?.trim()
            if (missingBasic) return true;
          }
          return false;
        })}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
      >
        Enviar Informações <Send size={12} />
      </button>
    </div>
  )
}
