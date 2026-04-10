'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  Check,
  X as CloseIcon
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { FormSelect } from '@/components/shared/FormSelect'
import { PartnerSelector } from '@/components/shared/PartnerSelector'
import { toast } from 'sonner'
import {
  createChatSession,
  getChatMessages,
  saveChatMessage,
  getLatestSession,
  updateSessionMetadata,
  deleteChatSession
} from '@/app/actions/chat-actions'
import { addKnowledgeDocument } from '@/app/actions/kb-actions'
import { transcribeDocument } from '@/app/actions/ai-actions'

interface Message {
  role: 'bot' | 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: any[]
}

interface MinervaAssistantProps {
  userName: string
  onToggleView: () => void
  initialPrompt?: string
  defaultModule?: 'justica' | 'juridico' | 'estrategia'
}

// Persistent but volatile storage to track if we already started a session in THIS browser tab lifecycle.
// This survives component re-mounts (like when switching tabs) but is cleared on Page Refresh (F5).
let isScriptFirstLoad = true
let lastActiveSessionId: string | null = null

// CONFIGURAÇÃO ESTÁTICA DO WIZARD (DETERMINISMO)
const WIZARD_CONFIG = {
  estrategia: {
    1: {
      title: 'Contexto da Empresa',
      fields: [
        { id: 'companyName', label: 'Nome da Organização', type: 'text' },
        { id: 'sector', label: 'Setor de Atuação', type: 'select', options: ['Tecnologia & Software', 'Serviços Jurídicos', 'Varejo & E-commerce', 'Indústria & Logística', 'Serviços em Geral', 'Outro...'] },
        { id: 'offeredSolution', label: 'Solução Oferecida', type: 'text' },
        { id: 'size', label: 'Tamanho da Equipe', type: 'select', options: ['1-10', '11-50', '51-200', '200+'] },
        { id: 'revenue', label: 'Faturamento Mensal', type: 'select', options: ['Até R$ 50k', 'R$ 50k - R$ 200k', 'R$ 200k - R$ 1M', 'Acima de R$ 1M'] }
      ]
    },
    2: {
      title: 'Operação & Digitalização',
      fields: [
        { id: 'businessModel', label: 'Modelo de Negócio', type: 'select', options: ['B2B', 'B2C', 'Híbrido', 'SaaS', 'Marketplace'] },
        { id: 'digitalLevel', label: 'Nível Digital (1-5)', type: 'select', options: ['1 - Analógico/Manual', '2 - Digitalização Básica', '3 - Intermediário', '4 - Avançado', '5 - Transformado'] },
        { id: 'mainPainPoint', label: 'Maior Gargalo/Incêndio hoje', type: 'text' }
      ]
    },
    3: {
      title: 'Riscos & Blindagem',
      fields: [
        { id: 'legalStatus', label: 'Status Jurídico', type: 'select', options: ['Estável', 'Riscos Trabalhistas', 'Fragilidade Contratual', 'Conflitos Societários'] },
        { id: 'financialControl', label: 'Controle Financeiro', type: 'select', options: ['Software ERP', 'Planilhas', 'Sem controle'] }
      ]
    },
    4: {
      title: 'Visão & Futuro',
      fields: [
        { id: 'goals', label: 'Objetivos Principais', type: 'text' },
        { id: 'growthObstacle', label: 'O que te impede de dobrar hoje?', type: 'text' }
      ]
    }
  },
  juridico: {
    1: {
      title: 'Contexto do Contrato',
      fields: [
        { id: 'tipoContrato', label: 'Tipo de Documento', type: 'text' },
        { id: 'perfilPartes', label: 'Perfil das Partes', type: 'text' },
        { id: 'objetivo', label: 'Objetivo do Contrato', type: 'text' },
        { id: 'foro', label: 'Foro / Comarca', type: 'text' }
      ]
    },
    2: {
      title: 'DADOS - Qualificação das Partes',
      fields: [
        { id: 'parteA', label: 'Contratante (Parte A)', type: 'contact', isContact: true },
        { id: 'parteB', label: 'Contratado (Parte B)', type: 'contact', isContact: true }
      ]
    },
    3: {
      title: 'REVISÃO - Parâmetros Finais',
      fields: [
        { id: 'parametros', label: 'Observações ou Cláusulas Específicas', type: 'text' }
      ]
    }
  },
  justica: {
    1: {
      title: 'Fatos & Ocorrência',
      fields: [
        { id: 'tipoProblema', label: 'Tipo de Problema', type: 'select', options: ['Consumidor', 'Trabalhista', 'Cível Geral', 'Imobiliário', 'Danificados', 'Outro'] },
        { id: 'relato', label: 'O que aconteceu?', type: 'text' },
        { id: 'quando', label: 'Quando aconteceu?', type: 'text' }
      ]
    }
  }
} as const;

// --- HELPERS (Hoisted/Outside) ---

/**
 * Smart Context Scraper: Varre o histórico em busca de padrões de diagnóstico
 * para preencher formulários de fallback.
 */
