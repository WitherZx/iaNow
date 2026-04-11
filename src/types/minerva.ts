export type MessageRole = 'bot' | 'user' | 'assistant' | 'system' | 'tool'

export interface Message {
  role: MessageRole
  content: string
  toolCalls?: any[]
}

export interface MinervaAssistantProps {
  userName: string
  onToggleView: () => void
  initialPrompt?: string
  defaultModule?: 'justica' | 'juridico' | 'estrategia'
}

export interface WizardField {
  id: string
  label: string
  type: 'text' | 'select' | 'contact'
  options?: string[]
  isContact?: boolean
  defaultValue?: string
}

export interface WizardStep {
  title: string
  fields: WizardField[]
}

export type ModuleType = 'justica' | 'juridico' | 'estrategia'

export type WizardConfig = Record<ModuleType, Record<number, WizardStep>>
