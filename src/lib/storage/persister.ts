import { type Persister } from '@tanstack/react-query-persist-client';
import { db } from './db';

const STORAGE_KEY = 'iaNow_RQ_Cache_v1';

/**
 * Remove Symbols e Functions recursivamente para garantir compatibilidade
 * com o algoritmo de Structured Clone do IndexedDB (resolve erros com React 19).
 */
function safeCloneForIDB(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return (typeof obj === 'symbol' || typeof obj === 'function') ? undefined : obj;
  }

  // Preserva tipos complexos suportados nativamente pelo Structured Clone
  if (obj instanceof Date || obj instanceof Blob || typeof obj.getMonth === 'function') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(safeCloneForIDB).filter(v => v !== undefined);
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Pula símbolos e funções explicitamente
      if (typeof value === 'symbol' || typeof value === 'function') continue;
      
      const cleanedValue = safeCloneForIDB(value);
      if (cleanedValue !== undefined) {
        result[key] = cleanedValue;
      }
    }
  }
  return result;
}

/**
 * Cria um persister para o TanStack Query que utiliza IndexedDB (via Dexie) como destino.
 * Inclui lógica de filtragem para persistir apenas queries de sucesso e controle de expiração.
 */
export function createDexiePersister(): Persister {
  return {
    persistClient: async (client) => {
      try {
        // 1. Filtramos apenas as queries de sucesso
        const filteredQueries = client.clientState.queries.filter(
          (q: any) => q.state?.status === 'success' && !q.state?.error
        );

        // 2. Criamos o snapshot filtrado
        const clientStateToPersist = {
          ...client,
          clientState: {
            ...client.clientState,
            queries: filteredQueries
          }
        };

        // 3. Sanitização contra Símbolos (React 19) antes de gravar no IDB
        const sanitizedData = safeCloneForIDB(clientStateToPersist);

        await db.queries.put({
          id: STORAGE_KEY,
          timestamp: Date.now(),
          data: sanitizedData,
          version: 1
        });
      } catch (err) {
        console.error('[iaNow] Falha ao persistir no IndexedDB:', err);
      }
    },
    restoreClient: async () => {
      try {
        const record = await db.queries.get(STORAGE_KEY);
        if (!record) return undefined;
        
        // HARDENING: Verifica se o cache expirou (máximo 24h)
        const ONE_DAY = 1000 * 60 * 60 * 24;
        const isExpired = Date.now() - record.timestamp > ONE_DAY;
        
        if (isExpired) {
          await db.queries.delete(STORAGE_KEY);
          return undefined;
        }

        return record.data;
      } catch (err) {
        console.error('[iaNow] Falha ao restaurar cache do IndexedDB:', err);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await db.queries.delete(STORAGE_KEY);
      } catch (err) {
        console.error('[iaNow] Falha ao remover cache do IndexedDB:', err);
      }
    }
  };
}
