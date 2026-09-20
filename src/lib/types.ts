/**
 * @fileOverview CONTRATOS TÉCNICOS CENTRALIZADOS.
 */

export interface Cnae {
  code: string;
  description: string;
  requiresPba?: boolean;
  porte?: string;
}

export interface CompanyData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  cnaes: Cnae[];
  situacaoCadastral?: string;
  motivoSituacaoCadastral?: string;
}

export type RiskLevel = 'ALTO' | 'MEDIO' | 'BAIXO' | 'CONDICIONADO' | 'NÃO ENCONTRADO';

export interface RiskAnalysisResult {
  level: RiskLevel;
  message: string;
  unresolved: any[];
  requiresPba: boolean;
  pbaNotes: string[];
  specialProjectNotes: string[];
  porte?: string;
  porteNotes: string[];
  baixoRiscoNotes: string[];
}

/* ------------------------------------------------------------------ *
 * CORPO DE BOMBEIROS MILITAR DO PARANÁ
 * Portaria do Comando-Geral nº 476/2025
 * ------------------------------------------------------------------ */

export type BombeirosRiskLevel = 'BAIXO' | 'MEDIO' | 'ALTO' | 'PENDENTE' | 'NÃO APLICÁVEL';

export type BombeirosQuestionId =
  | 'modo_exercicio'
  | 'area'
  | 'saida'
  | 'lotacao'
  | 'publico'
  | 'glp'
  | 'inflamaveis'
  | 'perigosos';

export interface BombeirosOption {
  value: string;
  label: string;
  /** Texto auxiliar exibido abaixo da opção. */
  hint?: string;
}

export interface BombeirosQuestion {
  id: BombeirosQuestionId;
  question: string;
  /** Rótulo curto usado quando a pergunta já respondida é recolhida em uma linha. */
  shortLabel: string;
  /** Detalhamento opcional do que a pergunta abrange. */
  help?: string;
  /** Dispositivo da Portaria que fundamenta a pergunta. */
  base: string;
  options: BombeirosOption[];
}

/** Enquadramento de um CNAE nos anexos da Portaria, antes de qualquer autodeclaração. */
export interface BombeirosTriagemItem {
  code: string;
  description: string;
  anexo: 'A' | 'B' | null;
  label: string;
  detail: string;
}

export interface BombeirosResult {
  level: BombeirosRiskLevel;
  /** `null` enquanto a análise estiver pendente de respostas. */
  requiresLicense: boolean | null;
  /**
   * Distinção do art. 8º: a dispensa das medidas de prevenção alcança quem se enquadra
   * no art. 3º, I a VI, mas NÃO quem se enquadra no art. 3º, VII (parágrafo único).
   */
  requiresFireSafetyMeasures: boolean | null;
  headline: string;
  procedure: string;
  reasons: string[];
  pendingQuestions: BombeirosQuestion[];
  triagem: BombeirosTriagemItem[];
  legalBasis: string[];
}

/* ------------------------------------------------------------------ *
 * ALVARÁ DE FUNCIONAMENTO — PARANÁ
 * Decreto Estadual nº 11.063/2025, que atualiza o Anexo Único do Decreto
 * Estadual nº 3.434/2023.
 *
 * Diferença estrutural em relação ao Bombeiros: aqui não há um questionário
 * global pequeno. Cada CNAE do Anexo Único carrega sua PRÓPRIA lista de
 * condições em texto livre, então a autodeclaração é feita por CNAE.
 * ------------------------------------------------------------------ */

/** "BAIXO" = via simplificada e automática; "PADRAO" = processo padrão do município. */
export type AlvaraRiskLevel = 'BAIXO' | 'PADRAO' | 'NÃO ENCONTRADO';

/** Uma condição do Anexo Único e a autodeclaração do usuário sobre ela. */
export interface AlvaraCondicaoItem {
  texto: string;
  /** `null` enquanto não respondida. */
  atendida: boolean | null;
}

/**
 * Enquadramento de um CNAE da empresa no Anexo Único, já com a autodeclaração
 * aplicada a cada condição. Ao contrário do Bombeiros — questionário global e
 * pequeno —, cada CNAE aqui carrega sua própria lista de condições em texto
 * livre, então o checklist é por CNAE.
 */
export interface AlvaraTriagemItem {
  code: string;
  description: string;
  /** `false` quando o CNAE não consta do Anexo Único. */
  enquadrado: boolean;
  /** Vazio quando o CNAE não tem condições (enquadramento incondicional) ou não consta do Anexo. */
  condicoes: AlvaraCondicaoItem[];
  /** `true` quando o CNAE consta do Anexo e todas as condições foram confirmadas. */
  atende: boolean;
  /** `true` quando o CNAE consta do Anexo e ainda há condição sem resposta. */
  pendente: boolean;
}

export interface AlvaraResult {
  level: AlvaraRiskLevel;
  headline: string;
  procedure: string;
  reasons: string[];
  triagem: AlvaraTriagemItem[];
  legalBasis: string[];
}

