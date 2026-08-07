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
