'use client';

/**
 * @fileOverview MOTOR DE ANÁLISE DO CORPO DE BOMBEIROS MILITAR DO PARANÁ.
 * PORTARIA DO COMANDO-GERAL Nº 476/2025 (vigente desde 1º de setembro de 2025,
 * revoga a Portaria nº 049/2024).
 *
 * ESCOPO: trilha de EMPRESAS E ESTABELECIMENTOS (art. 3º a 5º e art. 8º/9º).
 * A trilha de EDIFICAÇÕES (art. 6º a 8º e art. 10 a 12) não é avaliada aqui, pois
 * depende de características do imóvel (pavimentos, área total, divisões de ocupação
 * da normatização do CBMPR) que não decorrem do CNPJ consultado.
 *
 * DIFERENÇA ESTRUTURAL EM RELAÇÃO À RESOLUÇÃO SESA Nº 1034/2020: aqui o CNAE NÃO
 * determina o risco sozinho. O Anexo A lista atividades "passíveis" de baixo risco —
 * é condição necessária, não suficiente. O art. 3º, VII exige o atendimento CUMULATIVO
 * das alíneas "a" a "h" (área, saída, lotação, público, GLP, inflamáveis, perigosos).
 */

import bombeirosDataRaw from './bombeiros-cnae.json';
import type {
  Cnae,
  BombeirosQuestion,
  BombeirosResult,
  BombeirosTriagemItem,
  BombeirosRiskLevel,
} from './types';

const bombeirosData = Object.freeze(bombeirosDataRaw as any);

const ANEXO_A: ReadonlySet<string> = new Set<string>(bombeirosData?.anexoA?.cnaes ?? []);
const ANEXO_B: ReadonlySet<string> = new Set<string>(bombeirosData?.anexoB?.cnaes ?? []);

function normalizeCnae(code: string): string {
  if (!code) return '';
  return String(code).replace(/\D/g, '').padStart(7, '0');
}

/* ------------------------------------------------------------------ *
 * PERGUNTAS DE AUTODECLARAÇÃO
 *
 * Diferentemente das perguntas da Vigilância Sanitária (indexadas por CNAE), estas
 * são sobre o ESTABELECIMENTO como um todo, portanto usam chaves globais.
 *
 * O art. 16 da Portaria estabelece que a classificação se dá com base nas informações
 * declaradas pelo responsável, cuja veracidade pode ser verificada a qualquer tempo.
 * ------------------------------------------------------------------ */

export const Q_MODO: BombeirosQuestion = {
  id: 'modo_exercicio',
  question: 'Como a atividade é exercida?',
  shortLabel: 'Forma de exercício',
  help: 'Algumas formas de operação garantem a dispensa automática, independentemente do CNAE.',
  base: 'Art. 3º, I a VI',
  options: [
    {
      value: 'residencia',
      label: 'Na residência do empresário, sem atendimento ao público',
      hint: 'Sem placas de identificação e sem estoque ou armazenamento de qualquer produto.',
    },
    {
      value: 'contato_fiscal',
      label: 'A residência é apenas endereço de contato ou fiscal',
      hint: 'A atividade em si ocorre em outro estabelecimento ou no endereço do cliente.',
    },
    {
      value: 'endereco_fiscal',
      label: 'A edificação é usada exclusivamente como endereço fiscal',
      hint: 'A atividade ocorre em outro estabelecimento ou no endereço do cliente.',
    },
    {
      value: 'virtual',
      label: 'Exclusivamente em ambiente virtual',
      hint: 'Atividade tipicamente digital, sem espaço físico para as operações.',
    },
    {
      value: 'ambulante',
      label: 'Atividade ambulante',
      hint: 'Carrinho de lanches, food truck, barraca itinerante, trio elétrico, carro alegórico e congêneres.',
    },
    {
      value: 'agro',
      label: 'Atividade agrossilvipastoril sem beneficiamento',
      hint: 'Ou com beneficiamento, desde que agricultura familiar ou empreendimento familiar rural (Lei Federal nº 11.326/2006). Silos e armazéns não se enquadram.',
    },
    {
      value: 'estabelecimento',
      label: 'Nenhuma das anteriores — há estabelecimento físico com operação no local',
    },
  ],
};

