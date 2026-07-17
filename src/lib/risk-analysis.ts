'use client';

/**
 * @fileOverview MOTOR DE ANÁLISE TÉCNICA ULTRA-RESILIENTE.
 * RESOLUÇÃO SESA Nº 1034/2020 | DECRETO ESTADUAL Nº 10.590/2025.
 */

import riskDataRaw from './cnae-risk.json';
import type { Cnae, RiskLevel, RiskAnalysisResult } from './types';

const riskData = Object.freeze(riskDataRaw as any) || { risks: {} };

function normalizeCnae(code: string): string {
  if (!code) return '';
  return String(code).replace(/\D/g, '').padStart(7, '0');
}

function getPorteForCnae(code: string): string {
  const normalized = normalizeCnae(code);
  const exceptions: Record<string, string> = {
    "2099199": "Porte III",
    "0892403": "Porte III",
    "1032501": "Porte III",
    "1041400": "Porte II e III",
    "1042200": "Porte II e III",
    "1053800": "Porte III",
    "1065102": "Porte II e III",
    "1065103": "Porte II e III",
    "1072401": "Porte II e III",
    "1082100": "Porte II e III",
    "1099602": "Porte III",
    "1099603": "Porte III",
    "1099606": "Porte III",
    "1099607": "Porte III",
    "1121600": "Porte III",
    "1122404": "Porte III",
    "1122499": "Porte III",
    "1742701": "Porte III",
    "1742702": "Porte III",
    "2052500": "Porte III",
    "2061400": "Porte III",
    "2062200": "Porte III",
    "2063100": "Porte III",
    "2110600": "Porte III",
    "2121101": "Porte III",
    "2121102": "Porte III",
    "2121103": "Porte III",
    "2123800": "Porte III",
    "2660400": "Porte III",
    "3250701": "Porte III",
    "3250702": "Porte III",
    "3250703": "Porte III",
    "3250704": "Porte III",
    "3250705": "Porte III",
    "4645101": "Porte II e III",
    "4645102": "Porte II e III",
    "4645103": "Porte II e III",
    "4646001": "Porte II e III",
    "4646002": "Porte II e III",
    "4649408": "Porte II e III",
    "4649409": "Porte II e III",
    "4771702": "Porte II e III",
    "5620101": "Porte II e III",
    "8610101": "Porte III",
    "8610102": "Porte III",
    "8621601": "Porte III",
    "8630507": "Porte III",
    "8640201": "Porte II e III",
    "8640203": "Porte III",
    "8640204": "Porte II e III",
    "8640206": "Porte II e III",
    "8640207": "Porte II e III",
    "8640209": "Porte III",
    "8640210": "Porte III",
    "8640211": "Porte III",
    "8640212": "Porte III",
    "8640214": "Porte III",
    "8650007": "Porte III",
    "8690902": "Porte II e III",
    "8712300": "Porte II e III",
    "9603305": "Porte II e III"
  };
  return exceptions[normalized] || "Porte I, II e III";
}

export function resolveCnaeRisk(code: string, answers: Record<string, string>): { 
  risk: RiskLevel; 
  question?: string; 
  path?: string; 
  requiresPba?: boolean;
  porte?: string;
} {
  if (!riskData || !riskData.risks) return { risk: 'NÃO ENCONTRADO' };
  
  const normalizedSearchCode = normalizeCnae(code);
  const levels: RiskLevel[] = ['ALTO', 'CONDICIONADO', 'MEDIO', 'BAIXO'];
  const porte = getPorteForCnae(code);
  
  for (const level of levels) {
    const cnaesList = riskData.risks[level]?.cnaes;
    if (!Array.isArray(cnaesList)) continue;
    
    const found = cnaesList.find((c: any) => normalizeCnae(c.code) === normalizedSearchCode);
    
    if (found) {
      if (level !== 'CONDICIONADO') {
        return { 
          risk: level as RiskLevel, 
          requiresPba: !!found.requiresPba,
          porte
        };
      }
      
      let node = found;
      let path = normalizedSearchCode; 
      while (node && node.question) {
        const ans = answers[path];
        if (!ans) return { risk: 'CONDICIONADO', question: node.question, path, porte };
        
        const outcome = node.outcomes?.[ans];
        if (!outcome) return { risk: 'NÃO ENCONTRADO', porte };

        if (typeof outcome === 'object' && outcome.risk) {
          return { 
            risk: outcome.risk as RiskLevel, 
            requiresPba: !!outcome.requiresPba,
            porte
          };
        }
        
        if (typeof outcome === 'string') {
          return { risk: outcome as RiskLevel, requiresPba: false, porte };
        }
        
        node = outcome;
        path = `${path}:${ans}`;
      }
    }
  }
  return { risk: 'NÃO ENCONTRADO', porte };
}

