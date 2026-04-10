import Dexie, { type Table } from 'dexie';

// ==========================================
// Interfaces de Dados
// ==========================================

/**
 * Cache do React Query persistido no IndexedDB.
 * Gerenciado automaticamente pelo PersistQueryClientProvider.
 */
export interface QueryCacheRecord {
  id: string;
  timestamp: number;
  data: any;
  version: number;
}

/**
 * Registro de mutação pendente (Outbox Pattern).
 * Cada ação do usuário que falha ou é feita offline
 * é enfileirada aqui para sincronização posterior.
 */
export interface OutboxRecord {
  clientMutationId: string;       // UUID único gerado no cliente (Primary Key)
  entityId: string;               // ID da entidade alvo (ex: strategy_id) — usado para deduplicação
  action: string;                 // Nome da Server Action (ex: 'updateStrategy', 'deleteStrategy')
  payload: any;                   // Dados da mutação
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  attempts: number;               // Número de tentativas de sync
  lastAttemptAt: number | null;   // Timestamp da última tentativa
  createdAt: number;              // Timestamp de criação para ordenação FIFO
}

// ==========================================
// Database
// ==========================================

const DB_NAME = 'iaNow_Storage_v1';

export class iaNowDatabase extends Dexie {
  queries!: Table<QueryCacheRecord>;
  outbox!: Table<OutboxRecord>;

  constructor() {
    super(DB_NAME);

    // v1: Cache do React Query (Fase 1)
    this.version(1).stores({
      queries: 'id, timestamp'
    });

    // v2: Adiciona tabela Outbox para mutações offline (Fase 2)
    this.version(2).stores({
      queries: 'id, timestamp',
      outbox: 'clientMutationId, status, entityId, createdAt'
    });

    // v3: Adiciona suporte ao status 'conflict' (Fase 5)
    // Dexie detecta a nova query ability ou mudança de schema se necessário
    this.version(3).stores({
      queries: 'id, timestamp',
      outbox: 'clientMutationId, status, entityId, createdAt'
    });
  }

  /**
   * Limpa todos os dados locais. Utilizado no Logout para evitar vazamento de dados.
   */
  async clearAll() {
    await this.transaction('rw', [this.queries, this.outbox], async () => {
      await this.queries.clear();
      await this.outbox.clear();
    });
  }

  /**
   * Adiciona uma mutação à fila de saída (Outbox).
   * Se já existir um registro pendente para o mesmo entityId + action,
   * substitui pelo mais recente (deduplicação).
   */
  async enqueue(record: Omit<OutboxRecord, 'status' | 'attempts' | 'lastAttemptAt' | 'createdAt'>): Promise<string> {
    // Deduplicação: remove registros pendentes anteriores para a mesma entidade + ação
    await this.outbox
      .where({ entityId: record.entityId, status: 'pending' })
      .and((r) => r.action === record.action)
      .delete();

    // Insere o novo registro
    await this.outbox.put({
      ...record,
      status: 'pending',
      attempts: 0,
      lastAttemptAt: null,
      createdAt: Date.now()
    });

    return record.clientMutationId;
  }

  /**
   * Retorna todos os registros pendentes, ordenados por criação (FIFO).
   */
  async getPendingOutbox(): Promise<OutboxRecord[]> {
    return this.outbox
      .where('status')
      .equals('pending')
      .sortBy('createdAt');
  }

  /**
   * Retorna registros que falharam definitivamente.
   */
  async getFailedOutbox(): Promise<OutboxRecord[]> {
    return this.outbox
      .where('status')
      .equals('failed')
      .sortBy('createdAt');
  }
}

export const db = new iaNowDatabase();