export const Q_AREA: BombeirosQuestion = {
  id: 'area',
  shortLabel: 'Área e pavimento',
  question:
    'O estabelecimento ocupa até 50 m², numa edificação de até 200 m², exclusivamente térrea e fora de Patrimônio Histórico Cultural?',
  help: 'Subsolo destinado exclusivamente a estacionamento, sem abastecimento de veículos, pode ser desconsiderado.',
  base: 'Art. 3º, VII, "b"',
  options: [
    { value: 'sim', label: 'Sim, atende a todos esses limites' },
    { value: 'nao', label: 'Não' },
  ],
};

export const Q_SAIDA: BombeirosQuestion = {
  id: 'saida',
  shortLabel: 'Saída para área externa',
  question:
    'O local possui saída direta para área externa, sem qualquer abertura para o interior de outros estabelecimentos ou edificações vizinhas?',
  base: 'Art. 3º, VII, "c"',
  options: [
    { value: 'sim', label: 'Sim' },
    { value: 'nao', label: 'Não' },
  ],
};

export const Q_LOTACAO: BombeirosQuestion = {
  id: 'lotacao',
  shortLabel: 'Lotação máxima',
  question: 'Qual a lotação máxima do estabelecimento?',
  help: 'A forma de cômputo da lotação segue a normatização do CBMPR (art. 13).',
  base: 'Art. 3º, VII, "d" e art. 4º, II',
  options: [
    { value: 'ate20', label: 'Até 20 pessoas' },
    { value: 'de21a100', label: 'De 21 a 100 pessoas' },
    { value: 'mais100', label: 'Mais de 100 pessoas' },
  ],
};

export const Q_PUBLICO: BombeirosQuestion = {
  id: 'publico',
  shortLabel: 'Público ou uso atendido',
  question: 'A atividade se destina a algum destes públicos ou usos?',
  help: 'Idosos, crianças ou pessoas com deficiência; hospitais e locais com pacientes que necessitem de cuidados especiais; teatros, cinemas, óperas, auditórios de estúdio de rádio e TV e assemelhados; casas de shows, casas noturnas e boates; clubes, restaurantes dançantes, bingo, bilhares, clubes de tiro, centros de eventos e boliches.',
  base: 'Art. 3º, VII, "e"',
  options: [
    { value: 'nao', label: 'Não, nenhum deles' },
    { value: 'sim', label: 'Sim, ao menos um deles' },
  ],
};

export const Q_GLP: BombeirosQuestion = {
  id: 'glp',
  shortLabel: 'Quantidade de GLP',
  question: 'Utiliza mais de 39 kg de gás liquefeito de petróleo (GLP)?',
  help: 'O limite corresponde a três botijões P13. É vedado o uso de botijões de GLP no interior da edificação (art. 14).',
  base: 'Art. 3º, VII, "f"',
  options: [
    { value: 'nao', label: 'Não, até 39 kg (ou não utiliza GLP)' },
    { value: 'sim', label: 'Sim, mais de 39 kg' },
  ],
};

export const Q_INFLAMAVEIS: BombeirosQuestion = {
  id: 'inflamaveis',
  shortLabel: 'Líquidos inflamáveis',
  question: 'Utiliza mais de 150 litros de líquidos inflamáveis e/ou combustíveis?',
  base: 'Art. 3º, VII, "g"',
  options: [
    { value: 'nao', label: 'Não, até 150 L (ou não utiliza)' },
    { value: 'sim', label: 'Sim, mais de 150 L' },
  ],
};

export const Q_PERIGOSOS: BombeirosQuestion = {
  id: 'perigosos',
  shortLabel: 'Produtos perigosos',
  question:
    'Utiliza, manipula, armazena ou comercializa produtos perigosos à saúde humana, ao meio ambiente ou ao patrimônio?',
  help: 'Explosivos, peróxidos orgânicos, substâncias oxidantes, tóxicas, radioativas, corrosivas e demais substâncias perigosas.',
  base: 'Art. 3º, VII, "h" e art. 4º, III',
  options: [
    { value: 'nao', label: 'Não' },
    { value: 'sim', label: 'Sim' },
  ],
};

/** Perguntas do art. 3º, VII — só fazem sentido quando todos os CNAEs constam do Anexo A. */
const QUESTOES_BAIXO_RISCO: BombeirosQuestion[] = [
  Q_AREA,
  Q_SAIDA,
  Q_LOTACAO,
  Q_PUBLICO,
  Q_GLP,
  Q_INFLAMAVEIS,
  Q_PERIGOSOS,
];

