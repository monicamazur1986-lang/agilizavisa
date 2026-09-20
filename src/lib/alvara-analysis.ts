'use client';

/**
 * @fileOverview MOTOR DE ANÁLISE DO ALVARÁ DE FUNCIONAMENTO — PARANÁ.
 * DECRETO ESTADUAL Nº 11.063/2025, que atualiza o Anexo Único do Decreto
 * Estadual nº 3.434/2023.
 *
 * A classificação vem de decreto ESTADUAL, mas o alvará em si é emitido pelo
 * MUNICÍPIO — o decreto só define quando a emissão pode ser simplificada e
 * automática (sem vistoria prévia). Constar no Anexo Único não dispensa o
 * alvará: apenas afasta a via padrão, desde que TODAS as condições da
 * atividade sejam atendidas cumulativamente (art. equivalente ao "Baixo Risco
 * A" do anexo).
 *
 * DIFERENÇA ESTRUTURAL EM RELAÇÃO AO CBMPR: lá o questionário é global e
 * pequeno (oito alíneas do art. 3º, VII). Aqui cada CNAE do Anexo carrega sua
 * própria lista de condições em texto livre — a autodeclaração é por CNAE,
 * não por estabelecimento, por isso as respostas usam uma chave composta
 * (CNAE + índice da condição).
 *
 * Não existe, por ora, uma classificação formal de médio/alto risco para esta
 * trilha: fora do Anexo, ou com condição não atendida, o resultado é sempre o
 * processo padrão de alvará junto ao município.
 */

import alvaraDataRaw from './alvara-cnae.json';
import type {
  Cnae,
  AlvaraCondicaoItem,
  AlvaraResult,
  AlvaraTriagemItem,
} from './types';

const alvaraData = Object.freeze(alvaraDataRaw as any);

interface AlvaraCnaeEntry {
  code: string;
  description: string;
  conditions: string[];
}

const ANEXO: ReadonlyMap<string, AlvaraCnaeEntry> = new Map(
  (alvaraData?.cnaes ?? []).map((c: AlvaraCnaeEntry) => [c.code, c])
);

function normalizeCnae(code: string): string {
  if (!code) return '';
  return String(code).replace(/\D/g, '').padStart(7, '0');
}

const FUNDAMENTO_BASE =
  'Decreto Estadual nº 11.063/2025 (Paraná), que atualiza o Anexo Único do Decreto Estadual nº 3.434/2023';

/**
 * Chave de resposta de uma condição. Cada CNAE tem sua própria lista de
 * condições, então a chave precisa identificar o CNAE e a posição da condição
 * nele — diferente do Bombeiros, cujas perguntas são globais ao estabelecimento.
 */
export function chaveCondicao(code: string, index: number): string {
  return `${normalizeCnae(code)}__${index}`;
}

/**
 * Classifica cada CNAE da empresa quanto ao Anexo Único e já aplica a
 * autodeclaração informada. Um CNAE do Anexo sem condições é atendido
 * automaticamente — não há o que autodeclarar.
 */
export function triarCnaes(cnaes: Cnae[], answers: Record<string, string>): AlvaraTriagemItem[] {
  if (!Array.isArray(cnaes)) return [];
  const respostas = answers || {};

  return cnaes.map((c) => {
    const normalized = normalizeCnae(c.code);
    const entry = ANEXO.get(normalized);

    if (!entry) {
      return {
        code: c.code,
        description: c.description,
        enquadrado: false,
        condicoes: [],
        atende: false,
        pendente: false,
      };
    }

    const condicoes: AlvaraCondicaoItem[] = entry.conditions.map((texto, i) => {
      const resposta = respostas[chaveCondicao(c.code, i)];
      const atendida = resposta === 'sim' ? true : resposta === 'nao' ? false : null;
      return { texto, atendida };
    });

    return {
      code: c.code,
      // Quando o chamador não informa descrição (consulta só por CNAE, sem CNPJ), usa a do Anexo.
      description: c.description || entry.description,
      enquadrado: true,
      condicoes,
      atende: condicoes.every((cond) => cond.atendida === true),
      pendente: condicoes.some((cond) => cond.atendida === null),
    };
  });
}

/**
 * Avalia a exigência do alvará de funcionamento para a empresa.
 *
 * Com múltiplos CNAEs, adota-se o critério mais restritivo — o mesmo princípio
 * da Vigilância Sanitária e do CBMPR: uma única atividade fora do Anexo, ou com
 * condição não atendida ou ainda pendente, já afasta a via simplificada para o
 * CNPJ inteiro.
 */
export function analyzeAlvara(cnaes: Cnae[], answers: Record<string, string>): AlvaraResult {
  const triagem = triarCnaes(cnaes, answers);

  if (triagem.length === 0) {
    return {
      level: 'NÃO ENCONTRADO',
      headline: 'Nenhuma atividade econômica identificada',
      procedure:
        'Sem CNAE informado não é possível localizar a atividade no Anexo Único do Decreto Estadual nº 11.063/2025. Consulte a prefeitura do município onde a empresa está estabelecida.',
      reasons: [],
      triagem,
      legalBasis: [FUNDAMENTO_BASE],
    };
  }

  const todasAtendem = triagem.every((t) => t.atende);

  if (todasAtendem) {
    return {
      level: 'BAIXO',
      headline: 'Alvará liberado sem vistoria prévia',
      procedure:
        'Todas as atividades do CNPJ constam do Anexo Único e cumprem as condições exigidas: a prefeitura pode emitir o alvará direto, sem vistoriar o local antes de abrir. O pedido continua sendo necessário — feito à prefeitura do município onde a empresa está estabelecida.',
      reasons: [
        'Todas as atividades econômicas do CNPJ constam do Anexo Único e atendem às condições exigidas para a atividade.',
      ],
      triagem,
      legalBasis: [FUNDAMENTO_BASE],
    };
  }

  const reasons: string[] = [];
  for (const item of triagem) {
    if (!item.enquadrado) {
      reasons.push(
        `${item.code} — ${item.description}: a atividade não consta do Anexo Único, o que afasta a emissão simplificada para o CNPJ.`
      );
      continue;
    }
    if (item.pendente) {
      const faltantes = item.condicoes.filter((c) => c.atendida === null).length;
      reasons.push(
        `${item.code} — ${item.description}: ainda ${faltantes === 1 ? 'falta 1 condição' : `faltam ${faltantes} condições`} a confirmar no Anexo Único.`
      );
      continue;
    }
    reasons.push(
      `${item.code} — ${item.description}: não atende a uma ou mais condições exigidas pelo Anexo Único, o que afasta a emissão simplificada para esta atividade.`
    );
  }

  return {
    level: 'PADRAO',
    headline: 'Alvará sujeito a vistoria prévia',
    procedure:
      'Ao menos uma atividade do CNPJ não consta do Anexo Único, ou não atende (ainda) a alguma condição exigida: o pedido segue o trâmite normal da prefeitura, que pode incluir vistoria do local antes da emissão. O alvará é obrigatório nos dois casos — muda apenas o rito.',
    reasons,
    triagem,
    legalBasis: [FUNDAMENTO_BASE],
  };
}
