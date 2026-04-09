import { ProcessDocument } from './datajud';

/**
 * Serviço de Integração com a API do Escavador.
 * Focado na recuperação de documentos e cópias integrais de processos.
 */
export class EscavadorService {
  private static API_URL = 'https://api.escavador.com/v2';
  private static MOCK_MODE = false; // Desativando Mock para usar API real
  private static API_KEY = process.env.ESCAVADOR_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYzhkODUzYTk2MzY3YzZmNzdmZmMxZTEyZGI2N2EzYTQzMzQ3MmVhY2EyODM5NGM0NzM1YWNmNTNhZGY0M2YxODlkMjczYmYxY2I1ODcxMTIiLCJpYXQiOjE3NzU3MTM5MjUuOTY2MzkxLCJuYmYiOjE3NzU3MTM5MjUuOTY2MzkyLCJleHAiOjIwOTEzMzMxMjUuOTY0NCwic3ViIjoiMzM1NjY3OSIsInNjb3BlcyI6WyJhY2Vzc2FyX2FwaV9wYWdhIl19.IHN1RDYBT7sTAclSF28LNResjPUq1857s9XkbgZ2sR9ouNuU2g5iMQJZdoh2AMOu4P19MmwwVAwWsc8zL7HjuVCwjLcF8vU0CY0bpwDMRvgCLY0CUQFBHgzBQv4UG-xmam0cEXoXg33VLRinL2QNSzQDy1kUDYew9F1kv4-cYTe4AGnHSGRdxIFyPyQ4zxytJKUmhRv0o33aw433oLw3lpByjXNiCVGzCTXFGxIbk40JPKNByQ_S4JXWGqwWwadrJkuMpefKWrzx1ll_u7N46rhKE9SCePjVWyv5DJf_13vmjvMOYSk4-FPFpStHPdOvVzmejW5ujcfmgNmprv44Pw3UgVAvmArF8F6PiN44IhiAr-q4X1iMPl8zoDmH6IR0oX4h0pU6tLUe94bIk0T6EXzXnT3nV0WvneYsOjDRCxgOd9ZtHH6qpLdlUyIyKx9rG4k0ql6RlZT6a-miZzRD_C8G3Ev1L4V4x4YSH7bh7-wIamm3MBl9TWaLzcJODYxIdmfLBlLnKvBUryM5VYJFl2BcDt-mBcFWlYQU9wIRdgPdff5IuSAiqMe5axzatG8lUfjFlGMfa2zydQ47ljXVZu1basv9iRZ0fxD3oIl1Tk7f_hFmMJNE6uRcDbw6uAw-GOzbQ1e8gDY_DhkM35J39epZ6bakflREiVmzarRnuN4';

  /**
   * Busca documentos vinculados a um número de processo CNJ.
   */
  static async getProcessDocuments(processNumber: string): Promise<ProcessDocument[]> {
    const cleanNumber = processNumber.replace(/\D/g, '');

    // Se não houver chave ou for número de teste, retorna Mock
    if (!this.API_KEY || cleanNumber.startsWith('0000000')) {
      console.log('[Escavador] Usando modo de simulação (Chave ausente ou número de teste)');
      return this.getMockDocuments(processNumber);
    }

    try {
      // 1. Tenta buscar pelo número limpo primeiro
      let url = `${this.API_URL}/processos/numero/${cleanNumber}`;
      let response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        }
      });

      // 2. Se falhar com 404 e tiver máscara, tenta com o número formatado
      if (response.status === 404 && processNumber.includes('.')) {
        console.log(`[Escavador] Tentando busca com máscara: ${processNumber}`);
        url = `${this.API_URL}/processos/numero/${encodeURIComponent(processNumber)}`;
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          }
        });
      }

      if (response.status === 404) {
        console.log(`[Escavador] Processo ${cleanNumber} não encontrado na base de documentos.`);
        return []; // Retorna vazio em vez de erro para o UI lidar com "Não encontrado"
      }

      if (!response.ok) {
        throw new Error(`Erro Escavador (${response.status})`);
      }

      const data = await response.json();
      
      // 2. Mapeia movimentações que contenham arquivos
      const docs: ProcessDocument[] = [];
      
      // O Escavador v2 retorna movimentações em 'movimentacoes'
      if (data.movimentacoes) {
        data.movimentacoes.forEach((mov: any) => {
          if (mov.arquivos && mov.arquivos.length > 0) {
            mov.arquivos.forEach((arq: any) => {
              const name = arq.titulo || mov.descricao || 'Documento';
              const isInitial = ['inicial', 'abertura', 'peça inicial', 'petição inicial', 'peticionamento'].some(k => name.toLowerCase().includes(k));
              
              docs.push({
                id: arq.id || Math.random().toString(36),
                name: name,
                url: arq.url || arq.url_download || '',
                date: mov.data || new Date().toISOString(),
                type: 'PDF',
                category: isInitial ? 'petition_initial' : undefined,
                size: arq.tamanho ? `${(arq.tamanho / 1024 / 1024).toFixed(2)} MB` : undefined
              } as any);
            });
          }
        });
      }

      return docs;
    } catch (err) {
      console.error('[Escavador] Error:', err);
      throw err;
    }
  }

  private static getMockDocuments(processNumber: string): ProcessDocument[] {
    const now = new Date();
    return [
      {
        id: 'esc-1',
        name: 'Petição Inicial - Completa',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        date: new Date(now.getTime() - 86400000 * 30).toISOString(),
        type: 'PDF',
        size: '1.2 MB'
      },
      {
        id: 'esc-2',
        name: 'Despacho - Deferimento de Liminar',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        date: new Date(now.getTime() - 86400000 * 25).toISOString(),
        type: 'PDF',
        size: '0.4 MB'
      },
      {
        id: 'esc-3',
        name: 'Contestação - Parte Ré',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        date: new Date(now.getTime() - 86400000 * 5).toISOString(),
        type: 'PDF',
        size: '2.8 MB'
      }
    ];
  }
}