/** Perguntas do art. 4º — bastam quando o baixo risco já está descartado pelo CNAE. */
const QUESTOES_MEDIO_RISCO: BombeirosQuestion[] = [Q_LOTACAO, Q_PERIGOSOS];

const FUNDAMENTO_BASE = 'Portaria do Comando-Geral do CBMPR nº 476/2025';

/* ------------------------------------------------------------------ */

/** Classifica cada CNAE quanto à sua presença nos anexos da Portaria. */
export function triarCnaes(cnaes: Cnae[]): BombeirosTriagemItem[] {
  if (!Array.isArray(cnaes)) return [];

  return cnaes.map((c) => {
    const normalized = normalizeCnae(c.code);

    if (ANEXO_B.has(normalized)) {
      return {
        code: c.code,
        description: c.description,
        anexo: 'B' as const,
        label: 'Anexo B — alto risco',
        detail:
          'Atividade classificada como de alto risco pelo CBMPR. Não pode ser enquadrada como médio risco (art. 4º, I).',
      };
    }

    if (ANEXO_A.has(normalized)) {
      return {
        code: c.code,
        description: c.description,
        anexo: 'A' as const,
        label: 'Anexo A — passível de baixo risco',
        detail:
          'Constar no Anexo A é apenas a primeira das oito condições cumulativas do art. 3º, VII. Não garante, por si só, a dispensa.',
      };
    }

    return {
      code: c.code,
      description: c.description,
      anexo: null,
      label: 'Não listado nos anexos',
      detail:
        'Sem previsão no Anexo A, a atividade não pode ser enquadrada como baixo risco pelo art. 3º, VII. Será de médio ou alto risco conforme o art. 4º.',
    };
  });
}

function resultadoPendente(
  questions: BombeirosQuestion[],
  triagem: BombeirosTriagemItem[]
): BombeirosResult {
  return {
    level: 'PENDENTE',
    requiresLicense: null,
    requiresFireSafetyMeasures: null,
    headline: 'Responda às perguntas abaixo para saber se há dispensa',
    procedure:
      'A Portaria nº 476/2025 não define a exigência apenas pelo CNAE: o enquadramento depende também das características declaradas do estabelecimento.',
    reasons: [],
    pendingQuestions: questions,
    triagem,
    legalBasis: [FUNDAMENTO_BASE],
  };
}

/**
 * Avalia a necessidade de licenciamento do CBMPR para a empresa ou estabelecimento.
 *
 * Ordem de aplicação, conforme a Portaria:
 *   1. Art. 3º, I a VI — precedência absoluta: basta UMA hipótese para haver baixo risco,
 *      ainda que o CNAE conste do Anexo B.
 *   2. Anexo B — descarta o baixo risco (art. 3º, VII, "a") e o médio (art. 4º, I) ⇒ alto risco.
 *   3. Art. 3º, VII — baixo risco apenas se TODAS as alíneas "a" a "h" forem atendidas.
 *   4. Art. 4º — médio risco se não houver Anexo B, lotação ≤ 100 e ausência de produtos perigosos.
 *   5. Art. 5º — residualmente, alto risco.
 *
 * Com múltiplos CNAEs adota-se o critério mais restritivo: a presença de uma única atividade
 * do Anexo B leva o estabelecimento ao alto risco, e o baixo risco do art. 3º, VII exige que
 * todas as atividades constem do Anexo A.
 */