/* ------------------------------------------------------------------ *
 * LICENCIAMENTO AMBIENTAL — PARANÁ
 * Lei Estadual nº 22.252/2024, Decreto Estadual nº 9.541/2025 e
 * tipologias publicadas pelo IAT.
 *
 * DIFERENÇA FUNDAMENTAL em relação às outras três frentes: aqui NÃO existe
 * anexo legal indexado por CNAE. A norma classifica por tipologia em texto e
 * por porte em unidades físicas, conjugados com potencial poluidor e
 * sensibilidade da localização. Por isso este módulo ORIENTA — sinaliza que a
 * atividade costuma exigir licenciamento e diz o que levar a qual órgão —,
 * mas nunca afirma enquadramento, grau de risco ou dispensa.
 * ------------------------------------------------------------------ */

/** Não é grau de risco: é o quanto a curadoria consegue dizer a partir do CNAE. */
export type AmbientalSinal = 'PROVAVEL' | 'NÃO LISTADO' | 'NÃO APLICÁVEL';

/** Órgão provável, quando as respostas permitem indicar. Nunca é definitivo. */
export type AmbientalOrgao = 'ESTADUAL' | 'MUNICIPAL_OU_ESTADUAL' | 'INDEFINIDO';

export type AmbientalQuestionId = 'localizacao' | 'residuo' | 'porte';

export interface AmbientalQuestion {
  id: AmbientalQuestionId;
  question: string;
  shortLabel: string;
  help?: string;
  /** Critério da norma a que a pergunta corresponde. */
  base: string;
  options: { value: string; label: string; hint?: string }[];
}

/** Um CNAE da empresa que caiu em alguma tipologia ambiental da curadoria. */
export interface AmbientalTipologiaItem {
  code: string;
  description: string;
  tipologia: string;
  origem: string;
  motivo: string;
}

export interface AmbientalResult {
  sinal: AmbientalSinal;
  headline: string;
  procedure: string;
  /** Atividades do CNPJ com incidência provável. */
  tipologias: AmbientalTipologiaItem[];
  /** Atividades sem correspondência na curadoria — ausência não significa dispensa. */
  semCorrespondencia: { code: string; description: string }[];
  /** O que o órgão vai pedir, montado a partir das respostas. */
  checklist: string[];
  orgao: AmbientalOrgao;
  orgaoTexto: string;
  pendingQuestions: AmbientalQuestion[];
  legalBasis: string[];
  /** Ressalva obrigatória: este módulo não emite veredito. */
  aviso: string;
}

/* ------------------------------------------------------------------ *
 * LICENÇA DA POLÍCIA CIVIL — PARANÁ
 * Lei Estadual nº 20.936/2021, alterada pela Lei nº 22.754/2025.
 *
 * Posição intermediária entre as frentes anteriores. Como a ambiental, o
 * Anexo Único é indexado por DESCRIÇÃO da atividade, não por CNAE — então a
 * ponte CNAE→item é curadoria. Mas, ao contrário da ambiental, quando o item
 * é identificado tudo o mais é determinado pela lei: o documento expedido, a
 * alíquota sobre a UPFPR, a periodicidade e a exigência de vistoria prévia.
 * Por isso esta frente informa inclusive o custo.
 * ------------------------------------------------------------------ */

export type PcprSinal = 'PROVAVEL' | 'NÃO LISTADO' | 'NÃO APLICÁVEL';

export type PcprQuestionId = 'controlados' | 'mei';

export interface PcprQuestion {
  id: PcprQuestionId;
  question: string;
  shortLabel: string;
  help?: string;
  base: string;
  options: { value: string; label: string; hint?: string }[];
}

/** Item do Anexo Único atingido por uma atividade da empresa. */
export interface PcprItemIncidente {
  /** Vazio quando a incidência vem da autodeclaração, e não de um CNAE. */
  code: string;
  description: string;
  item: string;
  grupo: number;
  discriminacao: string;
  documento: string;
  aliquota: number;
  valor2026: number | null;
  /** `true` quando o valor vem da tabela FUNESP publicada; `false` quando é calculado sobre a UPFPR. */
  valorOficial: boolean;
  periodicidade: string;
  vistoriaPrevia: boolean;
  motivo: string;
  /** `true` quando o item foi acionado pela resposta do usuário, não pelo código da atividade. */
  porDeclaracao?: boolean;
}

export interface PcprResult {
  sinal: PcprSinal;
  headline: string;
  procedure: string;
  incidencias: PcprItemIncidente[];
  semCorrespondencia: { code: string; description: string }[];
  /** Soma das taxas anuais dos itens atingidos, em reais. `null` quando não há incidência. */
  custoAnual: number | null;
  /** Soma das vistorias prévias exigidas, cobradas à parte das taxas. */
  custoVistorias: number | null;
  /** `true` quando o usuário declarou ser MEI: isento do pagamento, não da licença. */
  isentoMei: boolean;
  alertas: string[];
  pendingQuestions: PcprQuestion[];
  legalBasis: string[];
  aviso: string;
}
