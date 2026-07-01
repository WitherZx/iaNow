/**
 * Serviço de Integração com a API da Judit.
 * Substitui DataJud e Escavador para consultas de processos e documentos.
 */
import { LegalApiInterface, ProcessStatus, ProcessMovement, ProcessDocument, ProcessParty } from './legal-api';

export class JuditService implements LegalApiInterface {
  private API_KEY = process.env.JUDIT_API_KEY || '815d6cf2-4438-4cb3-9988-a161f653be0d';
  private BASE_URL = 'https://requests.prod.judit.io';

  /**
   * Consulta informações completas de um processo pelo número CNJ.
   */
  async getProcessInfo(processNumber: string): Promise<ProcessStatus> {
    let cleanNumber = processNumber.replace(/\D/g, '');

    // Formatar como CNJ se for apenas números e tiver 20 dígitos
    if (cleanNumber.length === 20) {
      cleanNumber = `${cleanNumber.slice(0, 7)}-${cleanNumber.slice(7, 9)}.${cleanNumber.slice(9, 13)}.${cleanNumber.slice(13, 14)}.${cleanNumber.slice(14, 16)}.${cleanNumber.slice(16, 20)}`;
    }

    // Fallback para Mock se for número de teste
    if (cleanNumber.startsWith('0000000')) {
      return this.getMockData(processNumber);
    }

    try {
      console.log(`[Judit] Consultando processo ${cleanNumber}...`);

      const response = await fetch(`${this.BASE_URL}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.API_KEY
        },
        body: JSON.stringify({
          search: {
            search_type: 'lawsuit_cnj',
            search_key: cleanNumber,
            with_attachments: true
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro Judit (${response.status}): ${errText}`);
      }

      const requestData = await response.json();
      const requestId = requestData.id || requestData.request_id;

      if (!requestId) {
        throw new Error('Não foi possível obter o ID da requisição na Judit.');
      }

      // Judit pode ser assíncrono. Vamos aguardar o resultado por até 5 minutos (100 tentativas).
      let attempts = 0;
      let finalData: any = null;

      console.log(`[Judit] Request ID: ${requestId}`);

      while (attempts < 100) {
        console.log(`[Judit] Verificando status (tentativa ${attempts + 1}/100)...`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const resCheck = await fetch(`${this.BASE_URL}/requests/${requestId}`, {
          headers: { 'Api-Key': this.API_KEY }
        });

        if (resCheck.ok) {
          const checkData = await resCheck.json();
          console.log(`[Judit] Status atual: ${checkData.status}`);

          if (checkData.status === 'completed') {
            console.log(`[Judit] Consulta finalizada. Buscando resultados para o Request ID: ${requestId}...`);
            const resData = await fetch(`${this.BASE_URL}/responses?request_id=${requestId}`, {
              headers: { 'Api-Key': this.API_KEY }
            });

            if (resData.ok) {
              const resultJson = await resData.json();
              console.log(`[Judit] Resultado bruto recebido. Chaves no JSON:`, Object.keys(resultJson));

              if (resultJson.data && resultJson.data.length > 0) {
                finalData = resultJson.data[0];
                console.log(`[Judit] Dados localizados no primeiro item do array 'data'.`);
              } else if (resultJson.lawsuit || resultJson.number) {
                finalData = resultJson;
                console.log(`[Judit] Dados localizados na raiz do JSON.`);
              } else {
                console.warn(`[Judit] Nenhum dado de processo encontrado no JSON de resposta.`, JSON.stringify(resultJson).substring(0, 500));
              }
              break;
            } else {
              throw new Error(`Erro ao buscar resultados na Judit (${resData.status})`);
            }
          } else if (checkData.status === 'failed' || checkData.status === 'error') {
            throw new Error(`A consulta na Judit falhou: ${checkData.error_message || checkData.message || 'Erro desconhecido'}`);
          }
        } else {
          console.warn(`[Judit] Erro ao verificar status (${resCheck.status})`);
        }
        attempts++;
      }

      if (!finalData) {
        throw new Error('O processo ainda está sendo processado pela Judit ou não retornou dados. Por favor, tente novamente em alguns instantes.');
      }

      return this.parseResponse(finalData, cleanNumber);

    } catch (err: any) {
      console.error('[Judit] Error:', err.message);
      throw err;
    }
  }

