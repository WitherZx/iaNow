import { ConflictItem } from './types'

const CONFLICT_TTL = 1000 * 60 * 10 // 10 minutos (TTL sugerido pelo arquiteto)

type Listener = (conflicts: ConflictItem[]) => void

/**
 * Store global em memória para gerenciamento de conflitos.
 * Centraliza a inteligência de detecção visual e fila de resolução.
 */
class ConflictStore {
  private conflicts: ConflictItem[] = []
  private listeners: Set<Listener> = new Set()

  constructor() {
    // Intervalo de limpeza automática (TTL)
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60000) // Verifica a cada minuto
    }
  }

  /**
   * Adiciona um novo conflito detectado pelo Sync Engine.
   * Aplica DEDUPLICAÇÃO por entityId para evitar lixo em memória.
   */
  addConflict(item: Omit<ConflictItem, 'id' | 'createdAt' | 'status'>) {
    const newConflict: ConflictItem = {
      ...item,
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      createdAt: Date.now(),
      status: 'pending'
    }

    // REGRA OBRIGATÓRIA: Manter apenas o conflito mais recente por entidade
    this.conflicts = [
      ...this.conflicts.filter(c => c.entityId !== item.entityId),
      newConflict
    ]

    this.notify()
  }

  /**
   * Remove um conflito da store após resolução concluída.
   */
  resolveConflict(id: string) {
    this.conflicts = this.conflicts.filter(c => c.id !== id)
    this.notify()
  }

  /**
   * Retorna lista imutável de conflitos pendentes.
   */
  getConflicts() {
    return [...this.conflicts]
  }

  /**
   * Verifica se uma entidade específica possui conflito pendente (Visual Lock).
   */
  has(entityId: string) {
    return this.conflicts.some(c => c.entityId === entityId)
  }

  /**
   * Padrão Observer para UI (Toasts/Modais).
   */
  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.getConflicts()) 
    return () => { this.listeners.delete(listener) }
  }

  /**
   * Limpa conflitos expirados para evitar memória suja.
   */
  private cleanup() {
    const now = Date.now()
    const valid = this.conflicts.filter(c => now - c.createdAt < CONFLICT_TTL)
    
    if (valid.length !== this.conflicts.length) {
      this.conflicts = valid
      this.notify()
    }
  }

  private notify() {
    this.listeners.forEach(l => l(this.getConflicts()))
  }
}

export const conflictStore = new ConflictStore()
