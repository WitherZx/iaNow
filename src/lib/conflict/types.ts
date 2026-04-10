export type ConflictType = 
  | 'FIELD_MERGE' 
  | 'FULL_OVERRIDE' 
  | 'DELETE_VS_UPDATE' 
  | 'STALE_UPDATE';

export interface ConflictItem {
  id: string;                    // UUID do conflito
  entityId: string;              // ID da entidade (ex: strategy_id)
  type: ConflictType;
  localData: any;                // Estado que tentamos salvar
  remoteData: any;               // Estado atual no servidor
  originalData?: any;            // Estado base antes da edição (opcional)
  action: string;                // Ação que gerou o conflito (Ex: 'updateStrategyAction')
  clientMutationId: string;      // ID do registro no Outbox
  createdAt: number;             // Timestamp para TTL
  status: 'pending' | 'resolved';
}
