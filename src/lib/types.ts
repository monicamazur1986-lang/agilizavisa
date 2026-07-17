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
}

export type RiskLevel = 'ALTO' | 'MEDIO' | 'BAIXO' | 'CONDICIONADO' | 'NÃO ENCONTRADO';

export interface RiskAnalysisResult {
  level: RiskLevel;
  message: string;
  unresolved: any[];
  requiresPba: boolean;
  porte?: string;
}
