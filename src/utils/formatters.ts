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
