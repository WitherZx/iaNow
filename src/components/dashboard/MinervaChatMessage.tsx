'use client'

import React from 'react'
import { User, Check, Loader2, ArrowRight, Scale, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Message, ModuleType } from '@/types/minerva'
import { 
  filterSystemHallucinations, 
  parseSuggestions, 
  parseActions, 
  parseForm, 
  parseJsonMetadata, 
  detectStepFromContent,
  scrapeConversationContext
} from '@/utils/minerva-parsers'
import { WIZARD_CONFIG } from '@/constants/minerva-wizard'
import { MinervaChatForm } from './MinervaChatForm'

interface MinervaChatMessageProps {
  msg: Message
  index: number
  isLast: boolean
  isTyping: boolean
  isProcessing: boolean
  activeModule: ModuleType | 'general'
  wizardStep: number
  maxSteps: number
  wizardData: Record<string, any>
  allMessages: Message[]
  onSendMessage: (content: string) => void
  onFormSubmit: (fields: any[], data: Record<string, string>) => void
  onActionClick: (path: string) => void
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

export const MinervaChatMessage: React.FC<MinervaChatMessageProps> = React.memo(({
  msg,
  index,
  isLast,
  isTyping,
  isProcessing,
  activeModule,
  wizardStep,
  maxSteps,
  wizardData,
  allMessages,
  onSendMessage,
  onFormSubmit,
  onActionClick
}) => {
  const isBot = msg.role === 'bot' || msg.role === 'assistant'
  const filteredContent = msg.role === 'user' ? msg.content : filterSystemHallucinations(msg.content)
  
  const { cleanText: textWithSuggestions, suggestions } = parseSuggestions(filteredContent)
  const { text: textNoActions, actions: legacyActions } = parseActions(textWithSuggestions)
  const { text: textNoLegacyForm, fields: legacyFields } = parseForm(textNoActions)
  const parsedMeta = parseJsonMetadata(textNoLegacyForm)
  
  const text = parsedMeta?.text || textNoLegacyForm
  let formFields = parsedMeta?.fields || legacyFields
  let formTitle = parsedMeta?.title || ''
  let actions = [...legacyActions]

  if (parsedMeta?.leakedAction && !actions.includes(parsedMeta.leakedAction)) {
    actions.push(parsedMeta.leakedAction)
  }

  // Detect tool-based forms/actions
  const toolForm = msg.toolCalls?.find(tc => tc.function?.name === 'show_form')
  const toolAction = msg.toolCalls?.find(tc => tc.function?.name === 'trigger_action')

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
      if (args.path && !actions.includes(args.path)) {
        actions = [...actions, args.path]
      }
    } catch (e) { }
  }

  // REGRA DETERMINISTA: Injeção do Formulário da Etapa Atual ou Passada
  const messageStep = isBot ? detectStepFromContent(msg.content) : null
  
  if (isBot && activeModule && activeModule !== 'general') {
    const targetStep = messageStep || (isLast && !isTyping ? wizardStep : null)
    const config = (WIZARD_CONFIG as any)[activeModule]?.[targetStep || 0]
    
    if (config && formFields.length === 0) {
      formTitle = config.title
      const scrapedData = scrapeConversationContext(allMessages.slice(0, index + 1))

      formFields = config.fields.map((f: any) => ({
        ...f,
        defaultValue: wizardData[f.id] || scrapedData[f.id] || f.defaultValue
      }))
    }
  }

  // Injeção de Ação Final Forçada (Conclusão do Wizard)
  const isFinalStep = wizardStep > maxSteps
  if (isBot && !isTyping && isLast && isFinalStep && actions.length === 0 && formFields.length === 0) {
    if (activeModule === 'estrategia') actions = ['/estrategia/novo']
    if (activeModule === 'juridico') actions = ['/juridico/novo']
    if (activeModule === 'justica') actions = ['/justica/novo']
  }

  return (
    <div className={cn(
      "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-500",
      msg.role === 'user' ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[95%] sm:max-w-[85%] flex gap-3 sm:gap-4",
        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
      )}>
        <div className={cn(
          "w-8 h-8 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm overflow-hidden",
          msg.role === 'user' ? "bg-slate-950 text-white" : "bg-[#1d4ed8] border border-slate-100"
        )}>
          {msg.role === 'user' ? (
            <User size={16} />
          ) : (
            <img src="/minerva-icon.png" alt="Minerva" className="w-8 h-8 object-contain" />
          )}
        </div>

        <div className="space-y-4 flex-1 min-w-0">
          <div className={cn(
            "p-5 text-sm sm:text-[15px] font-medium leading-relaxed whitespace-pre-wrap transition-all duration-300",
            msg.role === 'user'
              ? "bg-slate-900 text-white rounded-[24px] rounded-tr-none shadow-lg shadow-slate-200/50"
              : "bg-blue-100 text-slate-800 rounded-[24px] rounded-tl-none border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
          )}>
            {isBot && (
              <div className="flex items-center gap-1.5 mb-2.5 opacity-60">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Minerva - Inteligência Jurídica {formFields.length > 0 ? "• Coleta Ativa" : ""}
                </span>
              </div>
            )}

            {formTitle && <div className="mb-2 text-[10px] font-black uppercase text-teal-600 tracking-widest">{formTitle}</div>}

            <div className="prose prose-slate prose-sm max-w-none break-words">
              {text || (isTyping && isLast ? (
                <div className="flex gap-1 items-center py-2">
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                </div>
              ) : null)}
            </div>

            {formFields.length > 0 && isBot && !isTyping && isLast && (
              <div>
                <MinervaChatForm
                  fields={formFields}
                  onSubmit={(data) => onFormSubmit(formFields, data)}
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
                  onClick={() => onSendMessage(s)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 text-xs font-bold hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/30 transition-all active:scale-95 shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {actions.length > 0 && isLast && (
            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-300">
              {actions.map((path, idx) => (
                <button
                  key={idx}
                  onClick={() => onActionClick(path)}
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
}, (prev, next) => {
  // Memoization rule: only re-render if its the last message and something relevant changed,
  // or if its index is relevant to the new state.
  if (prev.isLast !== next.isLast) return false
  if (next.isLast) {
      if (prev.isTyping !== next.isTyping) return false
      if (prev.isProcessing !== next.isProcessing) return false
      if (prev.wizardStep !== next.wizardStep) return false
  }
  if (prev.msg.content !== next.msg.content) return false
  if (prev.msg.toolCalls?.length !== next.msg.toolCalls?.length) return false
  return true
})
