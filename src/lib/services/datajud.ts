/**
 * Serviço de Integração com a API Pública do DataJud (CNJ).
 * Suporta múltiplos tribunais (TJ, TRF, TRT) através da descoberta automática por número CNJ.
 */
export interface ProcessMovement {
  id: string;
  date: string;
  description: string;
  type: string;
  details?: string;
  extras?: { nome: string; valor: string }[];
  orgao?: string;
  polo?: 'juizo' | 'ativo' | 'passivo' | 'mp' | 'outro';
  actionRequired?: boolean;
  actionHint?: string;
  documents?: ProcessDocument[];
}

export interface ProcessParty {
  nome: string;
  tipo: string; // 'Requerente' | 'Requerido' | 'Autor' | 'Réu' | etc.
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
  allSubjects?: string[];
  classe?: string;
  valorCausa?: string;
  partes?: ProcessParty[];
  movements: ProcessMovement[];
  documents?: ProcessDocument[];
}

export class DataJudService {
  // Chave fornecida pelo usuário
  private static API_KEY = process.env.DATAJUD_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

  /**
   * Mapeamento de Segmento (J.TR) para Alias do Tribunal no DataJud.
   * Baseado na Resolução CNJ 65/2008.
   */
  private static COURT_MAP: Record<string, string> = {
    // Tribunais Superiores
    '5.00': 'tst', '6.00': 'tse', '3.00': 'stj', '2.00': 'stm',
    // Justiça Federal (4.*)
    '4.01': 'trf1', '4.02': 'trf2', '4.03': 'trf3', '4.04': 'trf4', '4.05': 'trf5', '4.06': 'trf6',
    // Justiça Estadual (8.*)
    '8.01': 'tjac', '8.02': 'tjal', '8.04': 'tjam', '8.03': 'tjap', '8.05': 'tjba', '8.06': 'tjce',
    '8.07': 'tjdft', '8.18': 'tjpi', '8.19': 'tjrj', '8.20': 'tjrn',
    '8.08': 'tjes', '8.09': 'tjgo', '8.10': 'tjma', '8.11': 'tjmg', '8.12': 'tjms',
    '8.13': 'tjmt', '8.14': 'tjpa', '8.15': 'tjpb', '8.16': 'tjpe', '8.17': 'tjpr',
    '8.22': 'tjro', '8.23': 'tjrr', '8.21': 'tjrs', '8.24': 'tjsc',
    '8.25': 'tjse', '8.26': 'tjsp', '8.27': 'tjto',
    // Justiça do Trabalho (5.*)
    '5.01': 'trt1', '5.02': 'trt2', '5.03': 'trt3', '5.04': 'trt4', '5.05': 'trt5', '5.06': 'trt6',
    '5.07': 'trt7', '5.08': 'trt8', '5.09': 'trt9', '5.10': 'trt10', '5.11': 'trt11', '5.12': 'trt12',
    '5.13': 'trt13', '5.14': 'trt14', '5.15': 'trt15', '5.16': 'trt16', '5.17': 'trt17', '5.18': 'trt18',
    '5.19': 'trt19', '5.20': 'trt20', '5.21': 'trt21', '5.22': 'trt22', '5.23': 'trt23', '5.24': 'trt24'
  };

