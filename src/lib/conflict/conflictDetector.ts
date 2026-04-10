/**
 * Compara dois objetos e retorna as chaves que foram alteradas.
 */
export function getChangedFields(original: any, current: any): Set<string> {
  const fields = new Set<string>()
  if (!original || !current) return fields

  // Consideramos apenas campos de primeiro nível para segurança (shallow compare)
  const keys = new Set([...Object.keys(original), ...Object.keys(current)])
  
  keys.forEach(key => {
    if (JSON.stringify(original[key]) !== JSON.stringify(current[key])) {
      fields.add(key)
    }
  })
  return fields
}

/**
 * REGRA DE OURO: Só permite merge automático se os conjuntos de campos alterados
 * localmente e remotamente forem disjuntos (intersecção vazia).
 */
export function isSafeToMerge(local: any, remote: any, base: any): boolean {
  if (!base) return false

  const localChanges = getChangedFields(base, local)
  const remoteChanges = getChangedFields(base, remote)

  // Se ambos alteraram o mesmo campo, há conflito de FULL_OVERRIDE
  for (const field of localChanges) {
    if (remoteChanges.has(field)) return false
  }

  return true
}

/**
 * Executa o merge combinando as alterações locais no objeto remoto.
 */
export function performMerge(local: any, remote: any, base: any): any {
  if (!base) return remote

  const localChanges = getChangedFields(base, local)
  const merged = { ...remote }

  localChanges.forEach(field => {
    merged[field] = local[field]
  })

  return merged
}
