/**
 * Formata CPF (000.000.000-00)
 */
export const formatCpf = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

/**
 * Formata CNPJ (00.000.000/0000-00)
 */
export const formatCnpj = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .slice(0, 18)
}

/**
 * Formata documento baseando-se no tipo (PF/PJ)
 */
export const formatDoc = (value: string, type: 'PF' | 'PJ') => {
  return type === 'PJ' ? formatCnpj(value) : formatCpf(value)
}

/**
 * Formata Número de Processo CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
 */
export const formatProcessNumber = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{7})(\d)/, '$1-$2')
    .replace(/^(\d{7}-\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{7}-\d{2}\.\d{4})(\d)/, '$1.$2')
    .replace(/^(\d{7}-\d{2}\.\d{4}\.\d)(\d)/, '$1.$2')
    .replace(/^(\d{7}-\d{2}\.\d{4}\.\d\.\d{2})(\d)/, '$1.$2')
    .slice(0, 25)
}

/**
 * Formata CPF, CNPJ ou Processo CNJ de forma dinâmica baseado no tamanho.
 */
export const formatGenericDocument = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 11) {
    return formatCpf(digits)
  } else if (digits.length <= 14) {
    return formatCnpj(digits)
  } else {
    return formatProcessNumber(digits)
  }
}
