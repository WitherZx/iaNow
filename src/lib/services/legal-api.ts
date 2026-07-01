export interface ProcessMovement {
  id: string;
  date: string;
  description: string;
  type: string;
}

export interface ProcessParty {
  nome: string;
  tipo: string;
}

export interface ProcessDocument {
  id: string;
  name: string;
  url: string;
  date: string;
  type?: string;
  size?: string;
}

export interface ProcessStatus {
  number: string;
  status: string;
  court: string;
  distributionDate: string;
  judge?: string;
  subject?: string;
  classe?: string;
  valorCausa?: string;
  partes?: ProcessParty[];
  movements: ProcessMovement[];
  documents?: ProcessDocument[];
}

export interface LegalApiInterface {
  getProcessInfo(number: string): Promise<ProcessStatus>;
  analyzeProcess(status: ProcessStatus): Promise<string[]>;
}

export class MockLegalApi implements LegalApiInterface {
  async getProcessInfo(number: string): Promise<ProcessStatus> {
    // Simulating API Latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      number: number,
      status: 'Em andamento',
      court: '1ª Vara Cível de São Paulo - Foro Central',
      distributionDate: '15/01/2024',
      judge: 'Dr. Roberto Cardoso',
      subject: 'Indenização por Dano Moral',
      classe: 'Procedimento Comum Cível',
      valorCausa: 'R$ 50.000,00',
      partes: [
        { nome: 'João Silva', tipo: 'Ativo' },
        { nome: 'Empresa XYZ Ltda', tipo: 'Passivo' }
      ],
      movements: [
        {
          id: '1',
          date: '2024-03-20T14:30:00Z',
          description: 'Ato ordinatório praticado - Intimação da parte autora para manifestação sobre contestação.',
          type: 'Movimentação'
        },
        {
          id: '2',
          date: '2024-03-05T09:15:00Z',
          description: 'Contestação apresentada pela parte ré.',
          type: 'Movimentação'
        },
        {
          id: '3',
          date: '2024-02-10T11:00:00Z',
          description: 'Citação da parte ré concluída com sucesso.',
          type: 'Movimentação'
        },
        {
          id: '4',
          date: '2024-01-20T16:45:00Z',
          description: 'Decisão interlocutória - Deferimento de liminar.',
          type: 'Decisão'
        },
        {
          id: '5',
          date: '2024-01-15T08:30:00Z',
          description: 'Distribuição por sorteio.',
          type: 'Distribuição'
        }
      ],
      documents: [
        { id: 'doc-1', name: 'Petição Inicial', url: '#', date: '2024-01-15', type: 'PDF' },
        { id: 'doc-2', name: 'Contestação', url: '#', date: '2024-03-05', type: 'PDF' }
      ]
    };
  }

  async analyzeProcess(status: ProcessStatus): Promise<string[]> {
    // This will usually be handled by searchAI in the API route, 
    // but we can provide a method signature here for consistency.
    return [
      "Processo em fase de instrução.",
      "O réu contestou as alegações, verifique os pontos de divergência.",
      "A liminar deferida garante a urgência solicitada."
    ];
  }
}

import { DataJudService } from './datajud';

export const legalApi: LegalApiInterface = {
  getProcessInfo: (number: string) => DataJudService.getProcessInfo(number),
  analyzeProcess: async (status: ProcessStatus) => []
};
