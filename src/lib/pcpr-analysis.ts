'use client';

/**
 * @fileOverview MOTOR DA LICENÇA DA POLÍCIA CIVIL — PARANÁ.
 * Lei Estadual nº 20.936/2021, alterada pela Lei Estadual nº 22.754/2025.
 * Valores da Tabela de Taxas FUNESP — D.E.A.M., exercício 2026.
 *
 * O Anexo Único é uma lista FECHADA e numerada, mas indexada por descrição da
 * atividade — não por CNAE. A ponte CNAE→item é curadoria do portal, como na frente
 * ambiental. A diferença é o que vem depois: identificado o item, a lei determina o
 * documento, a alíquota, a periodicidade e a vistoria. Daí esta frente conseguir
 * informar o custo, o que nenhuma das outras faz.
 *
 * Duas armadilhas que o motor trata explicitamente, porque são as que mais pegam
 * pequenos negócios:
 *   1. O MEI é isento da TAXA (art. 5º, II), mas NÃO da licença (art. 6º, par. único).
 *   2. O cadastro é PRÉVIO ao início da atividade (art. 3º, §1º), e operar sem licença
 *      custa multa de 100% da taxa (art. 16, par. único).
 */

import pcprDataRaw from './pcpr-cnae.json';
import type { Cnae, PcprItemIncidente, PcprQuestion, PcprResult } from './types';

const pcprData = Object.freeze(pcprDataRaw as any);

interface ItemAnexo {
  item: string;
  grupo: number;
  discriminacao: string;
  documento: string;
  aliquota: number;
  valor2026: number | null;
  valorOficial: boolean;
  periodicidade: string;
  vistoriaPrevia: boolean;
  motivo: string;
  cnaes: string[];
}

function normalizeCnae(code: string): string {
  if (!code) return '';
  return String(code).replace(/\D/g, '').padStart(7, '0');
}

const ITENS: ItemAnexo[] = (pcprData?.itens ?? []) as ItemAnexo[];

const POR_CNAE: ReadonlyMap<string, ItemAnexo> = (() => {
  const mapa = new Map<string, ItemAnexo>();
  for (const item of ITENS) {
    for (const code of item.cnaes) mapa.set(normalizeCnae(code), item);
  }
  return mapa;
})();

const UPFPR: number = pcprData?.upfpr?.valor ?? 0;
const ANO: number = pcprData?.upfpr?.ano ?? 0;

/** Vistorias do Anexo, cobradas à parte da taxa da atividade. */
const VISTORIA_G2 = 73.59; // item 2.24 — 50% da UPFPR, valor da tabela FUNESP 2026
const VISTORIA_G3 = Math.round((0.3 * UPFPR + Number.EPSILON) * 100) / 100; // item 3.30 — 30%

const FUNDAMENTO_BASE =
  'Lei Estadual nº 20.936/2021, alterada pela Lei Estadual nº 22.754/2025';

const AVISO =
  'O Anexo Único da lei lista as atividades por descrição, não por código CNAE. A correspondência entre o seu CNAE e o item do Anexo é curadoria do portal: serve para alertar e para mostrar o custo, mas o enquadramento é confirmado pela própria Polícia Civil no momento do cadastro.';

export const Q_CONTROLADOS: PcprQuestion = {
  id: 'controlados',
  shortLabel: 'Produtos controlados',
  question:
    'A empresa fabrica, guarda, usa, transporta ou vende produtos químicos, inflamáveis, corrosivos, explosivos, combustíveis, fogos, armas ou munições?',
  help: 'Vale mesmo que não seja o objeto principal do negócio — guardar ou usar o produto já basta para atrair a licença, pelo item 2.3 do Anexo.',
  base: 'Art. 2º, §1º, I e II, e art. 20 da Lei nº 20.936/2021',
  options: [
    { value: 'nao', label: 'Não' },
    { value: 'sim', label: 'Sim, em alguma dessas formas' },
    { value: 'naosei', label: 'Não sei dizer' },
  ],
};

export const Q_MEI: PcprQuestion = {
  id: 'mei',
  shortLabel: 'Enquadramento',
  question: 'A empresa é Microempreendedor Individual (MEI)?',
  help: 'O MEI é isento do pagamento da taxa. A isenção não dispensa a licença nem a vistoria — é o ponto em que mais se erra.',
  base: 'Art. 5º, II, e art. 6º, parágrafo único, da Lei nº 20.936/2021',
  options: [
    { value: 'nao', label: 'Não' },
    { value: 'sim', label: 'Sim, é MEI' },
  ],
};

const QUESTOES: PcprQuestion[] = [Q_CONTROLADOS, Q_MEI];

/** Item 2.3 — acionado pela autodeclaração quando o CNAE não revela o produto controlado. */
const ITEM_DEPOSITO = ITENS.find((i) => i.item === '2.3');

function paraIncidente(
  item: ItemAnexo,
  code: string,
  description: string,
  porDeclaracao = false
): PcprItemIncidente {
  return {
    code,
    description,
    item: item.item,
    grupo: item.grupo,
    discriminacao: item.discriminacao,
    documento: item.documento,
    aliquota: item.aliquota,
    valor2026: item.valor2026,
    valorOficial: item.valorOficial,
    periodicidade: item.periodicidade,
    vistoriaPrevia: item.vistoriaPrevia,
    motivo: item.motivo,
    porDeclaracao,
  };
}