export function analyzeBombeiros(
  cnaes: Cnae[],
  answers: Record<string, string>
): BombeirosResult {
  const triagem = triarCnaes(cnaes);
  const respostas = answers || {};

  if (triagem.length === 0) {
    return {
      level: 'NÃO APLICÁVEL',
      requiresLicense: null,
      requiresFireSafetyMeasures: null,
      headline: 'Nenhuma atividade econômica identificada',
      procedure:
        'Sem CNAE informado não é possível aplicar a classificação de risco da Portaria nº 476/2025. Consulte o CBMPR.',
      reasons: [],
      pendingQuestions: [],
      triagem,
      legalBasis: [FUNDAMENTO_BASE],
    };
  }

  const anyAnexoB = triagem.some((t) => t.anexo === 'B');
  const allAnexoA = triagem.every((t) => t.anexo === 'A');

  // ETAPA 1 — Art. 3º, I a VI (precedência absoluta).
  const modo = respostas[Q_MODO.id];
  if (!modo) return resultadoPendente([Q_MODO], triagem);

  if (modo !== 'estabelecimento') {
    const rotulos: Record<string, string> = {
      residencia:
        'A atividade é exercida na residência do empresário, sem atendimento ao público, sem placas de identificação e sem estoque (art. 3º, I).',
      contato_fiscal:
        'A residência é utilizada apenas como endereço de contato ou fiscal (art. 3º, II).',
      endereco_fiscal:
        'A edificação é utilizada exclusivamente como endereço fiscal (art. 3º, III).',
      virtual: 'A atividade é exercida exclusivamente em ambiente virtual (art. 3º, IV).',
      ambulante: 'Trata-se de atividade econômica ambulante (art. 3º, V).',
      agro:
        'Trata-se de atividade agrossilvipastoril enquadrada no art. 3º, VI, excetuados silos e armazéns.',
    };

    const reasons = [rotulos[modo] ?? 'Hipótese de baixo risco do art. 3º, I a VI.'];
    if (anyAnexoB) {
      reasons.push(
        'Observação: há atividade do Anexo B (alto risco) no CNPJ, mas as hipóteses do art. 3º, I a VI independem do CNAE. Caso a forma de operação declarada mude, a classificação deve ser refeita.'
      );
    }

    return {
      level: 'BAIXO',
      requiresLicense: false,
      requiresFireSafetyMeasures: false,
      headline: 'Dispensado da licença do Corpo de Bombeiros',
      procedure:
        'Baixo risco. A empresa está dispensada do licenciamento do CBMPR e também da implementação das medidas de prevenção e combate a incêndio e a desastres (art. 8º, caput).',
      reasons,
      // Mantém a pergunta para que a forma de operação declarada possa ser revista.
      pendingQuestions: [Q_MODO],
      triagem,
      legalBasis: [FUNDAMENTO_BASE, 'Art. 3º, I a VI', 'Art. 8º'],
    };
  }

  // ETAPA 2 — Anexo B encerra a análise em alto risco.
  if (anyAnexoB) {
    const listados = triagem.filter((t) => t.anexo === 'B').map((t) => t.code).join(', ');
    return {
      level: 'ALTO',
      requiresLicense: true,
      requiresFireSafetyMeasures: true,
      headline: 'Exige licenciamento do Corpo de Bombeiros',
      procedure:
        'Alto risco. A empresa será submetida ao licenciamento simplificado do CBMPR (art. 9º).',
      reasons: [
        `A atividade ${listados} consta do Anexo B da Portaria, que relaciona as atividades de alto risco.`,
        'Por constar do Anexo B, a atividade não pode ser enquadrada como de médio risco (art. 4º, I) nem como de baixo risco pelo art. 3º, VII, "a".',
      ],
      pendingQuestions: [Q_MODO],
      triagem,
      legalBasis: [FUNDAMENTO_BASE, 'Anexo B', 'Art. 5º', 'Art. 9º'],
    };
  }

  // ETAPA 3 — perguntas pertinentes conforme a triagem do CNAE.
  const questoes = allAnexoA ? QUESTOES_BAIXO_RISCO : QUESTOES_MEDIO_RISCO;
  // Q_MODO permanece na lista exibida para poder ser revista, mas não entra em
  // "faltantes": ela já foi respondida para a análise chegar até aqui.
  const questoesExibidas = [Q_MODO, ...questoes];
  const faltantes = questoes.filter((q) => !respostas[q.id]);
  if (faltantes.length > 0) return resultadoPendente(questoesExibidas, triagem);

  const lotacao = respostas[Q_LOTACAO.id];
  const perigosos = respostas[Q_PERIGOSOS.id];

  // Art. 3º, VII — todas as alíneas devem ser atendidas cumulativamente.
  if (allAnexoA) {
    const falhas: string[] = [];
    if (respostas[Q_AREA.id] !== 'sim')
      falhas.push('os limites de área e pavimento da alínea "b" não são atendidos');
    if (respostas[Q_SAIDA.id] !== 'sim')
      falhas.push('não há saída direta para área externa nos termos da alínea "c"');
    if (lotacao !== 'ate20') falhas.push('a lotação supera 20 pessoas (alínea "d")');
    if (respostas[Q_PUBLICO.id] !== 'nao')
      falhas.push('a atividade se destina a público ou uso vedado pela alínea "e"');
    if (respostas[Q_GLP.id] !== 'nao')
      falhas.push('a quantidade de GLP supera 39 kg (alínea "f")');
    if (respostas[Q_INFLAMAVEIS.id] !== 'nao')
      falhas.push('a quantidade de inflamáveis ou combustíveis supera 150 L (alínea "g")');
    if (perigosos !== 'nao')
      falhas.push('há produtos perigosos envolvidos na atividade (alínea "h")');

    if (falhas.length === 0) {
      return {
        level: 'BAIXO',
        requiresLicense: false,
        // Art. 8º, parágrafo único: a dispensa das medidas de prevenção NÃO alcança
        // quem se enquadra pelo inciso VII do art. 3º.
        requiresFireSafetyMeasures: true,
        headline: 'Dispensado da licença do Corpo de Bombeiros',
        procedure:
          'Baixo risco. A empresa está dispensada do licenciamento do CBMPR, mas NÃO está dispensada de implementar as medidas de prevenção e combate a incêndio e a desastres (art. 8º, parágrafo único).',
        reasons: [
          'A atividade consta do Anexo A e foram atendidas cumulativamente todas as oito condições do art. 3º, VII.',
        ],
        pendingQuestions: questoesExibidas,
        triagem,
        legalBasis: [FUNDAMENTO_BASE, 'Anexo A', 'Art. 3º, VII', 'Art. 8º, parágrafo único'],
      };
    }

    return classificarMedioOuAlto(lotacao, perigosos, triagem, questoesExibidas, [
      `Embora a atividade conste do Anexo A, o baixo risco foi afastado porque ${falhas.join('; ')}.`,
      'O art. 3º, VII exige o atendimento cumulativo de todas as alíneas "a" a "h" — o descumprimento de uma única delas já impede a dispensa.',
    ]);
  }

  // CNAE fora do Anexo A: o baixo risco do art. 3º, VII é inaplicável.
  return classificarMedioOuAlto(lotacao, perigosos, triagem, questoesExibidas, [
    'Nenhuma das atividades do CNPJ consta do Anexo A, o que afasta o enquadramento como baixo risco pelo art. 3º, VII, "a".',
  ]);
}