  /**
   * Busca apenas os documentos do processo.
   */
  async getProcessDocuments(processNumber: string): Promise<ProcessDocument[]> {
    const info = await this.getProcessInfo(processNumber);
    return info.documents || [];
  }

  async analyzeProcess(status: ProcessStatus): Promise<string[]> {
    // Implementação básica de análise ou integração com IA
    return [
      "Processo localizado na Minerva.",
      `${status.movements.length} movimentações encontradas.`,
      status.documents?.length ? `${status.documents.length} documentos disponíveis.` : "Nenhum documento encontrado."
    ];
  }

  private parseResponse(data: any, processNumber: string): ProcessStatus {
    // A estrutura da Judit varia um pouco conforme o tribunal, 
    // mas geralmente segue um padrão em 'lawsuit'
    const lawsuit = data.lawsuit || data;

    console.log(`[Judit] Campos disponíveis no processo:`, Object.keys(lawsuit));

    // Tenta encontrar anexos em diferentes chaves possíveis
    let attachments = lawsuit.attachments || lawsuit.anexos || lawsuit.documentos || lawsuit.files || [];

    // Se não houver anexos na raiz, tenta buscar dentro das movimentações (alguns tribunais fazem isso)
    if (attachments.length === 0 && lawsuit.movements) {
      const movementDocs = lawsuit.movements
        .filter((m: any) => m.attachments || m.anexos || m.documentos)
        .flatMap((m: any) => m.attachments || m.anexos || m.documentos);

      if (movementDocs.length > 0) {
        console.log(`[Judit] Localizados ${movementDocs.length} documentos dentro das movimentações.`);
        attachments = movementDocs;
      }
    }

    return {
      number: lawsuit.number || processNumber,
      status: lawsuit.status || 'Ativo',
      court: lawsuit.court || lawsuit.tribunal || 'Tribunal não identificado',
      distributionDate: lawsuit.distribution_date || lawsuit.data_distribuicao || 'Não informada',
      judge: lawsuit.judge || lawsuit.juiz || undefined,
      subject: lawsuit.subject || lawsuit.assunto || undefined,
      classe: lawsuit.class || lawsuit.classe || undefined,
      valorCausa: lawsuit.value ? `R$ ${Number(lawsuit.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined,
      partes: (lawsuit.parties || lawsuit.partes || []).map((p: any) => ({
        nome: p.name || p.nome,
        tipo: p.role || p.tipo || 'Parte'
      })),
      movements: (lawsuit.movements || lawsuit.movimentacoes || []).map((m: any, idx: number) => ({
        id: m.id || `${processNumber}-mov-${idx}`,
        date: m.date || m.data,
        description: m.description || m.descricao,
        type: 'Movimentação'
      })),
      documents: attachments.map((a: any) => ({
        id: a.id || a.uuid || Math.random().toString(36).substr(2, 9),
        name: a.name || a.nome || a.titulo || 'Documento',
        url: a.url || a.link || a.download_url,
        date: a.created_at || a.data || lawsuit.distribution_date,
        type: a.type || a.tipo || 'PDF'
      }))
    };
  }

  private getMockData(number: string): ProcessStatus {
    return {
      number: number,
      status: 'Em andamento (Judit Simulado)',
      court: 'Tribunal de Justiça de Teste',
      distributionDate: new Date().toLocaleDateString('pt-BR'),
      judge: 'Judit AI Agent',
      movements: [
        { id: '1', date: new Date().toISOString(), description: 'Movimentação simulada via Judit.', type: 'Simulado' }
      ],
      documents: [
        { id: 'doc-1', name: 'Documento de Teste', url: '#', date: new Date().toISOString(), type: 'PDF' }
      ]
    };
  }
}

export const juditService = new JuditService();