export function analyzePcpr(cnaes: Cnae[], answers: Record<string, string>): PcprResult {
  const respostas = answers || {};
  const lista = Array.isArray(cnaes) ? cnaes : [];

  const incidencias: PcprItemIncidente[] = [];
  const semCorrespondencia: { code: string; description: string }[] = [];

  for (const c of lista) {
    const item = POR_CNAE.get(normalizeCnae(c.code));
    if (item) incidencias.push(paraIncidente(item, c.code, c.description));
    else semCorrespondencia.push({ code: c.code, description: c.description });
  }

  const controlados = respostas[Q_CONTROLADOS.id];
  const mei = respostas[Q_MEI.id];
  const isentoMei = mei === 'sim';

  // Quem declara lidar com produto controlado e ainda não caiu em nenhum item do
  // grupo 2 atrai o item 2.3, que alcança o simples depósito ou uso.
  const temGrupo2 = incidencias.some((i) => i.grupo === 2);
  if (controlados === 'sim' && !temGrupo2 && ITEM_DEPOSITO) {
    incidencias.push(paraIncidente(ITEM_DEPOSITO, '', 'Declarado na triagem', true));
  }

  const alertas: string[] = [];

  if (lista.length === 0) {
    return {
      sinal: 'NÃO APLICÁVEL',
      headline: 'Nenhuma atividade econômica identificada',
      procedure:
        'Sem CNAE informado não é possível verificar incidência do Anexo Único da Lei nº 20.936/2021.',
      incidencias: [],
      semCorrespondencia: [],
      custoAnual: null,
      custoVistorias: null,
      isentoMei: false,
      alertas: [],
      pendingQuestions: [],
      legalBasis: [FUNDAMENTO_BASE],
      aviso: AVISO,
    };
  }

  if (incidencias.length === 0) {
    if (controlados === 'naosei') {
      alertas.push(
        'Se a empresa mantiver no local qualquer produto químico, inflamável ou combustível, ainda que em pequena quantidade e não para venda, o item 2.3 do Anexo pode incidir. Na dúvida, pergunte à Polícia Civil antes de abrir.'
      );
    }
    return {
      sinal: 'NÃO LISTADO',
      headline: 'Não identificamos incidência pelo código da atividade',
      procedure:
        'Nenhuma atividade deste CNPJ corresponde a item do Anexo Único da Lei nº 20.936/2021 na nossa curadoria. O Anexo é uma lista fechada, então a ausência aqui é um bom indício — mas como a lista é por descrição de atividade, e não por CNAE, confirme com a Polícia Civil se o negócio envolver produto controlado, hospedagem, veículos, joias ou segurança.',
      incidencias: [],
      semCorrespondencia,
      custoAnual: null,
      custoVistorias: null,
      isentoMei,
      alertas,
      pendingQuestions: QUESTOES,
      legalBasis: [FUNDAMENTO_BASE],
      aviso: AVISO,
    };
  }

  // O custo soma um item de cada tipo: dois CNAEs do mesmo item não pagam duas taxas.
  const itensUnicos = new Map<string, PcprItemIncidente>();
  for (const inc of incidencias) if (!itensUnicos.has(inc.item)) itensUnicos.set(inc.item, inc);

  let custoAnual = 0;
  let custoVistorias = 0;
  for (const inc of itensUnicos.values()) {
    if (inc.valor2026 !== null) custoAnual += inc.valor2026;
    if (inc.vistoriaPrevia) custoVistorias += inc.grupo === 2 ? VISTORIA_G2 : VISTORIA_G3;
  }
  custoAnual = Math.round(custoAnual * 100) / 100;
  custoVistorias = Math.round(custoVistorias * 100) / 100;

  alertas.push(
    'O cadastro na Polícia Civil deve ser feito ANTES de iniciar as atividades (art. 3º, §1º). Exercer atividade do Anexo sem a licença sujeita a multa de 100% da taxa devida.'
  );

  if (isentoMei) {
    alertas.push(
      'Como MEI, você é isento do pagamento da taxa (art. 5º, II) — mas a isenção NÃO dispensa a licença nem a vistoria (art. 6º, parágrafo único). A obrigação permanece integralmente; o que cai é só o valor.'
    );
  }

  if (itensUnicos.has('3.31')) {
    alertas.push(
      'O item 3.31 (resíduos e sucatas metálicas) é novo: foi criado pela Lei nº 22.754/2025 e passou a produzir efeitos em 3 de fevereiro de 2026. Quem já atuava no ramo antes disso também passou a precisar da licença.'
    );
  }

  if (itensUnicos.has('3.12')) {
    alertas.push('No item 3.12, a taxa é cobrada por sala de cinema, e não por estabelecimento.');
  }

  const anual = [...itensUnicos.values()].filter((i) => i.periodicidade === 'Anual').length;
  if (anual > 0) {
    alertas.push(
      'A licença anual é renovada entre 1º e 31 de janeiro de cada exercício (art. 9º, §1º).'
    );
  }

  const plural = itensUnicos.size > 1;

  return {
    sinal: 'PROVAVEL',
    headline: plural
      ? 'Esta empresa se enquadra em mais de um item do Anexo Único'
      : 'Esta atividade exige licença da Polícia Civil',
    procedure: `A atividade corresponde a item do Anexo Único da Lei nº 20.936/2021, que sujeita o negócio ao poder de polícia administrativa da Polícia Civil. Identificado o item, a própria lei define o documento, a alíquota sobre a UPFPR e a periodicidade. Os valores abaixo usam a UPFPR de ${ANO}, de R$ ${UPFPR.toFixed(2).replace('.', ',')}.`,
    incidencias,
    semCorrespondencia,
    custoAnual,
    custoVistorias,
    isentoMei,
    alertas,
    pendingQuestions: QUESTOES,
    legalBasis: [
      FUNDAMENTO_BASE,
      `Tabela de Taxas FUNESP — D.E.A.M., exercício ${ANO} (UPFPR R$ ${UPFPR.toFixed(2).replace('.', ',')})`,
    ],
    aviso: AVISO,
  };
}
