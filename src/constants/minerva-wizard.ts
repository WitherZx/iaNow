import { WizardConfig } from '../types/minerva'

export const WIZARD_CONFIG: WizardConfig = {
  estrategia: {
    1: {
      title: 'Contexto da Empresa',
      fields: [
        { id: 'companyName', label: 'Nome da Organização', type: 'text' },
        { id: 'sector', label: 'Setor de Atuação', type: 'select', options: ['Tecnologia & Software', 'Serviços Jurídicos', 'Varejo & E-commerce', 'Indústria & Logística', 'Serviços em Geral', 'Outro...'] },
        { id: 'offeredSolution', label: 'Solução Oferecida', type: 'text' },
        { id: 'size', label: 'Tamanho da Equipe', type: 'select', options: ['1-10', '11-50', '51-200', '200+'] },
        { id: 'revenue', label: 'Faturamento Mensal', type: 'select', options: ['Até R$ 50k', 'R$ 50k - R$ 200k', 'R$ 200k - R$ 1M', 'Acima de R$ 1M'] }
      ]
    },
    2: {
      title: 'Operação & Digitalização',
      fields: [
        { id: 'businessModel', label: 'Modelo de Negócio', type: 'select', options: ['B2B', 'B2C', 'Híbrido', 'SaaS', 'Marketplace'] },
        { id: 'digitalLevel', label: 'Nível Digital (1-5)', type: 'select', options: ['1 - Analógico/Manual', '2 - Digitalização Básica', '3 - Intermediário', '4 - Avançado', '5 - Transformado'] },
        { id: 'mainPainPoint', label: 'Maior Gargalo/Incêndio hoje', type: 'text' }
      ]
    },
    3: {
      title: 'Riscos & Blindagem',
      fields: [
        { id: 'legalStatus', label: 'Status Jurídico', type: 'select', options: ['Estável', 'Riscos Trabalhistas', 'Fragilidade Contratual', 'Conflitos Societários'] },
        { id: 'financialControl', label: 'Controle Financeiro', type: 'select', options: ['Software ERP', 'Planilhas', 'Sem controle'] }
      ]
    },
    4: {
      title: 'Visão & Futuro',
      fields: [
        { id: 'goals', label: 'Objetivos Principais', type: 'text' },
        { id: 'growthObstacle', label: 'O que te impede de dobrar hoje?', type: 'text' }
      ]
    }
  },
  juridico: {
    1: {
      title: 'Contexto do Contrato',
      fields: [
        { id: 'sideToFavor', label: 'Polo a ser favorecido', type: 'select', options: ['O Contratante (Parte A)', 'O Contratado (Parte B)', 'Equilibrado (Geral)'] },
        { id: 'tipoContrato', label: 'Tipo de Documento', type: 'text' },
        { id: 'perfilPartes', label: 'Perfil das Partes', type: 'text' },
        { id: 'objetivo', label: 'Objetivo do Contrato', type: 'text' },
        { id: 'foro', label: 'Foro / Comarca', type: 'text' }
      ]
    },
    2: {
      title: 'DADOS - Qualificação das Partes',
      fields: [
        { id: 'parteA', label: 'Contratante (Parte A)', type: 'contact', isContact: true },
        { id: 'parteB', label: 'Contratado (Parte B)', type: 'contact', isContact: true }
      ]
    },
    3: {
      title: 'REVISÃO - Parâmetros Finais',
      fields: [
        { id: 'parametros', label: 'Cláusulas Específicas / Observações', type: 'text' }
      ]
    }
  },
  justica: {
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
  }
}
