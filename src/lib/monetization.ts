export type MonetizationType = 'contrato' | 'estrategia' | 'processo'

export const MONETIZATION_PRICES: Record<MonetizationType | 'mensal', number> = {
  contrato: 19.9,
  estrategia: 9.9,
  processo: 49.9,
  mensal: 99.9
}

export function getSinglePaymentLink(type: MonetizationType) {
  const links: Record<MonetizationType, string | undefined> = {
    contrato: process.env.NEXT_PUBLIC_ASAAS_LINK_CONTRATO,
    estrategia: process.env.NEXT_PUBLIC_ASAAS_LINK_ESTRATEGIA,
    processo: process.env.NEXT_PUBLIC_ASAAS_LINK_PROCESSO
  }

  return links[type] || ''
}

export function getMonthlyPaymentLink() {
  return process.env.NEXT_PUBLIC_ASAAS_LINK_MENSAL || ''
}

