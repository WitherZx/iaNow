import { WizardConfig } from '../types/minerva'

export const WIZARD_CONFIG: WizardConfig = {
  juridico: {
    1: {
      title: 'Fatos & Ocorrência',
      fields: [
        { id: 'sideToDefend', label: 'Polo de Defesa', type: 'select', options: ['A defesa do Autor', 'A defesa do Réu'] },
        { id: 'problemType', label: 'Tipo de Problema', type: 'select', options: ['Consumidor', 'Trabalhista', 'Cível Geral', 'Imobiliário', 'Outro'] },
        { id: 'whatHappened', label: 'O que aconteceu?', type: 'text' },
        { id: 'whenHappened', label: 'Quando aconteceu?', type: 'text' }
      ]
    },
    2: {
      title: 'Qualificação das Partes',
      fields: [
        { id: 'autor', label: 'Autor da Ação', type: 'contact', isContact: true },
        { id: 'reu', label: 'Réu / Contra a quem?', type: 'contact', isContact: true }
      ]
    },
    3: {
      title: 'Valores da Causa',
      fields: [
        { id: 'materialDamage', label: 'Prejuízo Material (R$)', type: 'text' },
        { id: 'moralDamage', label: 'Danos Morais (R$)', type: 'text' }
      ]
    }
  },
  acompanhamento: {
    1: {
      title: 'Busca de Processo',
      fields: [
        { id: 'documentNumber', label: 'Número do Processo (20 dígitos)', type: 'text' }
      ]
    }
  }
}