const scrapeConversationContext = (msgs: { role: string, content: string }[]) => {
  const context: Record<string, string> = {}
  const allText = msgs.map(m => m.content).join('\n')

  const patterns = [
    { id: 'companyName', regex: /(?:^|\n)[*#\s-]*Nome da Organização[*#\s]*[:\-]\s*(.*)/i },
    { id: 'sector', regex: /(?:^|\n)[*#\s-]*Setor de Atuação[*#\s]*[:\-]\s*(.*)/i },
    { id: 'offeredSolution', regex: /(?:^|\n)[*#\s-]*Solução Oferecida[*#\s]*[:\-]\s*(.*)/i },
    { id: 'size', regex: /(?:^|\n)[*#\s-]*Tamanho da Equipe[*#\s]*[:\-]\s*(.*)/i },
    { id: 'revenue', regex: /(?:^|\n)[*#\s-]*Faturamento Mensal[*#\s]*[:\-]\s*(.*)/i },
    { id: 'businessModel', regex: /(?:^|\n)[*#\s-]*Modelo de Negócio[*#\s\?]*[:\-]\s*(.*)/i },
    { id: 'digitalLevel', regex: /(?:^|\n)[*#\s-]*Nível Digital[*#\s\?]*[:\-]\s*(.*)/i },
    { id: 'mainPainPoint', regex: /(?:^|\n)[*#\s-]*Maior Gargalo\/Incêndio[*#\s\?]*[:\-]\s*(.*)/i },
    { id: 'legalStatus', regex: /(?:^|\n)[*#\s-]*Status Jurídico[*#\s\?]*[:\-]\s*(.*)/i },
    { id: 'financialControl', regex: /(?:^|\n)[*#\s-]*Controle Financeiro[*#\s\?]*[:\-]\s*(.*)/i },
    { id: 'goals', regex: /(?:^|\n)[*#\s-]*Objetivos Principais[*#\s\?]*[:\-]\s*(.*)/i },
    { id: 'growthObstacle', regex: /(?:^|\n)[*#\s-]*O que (?:te )?impede de dobrar hoje[*#\s\?]*[:\-]\s*(.*)/i },
    // Jurídico Fallbacks (Fuzzy)
    { id: 'tipoContrato', regex: /(?:^|\n)[*#\s-]*Tipo de Documento[*#\s]*[:\-]\s*(.*)/i },
    { id: 'perfilPartes', regex: /(?:^|\n)[*#\s-]*Perfil das Partes[*#\s]*[:\-]\s*(.*)/i },
    { id: 'objetivo', regex: /(?:^|\n)[*#\s-]*Objetivo(?: (?:do )?Documento| (?:do )?Contrato)?[*#\s]*[:\-]\s*(.*)/i },
    { id: 'foro', regex: /(?:^|\n)[*#\s-]*Foro[*#\s]*(?:\/ Comarca)?[*#\s]*[:\-]\s*(.*)/i }
  ]

  patterns.forEach(p => {
    const match = allText.match(p.regex)
    if (match && match[1]) {
      // Limpeza profunda: Remove asteriscos, cerquilhas e espaços do início/fim
      context[p.id] = match[1].replace(/[*_#~]/g, '').trim()
    }
  })

  return context
}

/**
 * Identifica qual etapa de um wizard uma mensagem da Minerva se refere
 * baseado em palavras-chave no conteúdo.
 */
const detectStepFromContent = (content: string): number | null => {
  const c = content.toLowerCase()
  if (c.includes('contexto da empresa') || c.includes('etapa 1') || c.includes('etapa um')) return 1
  if (c.includes('operação') || c.includes('digitalização') || c.includes('etapa 2') || c.includes('etapa dois')) return 2
  if (c.includes('riscos') || c.includes('blindagem') || c.includes('etapa 3') || c.includes('etapa três')) return 3
  if (c.includes('visão') || c.includes('futuro') || c.includes('etapa 4') || c.includes('etapa quatro')) return 4
  if (c.includes('resumo do diagnóstico') || c.includes('plano de ação') || c.includes('gerar diagnóstico')) return 5
  return null
}

const parseSuggestions = (content: string) => {
  const suggestions: string[] = []
  const regex = /\[SUGGESTION:\s*(.*?)\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) suggestions.push(match[1])
  }
  const cleanText = content.replace(/\[SUGGESTION:\s*.*?\]/g, '').trim()
  return { cleanText, suggestions }
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

const filterSystemHallucinations = (content: string) => {
  // Strips out technical tags and system-generated messages
  return content
    .split('\n')
    .filter(line => !line.trim().startsWith('Informações de') && !line.includes('enviadas:'))
    .join('\n')
    .replace(/\[FORM_TRIGGER:.*?\]/g, '') // Remove redundant trigger tags
    .trim()
}

const parseJsonMetadata = (content: string) => {
  const rawContent = filterSystemHallucinations(content)
  // Matches ```json ... ``` blocks or just a JSON object starting with { and containing key indicators
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g
  const rawJsonRegex = /{[\s\S]*?("fields"|"tool_code")[\s\S]*?}/g

  let match = jsonBlockRegex.exec(content)
  let potentialJson = ""
  let cleanText = content

  if (match) {
    potentialJson = match[1]
    cleanText = content.replace(match[0], '').trim()
  } else {
    rawJsonRegex.lastIndex = 0
    match = rawJsonRegex.exec(content)
    if (match) {
      potentialJson = match[0]
      cleanText = content.replace(match[0], '').trim()
    }
  }

  if (potentialJson) {
    try {
      const parsed = JSON.parse(potentialJson)

      // CASE 1: Leaked Form
      if (parsed.fields && Array.isArray(parsed.fields)) {
        return {
          fields: parsed.fields.map((f: any) => ({
            ...f,
            isContact: f.type === 'contact'
          })),
          title: parsed.title || '',
          text: cleanText,
          leakedAction: null
        }
      }

      // CASE 2: Leaked Action Tool Call
      if (parsed.tool_code === 'trigger_action' && parsed.parameters?.path) {
        return {
          fields: [],
          title: '',
          text: cleanText,
          leakedAction: parsed.parameters.path
        }
      }
    } catch (e) {
      // Not a valid JSON or not recognized metadata
    }
  }

  return { fields: [], title: '', text: content, leakedAction: null }
}

const getActionLabel = (path: string | undefined) => {
  if (!path) return "Acessar Módulo"
  if (path.includes('/juridico/novo')) return "Gerar Novo Contrato"
  if (path.includes('/justica/novo')) return "Gerar Protocolo"
  if (path.includes('/estrategia/novo')) return "Criar Diagnóstico"
  if (path.match(/^\/juridico\/[^/]+/)) return "Ver Contrato Gerado"
  if (path.match(/^\/justica\/[^/]+/)) return "Ver Caso Gerado"
  if (path.match(/^\/estrategia\/[^/]+/)) return "Ver Estratégia Gerada"
  if (path.includes('/parceiros')) return "Ver Hub de Parceiros"
  return "Acessar Módulo"
}

const getActionIcon = (path: string | undefined) => {
  if (!path) return null
  if (path.includes('/juridico/novo')) return <Scale size={16} />
  if (path.includes('/justica/novo')) return <ShieldCheck size={16} />
  if (path.includes('/estrategia/novo')) return <Zap size={16} />
  return null
}


export function MinervaAssistant({ userName, onToggleView, initialPrompt, defaultModule }: MinervaAssistantProps) {
  const queryClient = useQueryClient()
  const ACTIVE_SESSION_KEY = 'minerva_active_session_id'

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isInitializing, setIsInitializing] = useState(true)

  // Restore accidentally removed state
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isMultiline, setIsMultiline] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [history, setHistory] = useState<{ id: string, title: string, date: string }[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('minerva_chat_history')
    return saved ? JSON.parse(saved) : []
  })

  const [wizardData, setWizardData] = useState<Record<string, any>>({})
  const [lastSubmittedStep, setLastSubmittedStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const saved = localStorage.getItem(`minerva_last_step_${sessionId}`)
    return saved ? parseInt(saved) : 0
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const [latestResultPath, setLatestResultPath] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])


  const activeModule = (() => {
    if (defaultModule) return defaultModule

    const rawContent = messages.map(m => m.content).join(' ').toLowerCase()
    const content = rawContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    // 1. Check local progress (wizardData / scrapedData)
    const scraped = scrapeConversationContext(messages)
    if (scraped.companyName || scraped.sector || wizardData.companyName || wizardData.sector) return 'estrategia'
    if (wizardData.tipoContrato || wizardData.perfilPartes || scraped.tipoContrato) return 'juridico'
    if (wizardData.tipoProblema || wizardData.quando) return 'justica'

    // 2. Keyword matching with PRIORITY
    // Estratégia/Diagnóstico (High Priority)
    if (content.includes('estrategia') || content.includes('diagnostico') || content.includes('crescimento') || content.includes('organizacao') || content.includes('faturamento')) {
      return 'estrategia'
    }

    // Justiça/Processos
    if (content.includes('justica') || content.includes('processo') || content.includes('demanda') || content.includes('jus postulandi')) {
      return 'justica'
    }

    // Jurídico/Contratos
    if (content.includes('juridico') || content.includes('contrato') || content.includes('prestacao de servico')) {
      return 'juridico'
    }

    return 'general'
  })()

  const currentModuleConfig = (WIZARD_CONFIG as any)[activeModule]
  const maxSteps = currentModuleConfig ? Object.keys(currentModuleConfig).length : 4

  const wizardStep = (() => {
    // 1. Verificar se a ÚLTIMA mensagem do bot foi de sucesso
    const lastBotMsg = [...messages].reverse().find(m => m.role === 'bot')
    if (lastBotMsg?.content.includes('processado com sucesso')) return (maxSteps + 1)
    // Removido o return 4 fixo durante processamento para evitar que o form reapareça no final
    
    // Se já enviou todas as etapas do módulo atual, passamos para o estado final
    if (lastSubmittedStep >= maxSteps) return (maxSteps + 1)

    // Caso contrário, progredimos linearmente
    return Math.min(lastSubmittedStep + 1, maxSteps)
  })()

  const stepperLabels = (() => {
    switch (activeModule) {
      case 'justica':
        return ['DEMANDA', 'FATOS', 'DADOS', 'ANÁLISE', 'PROTOCOLO']
      case 'estrategia':
        return ['NEGÓCIO', 'DADOS', 'METAS', 'ANÁLISE', 'PLANO']
      case 'juridico':
        return ['CONTRATO', 'DADOS', 'REVISÃO', 'RESULTADO']
      case 'general':
      default:
        return ['SESSÃO', 'DADOS', 'REVISÃO', 'ANÁLISE', 'RESULTADO']
    }
  })()

  // Initialize session and history from Database
  useEffect(() => {
    const initSession = async () => {
      setIsInitializing(true)
      try {

        // Check if we should recover a session from a re-mount or start fresh
        const savedSessionId = localStorage.getItem(ACTIVE_SESSION_KEY) || lastActiveSessionId

        if (!isScriptFirstLoad && savedSessionId) {
          // It's a re-mount (e.g. tab switch), recover existing session
          const { messages: msgs } = await getChatMessages(savedSessionId)
          if (msgs) setMessages(msgs)
          setSessionId(savedSessionId)
          setIsInitializing(false)
          return
        }

        // It's a FRESH load (F5 or first visit) -> Create NEW session as requested
        const { session: newSession } = await createChatSession()
        if (newSession) {
          setSessionId(newSession.id)
          lastActiveSessionId = newSession.id // Backup in module scope
          isScriptFirstLoad = false // Mark as initialized
          localStorage.setItem(ACTIVE_SESSION_KEY, newSession.id)

          const greeting = `Olá, ${userName === 'Usuário' ? 'em que posso ajudar?' : userName + '! Como posso auxiliar sua empresa hoje?'}`
          const initialMsgs = [{ role: 'bot', content: greeting }] as Message[]
          setMessages(initialMsgs)
          setLastSubmittedStep(0)
          setWizardData({})

          // Fire and forget to avoid blocking UI
          saveChatMessage({
            sessionId: newSession.id,
            role: 'assistant',
            content: greeting
          }).catch(e => console.error('Error auto-saving greeting:', e))
        }
      } catch (e) {
        console.error('Failed to initialize session', e)
        toast.error('Erro ao conectar com a base de conhecimento.')
      } finally {
        setIsInitializing(false)
      }
    }

    initSession()
  }, []) // Fix: Stable dependency array to prevent React hook size error

  // Save/Update current session in history
  const updateHistory = (firstUserMsg: string) => {
    if (!sessionId) return
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

    const savedStep = localStorage.getItem(`minerva_last_step_${targetSessionId}`)
    setLastSubmittedStep(savedStep ? parseInt(savedStep) : 0)
  }

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Initial greeting if session is fresh
  useEffect(() => {
    if (messages.length === 0 && sessionId) {
      const greeting = `Olá, ${userName}. Sou a Minerva, sua inteligência estratégica e jurídica. Como posso te auxiliar na sua blindagem institucional hoje?`
      const initialMsgs = [{ role: 'bot', content: greeting }] as Message[]
      setMessages(initialMsgs)
      saveMessagesToStorage(sessionId, initialMsgs)
    }
  }, [userName, messages.length, sessionId])

  const handleSendMessage = async (text: string = inputValue) => {
    if (!sessionId) return

    const userMsg: Message = { role: 'user', content: text }

    // Mark this as the active session so the page restores it on next visit
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId)

    // Salvar no banco (async, mas aguardamos para garantir persistência)
    await saveChatMessage({
      sessionId: sessionId,
      role: 'user',
      content: text
    })

    // Reset do Wizard e Banner se o usuário puxar outro assunto após finalizar um fluxo
    if (wizardStep === 5) {
      setLatestResultPath(null)
      localStorage.removeItem(`minerva_result_${sessionId}`)
      setWizardData({})
      localStorage.removeItem(`minerva_wizard_${sessionId}`)
    }

    // Update history on first user message
    if (sessionId && messages.filter(m => m.role === 'user').length === 0) {
      updateHistory(text)
    }

    setMessages(prev => {
      const updated = [...prev, userMsg]
      saveMessagesToStorage(sessionId, updated)
      return updated
    })
    setInputValue('')
    setIsMultiline(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setIsTyping(true)

    try {
      let accumulatedContent = ''
      let toolCalls: any[] = []
      let recursionCount = 0
      const MAX_RECURSIONS = 3

      // Initialize the bot message placeholder
      setMessages(prev => [...prev, { role: 'bot', content: '' } as Message])
      // setIsTyping(true) já foi definido acima, mantemos assim para mostrar os 3 pontinhos


      const performRequest = async (isContinuation = false): Promise<string | null> => {
        try {
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            body: JSON.stringify({
              messages: [...messages, userMsg].map(m => ({
                role: m.role === 'bot' ? 'assistant' : 'user',
                content: m.content
              })),
              wizardData: wizardData,
              currentStep: wizardStep,
              activeModule: activeModule,
              lastSubmittedStep: lastSubmittedStep,
              isContinuation: isContinuation,
              partialResponse: accumulatedContent // Send what we have for context
            })
          })

          if (!response.ok) throw new Error('Falha na comunicação')

          const reader = response.body?.getReader()
          if (!reader) throw new Error('Reader indisponível')

          const decoder = new TextDecoder()
          let lastFinishReason: string | null = null

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

              const dataStr = trimmedLine.replace('data: ', '')
              if (dataStr === '[DONE]') break

              try {
                const data = JSON.parse(dataStr)
                const choice = data.choices[0]
                const delta = choice?.delta
                const content = delta?.content || ''
                const incomingToolCalls = delta?.tool_calls
                lastFinishReason = choice?.finish_reason || null

                if (content) {
                  accumulatedContent += content
                }

                if (incomingToolCalls) {
                  incomingToolCalls.forEach((tc: any) => {
                    const index = tc.index ?? 0
                    if (!toolCalls[index]) {
                      toolCalls[index] = {
                        id: tc.id,
                        type: 'function',
                        function: { name: tc.function?.name, arguments: '' }
                      }
                    }
                    if (tc.function?.arguments) {
                      toolCalls[index].function.arguments += tc.function.arguments
                    }
                  })
                }

                setMessages(prev => {
                  const newMessages = [...prev]
                  if (newMessages.length > 0) {
                    newMessages[newMessages.length - 1] = {
                      role: 'bot',
                      content: accumulatedContent,
                      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
                    } as Message
                  }
                  return newMessages
                })
              } catch (e) { }
            }
          }
          return lastFinishReason
        } catch (err) {
          console.error('Request failed:', err)
          return 'error'
        }
      }

      // Execute first request
      let finishReason = await performRequest()

      // Auto-continue loop if needed
      while (finishReason === 'length' && recursionCount < MAX_RECURSIONS) {
        recursionCount++
        console.log(`[Minerva] Auto-continuing response (${recursionCount}/${MAX_RECURSIONS})...`)
        finishReason = await performRequest(true)
      }

      // Process tool calls once fully finished
      if (toolCalls.length > 0) {
        toolCalls.forEach(tc => {
          try {
            const args = JSON.parse(tc.function.arguments)
            if (tc.function.name === 'show_form') { /* Metadata only */ }
            else if (tc.function.name === 'trigger_action') { /* Future agentic logic */ }
          } catch (e) { }
        })
      }

      // Final save
      setMessages(prev => {
        saveMessagesToStorage(sessionId!, prev)
        return prev
      })

      if (accumulatedContent || toolCalls.length > 0) {
        await saveChatMessage({
          sessionId: sessionId!,
          role: 'assistant',
          content: accumulatedContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : null
        })
      }

    } catch (error) {
      console.error('Chat Error:', error)
      setMessages(prev => {
        const updated = [...prev, { role: 'bot', content: "Desculpe, tive um problema de comunicação. Poderia tentar novamente?" } as Message]
        saveMessagesToStorage(sessionId!, updated)
        return updated
      })
    } finally {
      setIsTyping(false)
    }
  }



  const handleFormSubmit = (fields: { id: string, label: string }[], data: Record<string, string>) => {
    // Update accumulated wizard data
    const updatedData = { ...wizardData, ...data }
    setWizardData(updatedData)

    // Update Wizard progress markers
    const nextStep = lastSubmittedStep + 1
    setLastSubmittedStep(nextStep)
    if (sessionId) {
      localStorage.setItem(`minerva_last_step_${sessionId}`, nextStep.toString())

      // Persistir no banco (metadata da sessão)
      updateSessionMetadata(sessionId, {
        wizardData: updatedData,
        lastSubmittedStep: nextStep,
        last_active: new Date().toISOString()
      })
    }

    // Create a more professional, concise summary of data sent
    const formattedData = fields.map(f => {
      let val = data[f.id]
      if (data[`${f.id}_name`]) val = data[`${f.id}_name`] // Use descriptive name instead of UUID or 'manual'
      return `**${f.label}**: ${val || '-'}`
    }).join(' • ')

    const submissionText = `Informações de **${fields[0]?.label || 'dados'}** enviadas: ${formattedData}`
    // Aguardamos o envio para garantir que o estado seja consistente no histórico
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
        saveMessagesToStorage(sessionId!, updated)
        return updated
      })

      setIsProcessing(true)

      // Adicionar mensagem de feedback imediato no chat
      const processingMsg: Message = {
        role: 'bot',
        content: `Certo! Estou iniciando a geração do seu **${path.includes('estrategia') ? 'Diagnóstico Estratégico' : path.includes('juridico') ? 'Contrato Personalizado' : 'Protocolo Judicial'}**. 
        
Isso pode levar alguns segundos. Por favor, não feche esta janela.`
      }

      setMessages(prev => {
        const updated = [...prev, processingMsg]
        if (sessionId) saveMessagesToStorage(sessionId, updated)
        return updated
      })

      try {
        let endpoint = '/api/ai/strategy'
        let payload: any = {}

        if (path.includes('estrategia')) {
          endpoint = '/api/ai/strategy'
          payload = {
            diagnosticData: {
              companyName: wizardData.companyName || 'Empresa Confidencial',
              website: wizardData.website || '',
              sector: wizardData.sector || 'Tecnologia & Software',
              offeredSolution: wizardData.offeredSolution || 'Solução não informada',
              size: wizardData.size || '1-10',
              revenue: wizardData.revenue || 'Até R$ 50k',
              businessModel: wizardData.businessModel || 'B2B',
              digitalLevel: wizardData.digitalLevel || '3',
              mainPainPoint: wizardData.mainPainPoint || 'Crescimento e Escala',
              challenges: wizardData.challenges ? [wizardData.challenges] : [],
              legalStatus: wizardData.legalStatus || 'Estável',
              financialControl: wizardData.financialControl || 'Planilhas',
              goals: wizardData.goals ? [wizardData.goals] : [],
              growthObstacle: wizardData.growthObstacle || 'Não informado'
            }
          }
        } else if (path.includes('juridico')) {
          endpoint = '/api/juridico/gerar'
          payload = {
            tipoContrato: wizardData.tipo || wizardData.tipoContrato || wizardData.tipo_contrato || 'Contrato Genérico',
            nivel: wizardData.nivel || wizardData.nivel_blindagem || 'Básico',
            perfilPartes: (wizardData.roleA && wizardData.roleB)
              ? `${wizardData.roleA} vs ${wizardData.roleB}`
              : (wizardData.perfil || wizardData.perfil_partes || 'Amigável'),
            objetivo: wizardData.objetivo || wizardData.resumo_objeto || 'Formalizar relação entre as partes',
            foro: wizardData.foro || wizardData.comarca || wizardData.foro_eleicao || 'São Paulo - SP',
            partyA: {
              name: wizardData.parteA_name || wizardData.partyA_name || wizardData.parte1_name || 'Não informado',
              document: wizardData.parteA_doc || wizardData.partyA_doc || wizardData.parte1_doc || 'Não informado',
              address: wizardData.parteA_address || wizardData.partyA_address || wizardData.parte1_address || '',
              type: wizardData.parteA_type || wizardData.partyA_type || wizardData.parte1_type || 'PF',
              contact: wizardData.parteA_contact || wizardData.partyA_contact || wizardData.parte1_contact || '',
              rg: wizardData.parteA_rg || wizardData.partyA_rg || wizardData.parte1_rg || '',
              nationality: wizardData.parteA_nationality || wizardData.partyA_nationality || wizardData.parte1_nationality || '',
              maritalStatus: wizardData.parteA_maritalStatus || wizardData.partyA_maritalStatus || wizardData.parte1_maritalStatus || '',
              profession: wizardData.parteA_profession || wizardData.partyA_profession || wizardData.parte1_profession || '',
              birthDate: wizardData.parteA_birthDate || wizardData.partyA_birthDate || wizardData.parte1_birthDate || '',
              representedBy: wizardData.parteA_rep_name || wizardData.partyA_rep_name || '',
              representedByDoc: wizardData.parteA_rep_doc || wizardData.partyA_rep_doc || '',
              role: wizardData.parteA_role || 'Contratante'
            },
            partyB: {
              name: wizardData.parteB_name || wizardData.partyB_name || wizardData.parte2_name || 'Não informado',
              document: wizardData.parteB_doc || wizardData.partyB_doc || wizardData.parte2_doc || 'Não informado',
              address: wizardData.parteB_address || wizardData.partyB_address || wizardData.parte2_address || '',
              type: wizardData.parteB_type || wizardData.partyB_type || wizardData.parte2_type || 'PF',
              contact: wizardData.parteB_contact || wizardData.partyB_contact || wizardData.parte2_contact || '',
              rg: wizardData.parteB_rg || wizardData.partyB_rg || wizardData.parte2_rg || '',
              nationality: wizardData.parteB_nationality || wizardData.partyB_nationality || wizardData.parte2_nationality || '',
              maritalStatus: wizardData.parteB_maritalStatus || wizardData.partyB_maritalStatus || wizardData.parte2_maritalStatus || '',
              profession: wizardData.parteB_profession || wizardData.partyB_profession || wizardData.parte2_profession || '',
              birthDate: wizardData.parteB_birthDate || wizardData.partyB_birthDate || wizardData.parte2_birthDate || '',
              representedBy: wizardData.parteB_rep_name || wizardData.partyB_rep_name || '',
              representedByDoc: wizardData.parteB_rep_doc || wizardData.partyB_rep_doc || '',
              role: wizardData.parteB_role || 'Contratado'
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
              estimatedValue: wizardData.valor_causa || wizardData.valor || wizardData.valor_total || wizardData.total ||
                (Number(wizardData.materialDamage || wizardData.dano_material || 0) + Number(wizardData.moralDamage || wizardData.dano_moral || 0))
            }
          }
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload)
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.detail || data.error || 'Falha no processamento')
        }

        setIsProcessing(false)
        if (!isMounted.current) return

        const moduleName = path.includes('estrategia') ? 'Estratégia' : path.includes('juridico') ? 'Contrato' : 'Caso'
        const resultId = data.strategyId || data.documentId || data.demandId
        const resolvedResultPath = `${path.replace('/novo', '')}${resultId ? '/' + resultId : ''}`
        setLatestResultPath(resolvedResultPath)

        const finalMsg: Message = {
          role: 'bot',
          content: `✅ **${moduleName} processado com sucesso!**

A execução foi finalizada com base nos dados fornecidos e revisados através da Minerva. Clique no botão abaixo para abrir e visualizar o documento final.

[ACTION: ${resolvedResultPath}]`
        }

        setMessages(prev => {
          const updated = [...prev, finalMsg]
          saveMessagesToStorage(sessionId!, updated, resolvedResultPath)
          return updated
        })

        // Salvar mensagem de sucesso no banco
        await saveChatMessage({
          sessionId: sessionId!,
          role: 'assistant',
          content: finalMsg.content
        })

        // GLOBAL CACHE INVALIDATION: 
        // Force all repositories to refetch their lists and dashboard to update counts
        // We add a small 500ms delay to ensure Supabase DB persistence is fully committed
        setTimeout(async () => {
          const keysToInvalidate = ['dashboard-stats']
          if (path.includes('estrategia')) keysToInvalidate.push('strategies')
          if (path.includes('juridico')) keysToInvalidate.push('juridico-documents')
          if (path.includes('justica')) keysToInvalidate.push('justice-cases')

          for (const key of keysToInvalidate) {
            // Emite invalidação e força refetch imediato em background
            await queryClient.invalidateQueries({ queryKey: [key] })
            await queryClient.refetchQueries({ queryKey: [key] })
          }
          console.log(`[MinervaSync] Global refetch triggered for keys:`, keysToInvalidate)
        }, 500)

        // AUTO-NAVIGATE ONLY IF WE ARE STILL ON THE SAME PAGE WE STARTED
        // This prevents "rollbacks" where the user is somewhere else and gets pulled back
        if (pathname === '/justica/novo' || pathname === '/juridico/novo' || pathname === '/estrategia/novo') {
          router.push(resolvedResultPath)
        }
      } catch (error: any) {
        if (!isMounted.current) return
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



  return (
    <div className="w-full flex-1 flex flex-row bg-white overflow-hidden animate-in fade-in duration-500">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0  relative">
        {/* Header Contextual */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 overflow-hidden">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#1d4ed8] flex items-center justify-center overflow-hidden border border-slate-100 shadow-md relative shrink-0">
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
                {isProcessing ? 'Processando' : wizardStep >= 2 ? 'Em coleta' : (userName === 'Usuário' ? 'Conectado' : 'Sessão Ativa')}
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
          className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 custom-scrollbar scroll-smooth bg-slate-50/40"
        >
          <div className="w-full space-y-8">
            {messages.map((msg, i) => {
              const filteredContent = msg.role === 'user' ? msg.content : filterSystemHallucinations(msg.content)
              const { cleanText: textWithSuggestions, suggestions } = parseSuggestions(filteredContent)
              const { text: textNoActions, actions: legacyActions } = parseActions(textWithSuggestions)
              const { text: textNoLegacyForm, fields: legacyFields } = parseForm(textNoActions)
              const { text, fields: jsonFields, title: jsonTitle, leakedAction } = parseJsonMetadata(textNoLegacyForm)

              const isLast = i === messages.length - 1
              const isBot = msg.role === 'bot' || msg.role === 'assistant'

              // Detect tool-based forms/actions
              const toolForm = msg.toolCalls?.find(tc => tc.function?.name === 'show_form')
              const toolAction = msg.toolCalls?.find(tc => tc.function?.name === 'trigger_action')

              let formFields = toolForm ? [] : (jsonFields.length > 0 ? jsonFields : legacyFields)
              let formTitle = jsonTitle || ''
              let actions = [...legacyActions]

              if (leakedAction && !actions.includes(leakedAction)) {
                actions.push(leakedAction)
              }

              if (toolForm) {
                try {
                  const args = typeof toolForm.function.arguments === 'string'
                    ? (toolForm.function.arguments.trim() ? JSON.parse(toolForm.function.arguments) : {})
                    : (toolForm.function.arguments || {})

                  formFields = (args.fields || []).map((f: any) => ({
                    ...f,
                    isContact: f.type === 'contact' || f.isContact
                  }))
                  formTitle = args.title || ''
                } catch (e) {
                  console.error("Error parsing toolForm arguments:", e)
                }
              }

              if (toolAction) {
                try {
                  const args = typeof toolAction.function.arguments === 'string'
                    ? (toolAction.function.arguments.trim() ? JSON.parse(toolAction.function.arguments) : {})
                    : (toolAction.function.arguments || {})
                  if (!actions.includes(args.path)) {
                    actions = [...actions, args.path]
                  }
                } catch (e) { }
              }

              // REGRA DETERMINISTA: Injeção do Formulário da Etapa Atual ou Passada
              const messageStep = isBot ? detectStepFromContent(msg.content) : null
              
              // O formulário aparece se:
              // 1. É a última mensagem e estamos no passo atual (Wizard Ativo)
              // 2. OU encontramos uma etapa específica no conteúdo da mensagem (Histórico)
              if (isBot && activeModule && activeModule !== 'general') {
                const targetStep = messageStep || (isLast && !isTyping ? wizardStep : null)
                const config = (WIZARD_CONFIG as any)[activeModule]?.[targetStep || 0]
                
                if (config && formFields.length === 0) {
                  formTitle = config.title
                  const scrapedData = scrapeConversationContext(messages.slice(0, i + 1))

                  formFields = config.fields.map((f: any) => ({
                    ...f,
                    defaultValue: wizardData[f.id] || scrapedData[f.id] || f.defaultValue
                  }))
                }
              }

              // Injeção de Ação Final Forçada (Conclusão do Wizard)
              const isFinalStep = wizardStep > maxSteps || messageStep === 5
              if (isBot && !isTyping && isFinalStep && actions.length === 0) {
                if (activeModule === 'estrategia') actions = ['/estrategia/novo']
                if (activeModule === 'juridico') actions = ['/juridico/novo']
                if (activeModule === 'justica') actions = ['/justica/novo']
              }

              return (
                <div
                  key={i}
                  className={cn(
                    "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-500",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[95%] sm:max-w-[85%] flex gap-3 sm:gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-8 h-8 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm overflow-hidden",
                      msg.role === 'user' ? "bg-slate-950 text-white" : "bg-[#1d4ed8] border border-slate-100"
                    )}>
                      {msg.role === 'user' ? <User size={16} /> : <img src="/minerva-icon.png" alt="Minerva" className="w-8 h-8 object-contain" />}
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className={cn(
                        "p-5 text-sm sm:text-[15px] font-medium leading-relaxed whitespace-pre-wrap transition-all duration-300",
                        msg.role === 'user'
                          ? "bg-slate-900 text-white rounded-[24px] rounded-tr-none shadow-lg shadow-slate-200/50"
                          : "bg-blue-100 text-slate-800 rounded-[24px] rounded-tl-none border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
                      )}>
                        {/* Agent Badge (Premium) */}
                        {isBot && (
                          <div className="flex items-center gap-1.5 mb-2.5 opacity-60">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
                              Minerva - Inteligência Jurídica {formFields.length > 0 ? "• Coleta Ativa" : ""}
                            </span>
                          </div>
                        )}

                        {formTitle && <div className="mb-2 text-[10px] font-black uppercase text-teal-600 tracking-widest">{formTitle}</div>}

                        <div className="prose prose-slate prose-sm max-w-none">
                          {text || (isTyping && isLast ? (
                            <div className="flex gap-1 items-center py-2">
                              <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                            </div>
                          ) : null)}
                        </div>

                        {/* Form Fields Rendering (Tool or Legacy) */}
                        {formFields.length > 0 && isBot && !isTyping && (
                          <div>
                            <ChatForm
                              fields={formFields}
                              onSubmit={(data) => handleFormSubmit(formFields, data)}
                              isLastMessage={isLast}
                              isGuest={false}
                            />
                          </div>
                        )}
                      </div>

                      {/* Proactive Suggestions (Chips) */}
                      {isBot && isLast && suggestions.length > 0 && !isProcessing && (
                        <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in slide-in-from-bottom-1 duration-700 delay-300">
                          {suggestions.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(s)}
                              className="px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 text-xs font-bold hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/30 transition-all active:scale-95 shadow-sm"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons (Tool or Legacy) */}
                      {actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-300">
                          {actions.map((path, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAction(path)}
                              disabled={isProcessing}
                              className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all active:scale-95 group shadow-xl shadow-slate-200/50 disabled:opacity-50"
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

        {/* Input Area */}
        <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0">
          <div className="w-fullmx-auto space-y-4">
            <div className="relative group">
              <div className={cn(
                "absolute left-4 flex items-center gap-2 transition-all duration-200",
                isMultiline ? "top-3 sm:top-4" : "top-1/2 -translate-y-1/2"
              )}>
                <div className="p-2 text-primary/40">
                  <Sparkles size={18} />
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  const target = e.target
                  target.style.height = 'auto'
                  const newHeight = Math.min(target.scrollHeight, 150)
                  target.style.height = `${newHeight}px`
                  setIsMultiline(newHeight > 64)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!isProcessing && inputValue.trim()) handleSendMessage()
                  }
                }}
                placeholder={`Fale com a Minerva...`}
                disabled={isProcessing}
                rows={1}
                className="block w-full pl-14 pr-16 py-4 sm:py-5 bg-slate-50 border border-slate-200 rounded-[22px] text-sm sm:text-base outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm font-medium resize-none overflow-y-auto min-h-[56px] sm:min-h-[64px]"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isProcessing || !inputValue.trim()}
                className={cn(
                  "absolute right-2 p-2.5 sm:p-3 bg-slate-900 text-white rounded-[22px] hover:bg-primary transition-all active:scale-95 disabled:opacity-30 shadow-md shadow-slate-200 duration-200",
                  isMultiline ? "bottom-3 sm:bottom-4" : "top-1/2 -translate-y-1/2"
                )}
              >
                {isProcessing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            </div>
            <p className="text-[9px] sm:text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest px-4">
              iaNow Minerva AI • Inteligência Estratégica e Jurídica em Tempo Real
            </p>
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
                setLastSubmittedStep(0) // Reset wizard progress
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

                  // Delete from database
                  deleteChatSession(item.id).catch(err => console.error('Failed to delete session from DB:', err))

                  if (sessionId === item.id) {
                    localStorage.removeItem(ACTIVE_SESSION_KEY)
                    const newId = `session-${Date.now()}`
                    setSessionId(newId)
                    // No need to set ACTIVE_SESSION_KEY for a fresh, empty session yet
                    setMessages([])
                    setWizardData({})
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

function AutoExpandingTextarea({
  value,
  onChange,
  placeholder,
  disabled
}: {
  value: string,
  onChange: (val: string) => void,
  placeholder: string,
  disabled: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = () => {
    const target = ref.current
    if (target) {
      target.style.height = 'auto'
      target.style.height = (target.scrollHeight + 2) + 'px' // +2 to avoid micro-scrolling
    }
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300 min-h-[46px] resize-none overflow-hidden"
      disabled={disabled}
    />
  )
}

function ChatForm({
  fields,
  onSubmit,
  isLastMessage,
  isGuest
}: {
  fields: {
    id: string,
    label: string,
    options?: string[],
    isContact?: boolean,
    defaultValue?: string,
    // Pre-fill metadata
    doc?: string,
    address?: string,
    entityType?: string,
    contact?: string,
    repName?: string,
    repDoc?: string
  }[],
  onSubmit: (data: Record<string, string>) => void,
  isLastMessage: boolean,
  isGuest?: boolean
}) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initials: Record<string, string> = {}
    fields.forEach(f => {
      if (f.defaultValue) {
        // Se for campo de contato e o valor não parecer um UUID, assumimos que é um nome para preenchimento manual
        const isUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(f.defaultValue.replace(/[*_`]/g, ''))

        if (f.isContact && !isUuid && f.defaultValue !== 'manual') {
          initials[f.id] = f.defaultValue
          initials[`${f.id}_name`] = f.defaultValue

          // Apply extra metadata if present
          if (f.doc || f.address || f.entityType || f.contact || f.repName || f.repDoc) {
            initials[f.id] = 'manual' // Force manual mode if AI provided details
            if (f.doc) initials[`${f.id}_doc`] = f.doc
            if (f.address) initials[`${f.id}_address`] = f.address
            if (f.entityType) initials[`${f.id}_type`] = f.entityType
            if (f.contact) initials[`${f.id}_contact`] = f.contact
            if (f.repName) initials[`${f.id}_rep_name`] = f.repName
            if (f.repDoc) initials[`${f.id}_rep_doc`] = f.repDoc
          }
        } else {
          initials[f.id] = f.defaultValue
        }
      }
      // Se não houver dados no Hub e for um campo de contato sem valor padrão, inicia como manual
      if (f.isContact && !initials[f.id]) initials[f.id] = 'manual'
    })
    return initials
  })

  // Sincronizar formData se os campos mudarem ou novos dados forem detectados (Pre-fill Sync)
  useEffect(() => {
    setFormData(prev => {
      let changed = false
      const next = { ...prev }
      fields.forEach(f => {
        if (f.defaultValue && !prev[f.id] && f.defaultValue !== '...') {
          next[f.id] = f.defaultValue
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [fields])

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

  // if (isSubmitted) return null (Removed to keep form visible after submission)

  return (
    <div className="mt-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase text-primary tracking-widest">
        <Plus size={12} /> Preencha os campos abaixo
      </div>

      <div className="grid grid-cols-1 gap-4">
        {fields.map(field => (
          <div key={field.id} className="space-y-1.5 flex flex-col">
            {field.isContact ? (
              <div className="space-y-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black uppercase text-amber-700 tracking-wider ml-1">
                    Função da Parte no Contrato
                  </label>
                  <input
                    type="text"
                    value={formData[`${field.id}_role`] !== undefined ? formData[`${field.id}_role`] : field.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, [`${field.id}_role`]: e.target.value }))}
                    placeholder="Ex: Contratante, Prestador de Serviço, Locador..."
                    className="px-4 py-3 bg-white border border-amber-200/60 rounded-xl text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-slate-300"
                    disabled={!isLastMessage || isSubmitted}
                  />
                </div>

                <PartnerSelector
                  label="Selecionar Contato do Hub"
                  selectedId={formData[`${field.id}`]}
                  onSelect={(partner) => {
                    if (partner.id === 'manual') {
                      setFormData(prev => ({ ...prev, [field.id]: 'manual' }))
                      return
                    }

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
                  className={cn((!isLastMessage || isSubmitted) && "opacity-60 pointer-events-none")}
                />

                {formData[field.id] === 'manual' && (
                  <>

                    {/* Tipo de Pessoa Toggle */}
                    <div className="flex bg-white rounded-xl p-1 border border-amber-200/50 shadow-sm self-start">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          [`${field.id}_type`]: 'PF',
                          [`${field.id}_doc`]: formatDoc(prev[`${field.id}_doc`] || '', 'PF')
                        }))}
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
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          [`${field.id}_type`]: 'PJ',
                          [`${field.id}_doc`]: formatDoc(prev[`${field.id}_doc`] || '', 'PJ')
                        }))}
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
                              disabled={!isLastMessage || isSubmitted}
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
                          disabled={!isLastMessage || isSubmitted}
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
                          disabled={!isLastMessage || isSubmitted}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : field.options ? (
              <FormSelect
                label={field.label}
                value={formData[field.id] || ''}
                onChange={(val) => setFormData(prev => ({ ...prev, [field.id]: val }))}
                options={field.options}
                className={cn((!isLastMessage || isSubmitted) && "opacity-60 pointer-events-none")}
              />
            ) : (
              <>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">{field.label}</label>
                <AutoExpandingTextarea
                  value={formData[field.id] || ''}
                  onChange={(val) => setFormData(prev => ({ ...prev, [field.id]: val }))}
                  placeholder="..."
                  disabled={!isLastMessage || isSubmitted}
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
        disabled={!isLastMessage || isSubmitted || fields.some(f => {
          if (!formData[f.id]?.trim()) return true;
          if (formData[f.id] === 'manual') {
            const missingBasic = !formData[`${f.id}_name`]?.trim() || !formData[`${f.id}_doc`]?.trim()
            if (missingBasic) return true;
          }
          return false;
        })}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg",
          isSubmitted
            ? "bg-emerald-500 text-white shadow-emerald-200 cursor-default"
            : "bg-primary text-white hover:bg-slate-900 shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
        )}
      >
        {isSubmitted ? (
          <>Informações Enviadas <Check size={12} /></>
        ) : (
          <>Enviar Informações <Send size={12} /></>
        )}
      </button>
    </div>
  )
}