  /**
   * Mapa de nomes completos dos Tribunais.
   */
  private static COURT_NAMES: Record<string, string> = {
    'STF': 'STF - Supremo Tribunal Federal',
    'STJ': 'STJ - Superior Tribunal de Justiça',
    'TST': 'TST - Tribunal Superior do Trabalho',
    'TSE': 'TSE - Tribunal Superior Eleitoral',
    'STM': 'STM - Superior Tribunal Militar',
    'TRF1': 'TRF-1 - 1ª Região (Brasília)',
    'TRF2': 'TRF-2 - 2ª Região (Rio de Janeiro)',
    'TRF3': 'TRF-3 - 3ª Região (São Paulo)',
    'TRF4': 'TRF-4 - 4ª Região (Porto Alegre)',
    'TRF5': 'TRF-5 - 5ª Região (Recife)',
    'TRF6': 'TRF-6 - 6ª Região (Belo Horizonte)',
    'TRT1': 'TRT-1 - 1ª Região (Rio de Janeiro)',
    'TRT2': 'TRT-2 - 2ª Região (São Paulo)',
    'TRT3': 'TRT-3 - 3ª Região (Minas Gerais)',
    'TRT4': 'TRT-4 - 4ª Região (Rio Grande do Sul)',
    'TRT5': 'TRT-5 - 5ª Região (Bahia)',
    'TRT6': 'TRT-6 - 6ª Região (Pernambuco)',
    'TRT7': 'TRT-7 - 7ª Região (Ceará)',
    'TRT8': 'TRT-8 - 8ª Região (Pará/Amapá)',
    'TRT9': 'TRT-9 - 9ª Região (Paraná)',
    'TRT10': 'TRT-10 - 10ª Região (Brasília/Tocantins)',
    'TRT11': 'TRT-11 - 11ª Região (Amazonas/Roraima)',
    'TRT12': 'TRT-12 - 12ª Região (Santa Catarina)',
    'TRT13': 'TRT-13 - 13ª Região (Paraíba)',
    'TRT14': 'TRT-14 - 14ª Região (Rondônia/Acre)',
    'TRT15': 'TRT-15 - 15ª Região (Campinas)',
    'TRT16': 'TRT-16 - 16ª Região (Maranhão)',
    'TRT17': 'TRT-17 - 17ª Região (Espírito Santo)',
    'TRT18': 'TRT-18 - 18ª Região (Goiás)',
    'TRT19': 'TRT-19 - 19ª Região (Alagoas)',
    'TRT20': 'TRT-20 - 20ª Região (Sergipe)',
    'TRT21': 'TRT-21 - 21ª Região (Rio Grande do Norte)',
    'TRT22': 'TRT-22 - 22ª Região (Piauí)',
    'TRT23': 'TRT-23 - 23ª Região (Mato Grosso)',
    'TRT24': 'TRT-24 - 24ª Região (Mato Grosso do Sul)',
    'TJAC': 'TJAC - Tribunal de Justiça do Acre',
    'TJAL': 'TJAL - Tribunal de Justiça de Alagoas',
    'TJAM': 'TJAM - Tribunal de Justiça do Amazonas',
    'TJAP': 'TJAP - Tribunal de Justiça do Amapá',
    'TJBA': 'TJBA - Tribunal de Justiça da Bahia',
    'TJCE': 'TJCE - Tribunal de Justiça do Ceará',
    'TJDFT': 'TJDFT - Tribunal de Justiça do DF e Territórios',
    'TJES': 'TJES - Tribunal de Justiça do Espírito Santo',
    'TJGO': 'TJGO - Tribunal de Justiça de Goiás',
    'TJMA': 'TJMA - Tribunal de Justiça do Maranhão',
    'TJMG': 'TJMG - Tribunal de Justiça de Minas Gerais',
    'TJMS': 'TJMS - Tribunal de Justiça do Mato Grosso do Sul',
    'TJMT': 'TJMT - Tribunal de Justiça do Mato Grosso',
    'TJPA': 'TJPA - Tribunal de Justiça do Pará',
    'TJPB': 'TJPB - Tribunal de Justiça da Paraíba',
    'TJPE': 'TJPE - Tribunal de Justiça de Pernambuco',
    'TJPI': 'TJPI - Tribunal de Justiça do Piauí',
    'TJPR': 'TJPR - Tribunal de Justiça do Paraná',
    'TJRJ': 'TJRJ - Tribunal de Justiça do Rio de Janeiro',
    'TJRN': 'TJRN - Tribunal de Justiça do Rio Grande do Norte',
    'TJRO': 'TJRO - Tribunal de Justiça de Rondônia',
    'TJRR': 'TJRR - Tribunal de Justiça de Roraima',
    'TJRS': 'TJRS - Tribunal de Justiça do Rio Grande do Sul',
    'TJSC': 'TJSC - Tribunal de Justiça de Santa Catarina',
    'TJSE': 'TJSE - Tribunal de Justiça de Sergipe',
    'TJSP': 'TJSP - Tribunal de Justiça de São Paulo',
    'TJTO': 'TJTO - Tribunal de Justiça do Tocantins',
  };

  private static formatCourtName(raw: string): string {
    if (!raw) return 'Tribunal não identificado';
    const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return this.COURT_NAMES[key] || raw;
  }

