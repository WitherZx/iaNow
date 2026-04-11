import { Message, WizardField } from '../types/minerva'

/**
 * Smart Context Scraper: Varre o histórico em busca de padrões de diagnóstico
 * para preencher formulários de fallback.
 */
export const scrapeConversationContext = (msgs: { role: string, content: string }[]) => {
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
    // Jurídico & Justiça
    { id: 'tipoContrato', regex: /(?:^|\n)[*#\s-]*Tipo de Documento[*#\s]*[:\-]\s*(.*)/i },
    { id: 'perfilPartes', regex: /(?:^|\n)[*#\s-]*Perfil das Partes[*#\s]*[:\-]\s*(.*)/i },
    { id: 'objetivo', regex: /(?:^|\n)[*#\s-]*Objetivo(?: (?:do )?Documento| (?:do )?Contrato)?[*#\s]*[:\-]\s*(.*)/i },
    { id: 'foro', regex: /(?:^|\n)[*#\s-]*Foro[*#\s]*(?:\/ Comarca)?[*#\s]*[:\-]\s*(.*)/i },
    // Justiça specific
    { id: 'problemType', regex: /(?:^|\n)[*#\s-]*Tipo de Problema[*#\s]*[:\-]\s*(.*)/i },
    { id: 'whatHappened', regex: /(?:^|\n)[*#\s-]*O que aconteceu\??[*#\s]*[:\-]\s*(.*)/i },
    { id: 'whenHappened', regex: /(?:^|\n)[*#\s-]*Quando aconteceu\??[*#\s]*[:\-]\s*(.*)/i },
    { id: 'materialDamage', regex: /(?:^|\n)[*#\s-]*Prejuízo Material[*#\s]*[:\-]\s*(.*)/i },
    { id: 'moralDamage', regex: /(?:^|\n)[*#\s-]*Danos Morais[*#\s]*[:\-]\s*(.*)/i },
    // Parties Auto-Matching Patterns
    { id: 'autor', regex: /(?:^|\n)[*#\s-]*Autor \(Polo Ativo\)[*#\s]*[:\-]\s*(.*)/i },
    { id: 'reu', regex: /(?:^|\n)[*#\s-]*Réu \(Polo Passivo\)[*#\s]*[:\-]\s*(.*)/i },
    { id: 'parteA', regex: /(?:^|\n)[*#\s-]*Parte A[*#\s]*[:\-]\s*(.*)/i },
    { id: 'parteB', regex: /(?:^|\n)[*#\s-]*Parte B[*#\s]*[:\-]\s*(.*)/i },
    { id: 'sideToDefend', regex: /(?:^|\n)[*#\s-]*Polo de Defesa[*#\s]*[:\-]\s*(.*)/i }
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
export const detectStepFromContent = (content: string): number | null => {
  const c = content.toLowerCase()
  if (c.includes('contexto da empresa') || c.includes('etapa 1') || c.includes('etapa um')) return 1
  if (c.includes('operação') || c.includes('digitalização') || c.includes('etapa 2') || c.includes('etapa dois')) return 2
  if (c.includes('riscos') || c.includes('blindagem') || c.includes('etapa 3') || c.includes('etapa três')) return 3
  if (c.includes('visão') || c.includes('futuro') || c.includes('etapa 4') || c.includes('etapa quatro')) return 4
  if (c.includes('resumo do diagnóstico') || c.includes('plano de ação') || c.includes('gerar diagnóstico')) return 5
  return null
}

export const parseSuggestions = (content: string) => {
  const suggestions: string[] = []
  const regex = /\[SUGGESTION:\s*(.*?)\]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) suggestions.push(match[1])
  }
  const cleanText = content.replace(/\[SUGGESTION:\s*.*?\]/g, '').trim()
  return { cleanText, suggestions }
}

export const parseActions = (text: string) => {
  const actionRegex = /\[ACTION: (.*?)\]/g
  const matches = Array.from(text.matchAll(actionRegex))
  const cleanText = text.replace(actionRegex, '').trim()

  return {
    text: cleanText,
    actions: matches.map(m => m[1])
  }
}

export const parseForm = (text: string) => {
  const formRegex = /\[FORM: (.*?)\]/g
  const match = formRegex.exec(text)
  const cleanText = text.replace(formRegex, '').trim()

  if (!match) return { text: cleanText, fields: [] }

  const fields: WizardField[] = match[1].split(',').map(f => {
    const parts = f.split('|').map(s => s.trim())
    const id = parts[0]
    const label = parts[1] || id
    const optionsStr = parts[2]
    const defaultValue = parts[3]

    const isContact = optionsStr === 'CONTACT'
    const options = optionsStr && !isContact ? optionsStr.split(';').map(o => o.trim()) : undefined

    return { 
      id, 
      label, 
      options, 
      isContact, 
      defaultValue, 
      type: isContact ? 'contact' : options ? 'select' : 'text' 
    }
  })

  return {
    text: cleanText,
    fields
  }
}

export const filterSystemHallucinations = (content: string) => {
  // Strips out technical tags and system-generated messages
  return content
    .split('\n')
    .filter(line => !line.trim().startsWith('Informações de') && !line.includes('enviadas:'))
    .join('\n')
    .replace(/\[FORM_TRIGGER:.*?\]/g, '') // Remove redundant trigger tags
    .trim()
}

export const parseJsonMetadata = (content: string) => {
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

  return null
}
