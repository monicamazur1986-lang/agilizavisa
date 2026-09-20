'use client';

/**
 * @fileOverview CATÁLOGO OFICIAL DE SUBCLASSES CNAE — IBGE/CONCLA.
 *
 * Por que existe: os róis dos órgãos não são o catálogo da CNAE. Antes deste arquivo, o
 * portal só sabia dizer "não encontrado", sem distinguir duas situações muito diferentes
 * para quem consulta: um código que NÃO EXISTE (erro de digitação) e um código que existe
 * mas o órgão não classifica. A primeira exige corrigir o número; a segunda, procurar o
 * órgão. Confundir as duas é o pior tipo de resposta que um portal destes pode dar.
 *
 * Conferido em 19/09/2026: as 1.332 subclasses do IBGE correspondem exatamente ao
 * universo de códigos citados pelos róis da vigilância sanitária, do corpo de bombeiros e
 * do alvará — nenhum código a mais, nenhum a menos, nos dois sentidos.
 */

import catalogoRaw from './cnae-catalogo.json';

const catalogo = Object.freeze(catalogoRaw as {
  fonte: string;
  obtidoEm: string;
  total: number;
  subclasses: Record<string, string>;
});

function normalizeCnae(code: string): string {
  if (!code) return '';
  return String(code).replace(/\D/g, '').padStart(7, '0');
}

/** Descrição oficial da subclasse, ou `null` se o código não existir na CNAE. */
export function descricaoCnae(code: string): string | null {
  return catalogo.subclasses[normalizeCnae(code)] ?? null;
}

/** `true` quando o código corresponde a uma subclasse vigente da CNAE. */
export function cnaeExiste(code: string): boolean {
  return descricaoCnae(code) !== null;
}

export const CATALOGO_FONTE = catalogo.fonte;
export const CATALOGO_TOTAL = catalogo.total;