export function analyzeRisk(cnaes: Cnae[], answers: Record<string, string>): RiskAnalysisResult {
  let highest: RiskLevel = 'BAIXO';
  let pbaRequired = false;
  const unresolved: any[] = [];
  
  const priority: Record<string, number> = { 'ALTO': 4, 'CONDICIONADO': 3, 'MEDIO': 2, 'BAIXO': 1, 'NÃO ENCONTRADO': 0 };

  if (!Array.isArray(cnaes) || cnaes.length === 0) {
    return {
      level: 'NÃO ENCONTRADO',
      message: "Atividade econômica não localizada no rol taxativo oficial da Resolução SESA nº 1034/2020.",
      unresolved: [],
      requiresPba: false
    };
  }

  cnaes.forEach(c => {
    const res = resolveCnaeRisk(c.code, answers);
    if (res.risk === 'CONDICIONADO') unresolved.push({ ...c, ...res });
    if (res.requiresPba) pbaRequired = true;
    
    const currentPriority = priority[res.risk] ?? 0;
    const highestPriority = priority[highest] ?? 0;
    if (currentPriority > highestPriority) highest = res.risk as RiskLevel;
  });

  const finalLevel = unresolved.length > 0 ? 'CONDICIONADO' : highest;
  
  const messages: Record<string, string> = {
    'ALTO': "Atividade econômica de Alto Risco (Nível III). Exige inspeção sanitária prévia obrigatória e aprovação documental/projeto pela autoridade sanitária competente antes do início das atividades. A emissão da Licença Sanitária está condicionada à conformidade verificada em vistoria local.",
    'BAIXO': "Atividade econômica de Baixo Risco (Nível I). Esta classificação dispensa o estabelecimento da exigência de licenciamento sanitário para o início das operações, devendo o responsável observar rigorosamente as normas sanitárias vigentes.",
    'MEDIO': "Atividade de Médio Risco (Nível II). Permite a emissão da Licença Sanitária de forma simplificada e o início imediato das operações após o licenciamento, sem prejuízo de fiscalização posterior para verificação das condições autodeclaradas.",
    'CONDICIONADO': "Classificação de Risco Condicionada. A definição final do nível de risco depende obrigatoriamente das respostas técnicas às perguntas de autodeclaração relacionadas à infraestrutura e processos de trabalho.",
    'NÃO ENCONTRADO': "Atividade econômica não localizada no rol taxativo oficial. Recomenda-se consulta direta à Vigilância Sanitária municipal para enquadramento individualizado conforme a complexidade das operações."
  };

  // Determinar porte global (mais restritivo)
  let globalPorte = "Porte I, II e III";
  const portes = cnaes.map(c => getPorteForCnae(c.code));
  if (portes.some(p => p === "Porte III")) {
    globalPorte = "Porte III";
  } else if (portes.some(p => p === "Porte II e III") && globalPorte === "Porte I, II e III") {
    globalPorte = "Porte II e III";
  }

  return {
    level: finalLevel as RiskLevel,
    message: messages[finalLevel] || messages['NÃO ENCONTRADO'],
    unresolved,
    requiresPba: pbaRequired,
    porte: globalPorte
  };
}