function classificarMedioOuAlto(
  lotacao: string | undefined,
  perigosos: string | undefined,
  triagem: BombeirosTriagemItem[],
  questoes: BombeirosQuestion[],
  reasons: string[]
): BombeirosResult {
  const impedimentos: string[] = [];
  if (lotacao === 'mais100') impedimentos.push('a lotação supera 100 pessoas (art. 4º, II)');
  if (perigosos === 'sim')
    impedimentos.push('há produtos perigosos envolvidos na atividade (art. 4º, III)');

  const level: BombeirosRiskLevel = impedimentos.length > 0 ? 'ALTO' : 'MEDIO';

  const procedimento =
    level === 'ALTO'
      ? 'Alto risco. A empresa será submetida ao licenciamento simplificado do CBMPR (art. 9º).'
      : 'Médio risco. A empresa será submetida ao licenciamento simplificado do CBMPR (art. 9º).';

  const conclusao =
    level === 'ALTO'
      ? `O médio risco foi afastado porque ${impedimentos.join(' e ')}, restando o enquadramento residual em alto risco (art. 5º).`
      : 'Atendidos os requisitos do art. 4º — ausência de previsão no Anexo B, lotação de até 100 pessoas e ausência de produtos perigosos —, a atividade é de médio risco.';

  return {
    level,
    requiresLicense: true,
    requiresFireSafetyMeasures: true,
    headline: 'Exige licenciamento do Corpo de Bombeiros',
    procedure: procedimento,
    reasons: [...reasons, conclusao],
    pendingQuestions: questoes,
    triagem,
    legalBasis: [
      FUNDAMENTO_BASE,
      level === 'ALTO' ? 'Art. 5º' : 'Art. 4º',
      'Art. 9º',
    ],
  };
}