  private static parseDate(raw: string | null | undefined): string {
    if (!raw) return 'Não informada';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return 'Não informada';
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'Não informada';
    }
  }

  private static getEndpoint(processNumber: string): string {
    const clean = processNumber.replace(/\D/g, '');
    
    // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO = 20 dígitos
    // Posições:   0123456 78 901234 5 67 8901
    //             NNNNNNN DD AAAA   J TR OOOO
    // Índices:    0-6     7-8 9-12 13 14-15 16-19
    if (clean.length < 20) {
      console.log(`[DataJud] Número curto (${clean.length} dígitos), usando endpoint genérico`);
      return 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search';
    }

    const j = clean.substring(13, 14);   // Justiça (1 dígito)
    const tr = clean.substring(14, 16);  // Tribunal (2 dígitos)
    const key = `${j}.${tr}`;

    console.log(`[DataJud] Número limpo: ${clean} | J=${j} | TR=${tr} | Chave=${key}`);

    const aliase = this.COURT_MAP[key];
    if (!aliase) {
      console.warn(`[DataJud] Tribunal desconhecido para chave '${key}'. Tentando endpoint genérico para J=${j}.`);
      // Fallback baseado apenas no segmento J
      const fallbackMap: Record<string, string> = { '1': 'stf', '2': 'stm', '3': 'stj', '4': 'trf1', '5': 'tst', '6': 'tse', '7': 'tjmg', '8': 'tjsp', '9': 'tjrj' };
      return `https://api-publica.datajud.cnj.jus.br/api_publica_${fallbackMap[j] || 'tjsp'}/_search`;
    }

    return `https://api-publica.datajud.cnj.jus.br/api_publica_${aliase}/_search`;
  }

  static async getProcessInfo(processNumber: string): Promise<ProcessStatus> {
    const cleanNumber = processNumber.replace(/\D/g, '');
    const endpoint = this.getEndpoint(processNumber);
    
    console.log(`[DataJud] Consultando processo ${cleanNumber} em ${endpoint}`);

    // Fallback para Mock se for número de teste
    if (cleanNumber.startsWith('0000000')) {
      return this.getMockData(processNumber);
    }

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const body = JSON.stringify({
          query: {
            match_phrase: {
              numeroProcesso: cleanNumber
            }
          }
        });

        console.log(`[DataJud] Enviando para ${endpoint} (Tentativa ${retries + 1}/${maxRetries})`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `APIKey ${this.API_KEY}`
          },
          body
        });

        console.log(`[DataJud] Status da resposta: ${response.status}`);

        if (!response.ok) {
          const errText = await response.text();
          if (response.status === 429 || errText.includes('es_rejected_execution_exception')) {
            console.warn(`[DataJud] Rate limit excedido (429). Tentando novamente em ${1500 * (retries + 1)}ms...`);
            retries++;
            if (retries >= maxRetries) throw new Error(`Erro DataJud (${response.status}) após retries: ${errText.slice(0, 200)}`);
            await new Promise(r => setTimeout(r, 1500 * retries));
            continue;
          }
          console.error('[DataJud] Resposta de erro:', errText);
          throw new Error(`Erro DataJud (${response.status}): ${errText.slice(0, 200)}`);
        }

        const rawData = await response.json();
        console.log(`[DataJud] Total encontrado: ${rawData.hits?.total?.value || 0}`);
        return this.parseResponse(rawData);

      } catch (err: any) {
        if (retries < maxRetries && (err.message.includes('fetch failed') || err.message.includes('429'))) {
           retries++;
           await new Promise(r => setTimeout(r, 1500 * retries));
           continue;
        }
        console.error('[DataJud] Fetch Error:', err.message);
        throw err;
      }
    }
    throw new Error('Serviço DataJud indisponível no momento. Tente novamente mais tarde.');
  }

  private static parseResponse(rawData: any): ProcessStatus {
    const hits = rawData.hits?.hits || [];
    const hit = hits[0]?._source;

    if (!hit) {
      throw new Error('Processo não encontrado na base oficial do CNJ. Verifique o número ou tente outro tribunal.');
    }

    return {
      number: hit.numeroProcesso,
      status: hit.situacao || 'Ativo',
      court: this.formatCourtName(hit.tribunal),
      distributionDate: this.parseDate(hit.dataAjuizamento),
      judge: hit.orgaoJulgador?.nome || undefined,
      subject: hit.assuntos?.[0]?.nome || undefined,
      allSubjects: (hit.assuntos || []).map((a: any) => a.nome).filter(Boolean),
      classe: hit.classe?.nome || undefined,
      valorCausa: hit.valorCausa != null
        ? `R$ ${Number(hit.valorCausa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : undefined,
      partes: (hit.partes || []).map((p: any) => ({
        nome: p.nome || p.nomeRepresentante || 'Não identificado',
        tipo: p.polo === 'ATIVO' ? 'Autor'
          : p.polo === 'PASSIVO' ? 'Réu'
          : p.tipoParte?.descricao || p.polo || 'Parte'
      })),
      movements: (hit.movimentos || []).map((m: any, idx: number) => {
        // Extrai complementos tabelados (ex: tipo de mandado, valor, destinatário)
        const extras = (m.complementosTabelados || []).map((c: any) => ({
          nome: c.nome || c.descricao || '',
          valor: c.valor || c.descricaoValor || ''
        })).filter((c: any) => c.nome && c.valor);

        // Extrai texto livre dos complementos
        const details = (m.complementos || []).map((c: any) =>
          c.valor || c.descricao || ''
        ).filter(Boolean).join(' | ');

        const classification = this.classifyMovement(m.nome || '');

        return {
          id: `${hit.numeroProcesso}-${idx}`,
          date: m.dataHora || new Date().toISOString(),
          description: m.nome || 'Movimentação sem descrição',
          type: m.tipoMovimento || 'Movimentação',
          orgao: m.orgaoJulgador?.nome || undefined,
          details: details || undefined,
          extras: extras.length > 0 ? extras : undefined,
          polo: classification.polo,
          actionRequired: classification.actionRequired,
          actionHint: classification.actionHint,
        };
      }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }

  private static classifyMovement(name: string): {
    polo: 'juizo' | 'ativo' | 'passivo' | 'mp' | 'outro';
    actionRequired: boolean;
    actionHint?: string;
  } {
    const n = name.toLowerCase();

    // MP age antes das partes para evitar falsos positivos
    const isMP = ['ministério público', 'membro do mp', 'parecer do mp', 'cota do mp',
      'vista ao mp', 'remessa ao mp'].some(k => n.includes(k));

    // Parte Passiva — réu/reclamado
    const isPassivo = ['contestação', 'defesa prévia', 'réplica', 'contrarrazões',
      'reconvenção', 'exceção de incompetência', 'exceção de suspeição',
      'impugnação à gratuidade', 'resposta do réu', 'resposta do reclamado'].some(k => n.includes(k));

    // Parte Ativa — autor/reclamante
    const isAtivo = [
      'petição inicial', 'inicial', 'petição', 'requerimento', 'manifestação',
      'recurso ordinário', 'recurso de revista', 'recurso adesivo', 'agravo',
      'apelação', 'embargos de declaração', 'embargos', 'recurso', 'pedido',
      'cumprimento de sentença', 'execução', 'liquidação', 'impugnação ao cumprimento',
      'juntada de petição', 'protocolado', 'carta precatória expedida'
    ].some(k => n.includes(k));

    // Juízo/Tribunal — atos do juiz/vara
    const isJuizo = [
      'despacho', 'sentença', 'acórdão', 'decisão', 'mandado', 'publicação',
      'expedição', 'disponibilização', 'redistribuição', 'conclusão', 'audiência',
      'designação', 'remessa', 'baixa', 'arquivamento', 'homologação', 'julgamento',
      'prolação', 'determinação', 'tutela', 'antecipação', 'instrução',
      'intimação', 'citação', 'pauta', 'certidão', 'vista', 'suspensão',
      'sobrestamento', 'retorno', 'redistribuição', 'recebimento', 'juntada',
      'carga', 'conclusos', 'devolução', 'encerramento', 'prazo'
    ].some(k => n.includes(k));

    // Detecta se requer ação das partes
    const needsAction = ['intimação', 'citação', 'vista', 'prazo', 'diligência',
      'para manifestar', 'para apresentar', 'para cumprir', 'em cartório',
      'para contestar', 'para recorrer'].some(k => n.includes(k));

    let actionHint: string | undefined;
    if (needsAction) {
      if (n.includes('contestação') || n.includes('citação')) actionHint = 'Prazo para apresentar contestação';
      else if (n.includes('recurso') || n.includes('apelação')) actionHint = 'Verifique prazo recursal';
      else if (n.includes('manifestar') || n.includes('manifestação')) actionHint = 'Aguardando sua manifestação';
      else if (n.includes('diligência')) actionHint = 'Cumpra a diligência determinada';
      else if (n.includes('vista')) actionHint = 'Processo com vista — analise e responda';
      else actionHint = 'Verifique prazos e providências necessárias';
    }

    // Prioridade: MP > Passivo > Ativo > Juízo > Outro
    // (Juízo tem keywords mais genéricos, então verifica por último)
    const polo = isMP ? 'mp'
      : isPassivo ? 'passivo'
      : isAtivo && !isJuizo ? 'ativo'   // "juntada de petição" é ativo, mas "juntada" sozinho é juízo
      : isJuizo ? 'juizo'
      : 'outro';

    return { polo, actionRequired: needsAction, actionHint };
  }

  private static getMockData(number: string): ProcessStatus {
    return {
      number: number,
      status: 'Em andamento (Simulado)',
      court: 'Juizado Especial Cível de Teste',
      distributionDate: new Date().toLocaleDateString('pt-BR'),
      judge: 'Minerva AI Assistant',
      movements: [
        { id: '1', date: new Date().toISOString(), description: 'Ato ordinatório praticado - Aguardando Key Real.', type: 'Simulado' },
        { id: '2', date: new Date(Date.now() - 86400000).toISOString(), description: 'Processo simulado para testes de interface.', type: 'Simulado' }
      ]
    };
  }
}
