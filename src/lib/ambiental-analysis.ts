'use client';

/**
 * @fileOverview MOTOR DE ORIENTAÇÃO DO LICENCIAMENTO AMBIENTAL — PARANÁ.
 * Lei Estadual nº 22.252/2024, Decreto Estadual nº 9.541/2025 e as tipologias
 * publicadas pelo Instituto Água e Terra.
 *
 * ESTE MÓDULO NÃO CLASSIFICA. As outras três frentes do portal leem um anexo legal
 * indexado por CNAE e devolvem o enquadramento que a norma determina. Aqui isso é
 * impossível: a norma ambiental não usa CNAE como chave — classifica por tipologia
 * descrita em texto e por porte em unidades físicas (m², litros por dia, cabeças,
 * megawatts), conjugados com potencial poluidor e sensibilidade da localização
 * (art. 5º, §1º do Decreto nº 9.541/2025). A matriz que conjuga os três critérios é
 * definida em normas por tipologia, editadas e revistas com frequência alta.
 *
 * Portanto, o que este motor faz é: (1) sinalizar que a atividade costuma exigir
 * licenciamento, a partir de uma curadoria explicitamente autoral; (2) montar a lista
 * do que o órgão vai pedir; (3) indicar a qual órgão ir. Em nenhuma hipótese afirma
 * grau de risco, enquadramento ou dispensa.
 */

import ambientalDataRaw from './ambiental-cnae.json';
import type {
  Cnae,
  AmbientalOrgao,
  AmbientalQuestion,
  AmbientalResult,
  AmbientalTipologiaItem,
} from './types';

const ambientalData = Object.freeze(ambientalDataRaw as any);

interface AtividadeCurada {
  tipologia: string;
  origem: string;
  motivo: string;
  cnaes: string[];
}

function normalizeCnae(code: string): string {
  if (!code) return '';
  return String(code).replace(/\D/g, '').padStart(7, '0');
}

/** Índice CNAE → tipologia, montado uma vez a partir da curadoria. */
const POR_CNAE: ReadonlyMap<string, AtividadeCurada> = (() => {
  const mapa = new Map<string, AtividadeCurada>();
  for (const atividade of (ambientalData?.atividades ?? []) as AtividadeCurada[]) {
    for (const code of atividade.cnaes) mapa.set(normalizeCnae(code), atividade);
  }
  return mapa;
})();

const FUNDAMENTO_BASE = 'Lei Estadual nº 22.252/2024 · Decreto Estadual nº 9.541/2025';

const AVISO =
  'Esta frente é orientativa. A norma ambiental não classifica atividades por CNAE, então o portal não tem como afirmar se a sua empresa precisa de licença ambiental, nem qual. O que está abaixo indica que a atividade costuma exigir licenciamento e reúne o que o órgão costuma pedir — a confirmação é sempre do órgão ambiental competente.';

export const Q_LOCALIZACAO: AmbientalQuestion = {
  id: 'localizacao',
  shortLabel: 'Localização do imóvel',
  question:
    'O imóvel fica em área de preservação permanente, reserva legal, área de manancial, unidade de conservação ou área cárstica?',
  help: 'Essas ressalvas de localização aparecem em praticamente todas as tipologias e costumam afastar o rito simplificado, levando o caso ao órgão estadual.',
  base: 'Critério de localização — art. 5º, §1º do Decreto nº 9.541/2025',
  options: [
    { value: 'nao', label: 'Não, é área urbana comum' },
    { value: 'sim', label: 'Sim, ao menos uma dessas situações' },
    { value: 'naosei', label: 'Não sei dizer', hint: 'A prefeitura informa pelo endereço; é a resposta mais comum nesta etapa.' },
  ],
};

export const Q_RESIDUO: AmbientalQuestion = {
  id: 'residuo',
  shortLabel: 'Efluentes e resíduos',
  question:
    'A atividade gera efluente líquido industrial ou resíduo perigoso (Classe I), como óleo usado, solvente, produto químico ou resíduo de serviço de saúde?',
  help: 'Não conta o esgoto doméstico comum, ligado à rede. Conta o que sai do processo da atividade.',
  base: 'Critério de potencial poluidor — art. 5º, §1º do Decreto nº 9.541/2025',
  options: [
    { value: 'nao', label: 'Não gera' },
    { value: 'sim', label: 'Sim, gera' },
    { value: 'naosei', label: 'Não sei dizer' },
  ],
};

export const Q_PORTE: AmbientalQuestion = {
  id: 'porte',
  shortLabel: 'Porte do estabelecimento',
  question: 'Quantas pessoas trabalham no local?',
  help: 'O porte na norma ambiental é medido por tipologia, em unidades próprias. O número de funcionários é apenas um indicativo inicial: é o limite que várias tipologias usam para separar o menor porte.',
  base: 'Critério de porte — art. 5º, §1º do Decreto nº 9.541/2025',
  options: [
    { value: 'ate10', label: 'Até 10 pessoas' },
    { value: 'mais10', label: 'Mais de 10 pessoas' },
  ],
};

const QUESTOES: AmbientalQuestion[] = [Q_LOCALIZACAO, Q_RESIDUO, Q_PORTE];

/** Itens que o órgão pede em qualquer tipologia. */
const CHECKLIST_BASE = [
  'Descrição da atividade e do processo produtivo, com a capacidade instalada.',
  'Endereço completo e localização do imóvel (coordenadas ou matrícula).',
  'Certidão do município sobre uso e ocupação do solo para aquela atividade no endereço.',
];

/**
 * Cruza os CNAEs da empresa com a curadoria e monta a orientação.
 * `answers` traz as respostas das três perguntas de triagem, por id.
 */
export function analyzeAmbiental(
  cnaes: Cnae[],
  answers: Record<string, string>
): AmbientalResult {
  const respostas = answers || {};
  const lista = Array.isArray(cnaes) ? cnaes : [];

  const tipologias: AmbientalTipologiaItem[] = [];
  const semCorrespondencia: { code: string; description: string }[] = [];

  for (const c of lista) {
    const curada = POR_CNAE.get(normalizeCnae(c.code));
    if (curada) {
      tipologias.push({
        code: c.code,
        description: c.description,
        tipologia: curada.tipologia,
        origem: curada.origem,
        motivo: curada.motivo,
      });
    } else {
      semCorrespondencia.push({ code: c.code, description: c.description });
    }
  }

  if (lista.length === 0) {
    return {
      sinal: 'NÃO APLICÁVEL',
      headline: 'Nenhuma atividade econômica identificada',
      procedure:
        'Sem CNAE informado não é possível sinalizar incidência de licenciamento ambiental. Consulte o órgão ambiental do seu município ou o Instituto Água e Terra.',
      tipologias: [],
      semCorrespondencia: [],
      checklist: [],
      orgao: 'INDEFINIDO',
      orgaoTexto: '',
      pendingQuestions: [],
      legalBasis: [FUNDAMENTO_BASE],
      aviso: AVISO,
    };
  }

  const localizacao = respostas[Q_LOCALIZACAO.id];
  const residuo = respostas[Q_RESIDUO.id];
  const porte = respostas[Q_PORTE.id];

  // A competência nunca é afirmada: no máximo se indica a mais provável, e só quando
  // as respostas permitem. "Não sei" mantém o caso em aberto, de propósito.
  let orgao: AmbientalOrgao = 'INDEFINIDO';
  let orgaoTexto =
    'Responda às perguntas abaixo para saber a qual órgão o pedido provavelmente será dirigido.';

  if (localizacao === 'sim' || residuo === 'sim') {
    orgao = 'ESTADUAL';
    orgaoTexto =
      localizacao === 'sim'
        ? 'A localização em área ambientalmente sensível costuma atrair a competência do Instituto Água e Terra, ainda que a atividade fosse, em tese, de impacto local.'
        : 'A geração de efluente industrial ou de resíduo perigoso costuma atrair a competência do Instituto Água e Terra.';
  } else if (localizacao === 'nao' && residuo === 'nao' && porte) {
    orgao = 'MUNICIPAL_OU_ESTADUAL';
    orgaoTexto =
      porte === 'ate10'
        ? 'Sem ressalva de localização e sem resíduo perigoso, a atividade tende a ser tratada como de impacto local — o que permite o licenciamento pelo próprio município, quando ele for habilitado para isso. Se não for, o pedido vai ao Instituto Água e Terra.'
        : 'Sem ressalva de localização e sem resíduo perigoso, a atividade pode ser de impacto local, mas o porte acima do menor patamar costuma exigir verificação caso a caso — confirme com o órgão ambiental do município e, se ele não for habilitado, com o Instituto Água e Terra.';
  }

  const checklist = [...CHECKLIST_BASE];
  if (residuo === 'sim') {
    checklist.push(
      'Plano de gerenciamento de resíduos sólidos, com a destinação de cada resíduo perigoso gerado.'
    );
    checklist.push('Comprovação do destino final dado aos resíduos, por empresa licenciada.');
  }
  if (residuo === 'naosei') {
    checklist.push(
      'Levantamento dos resíduos e efluentes gerados pelo processo — é a primeira informação que o órgão vai pedir.'
    );
  }
  if (localizacao === 'sim') {
    checklist.push(
      'Manifestação sobre a área sensível (preservação permanente, reserva legal, manancial, unidade de conservação ou área cárstica) e, se houver supressão de vegetação, autorização florestal.'
    );
  }
  if (localizacao === 'naosei') {
    checklist.push(
      'Consulta prévia à prefeitura sobre restrições ambientais do endereço — resolve a dúvida antes de protocolar.'
    );
  }
  if (porte === 'mais10') {
    checklist.push('Dados de porte da tipologia (área construída, produção ou capacidade instalada).');
  }

  if (tipologias.length === 0) {
    return {
      sinal: 'NÃO LISTADO',
      headline: 'Não identificamos incidência pelo código da atividade',
      procedure:
        'Nenhuma das atividades deste CNPJ consta da nossa curadoria de tipologias ambientais. Isso NÃO significa dispensa: significa apenas que o código da atividade, sozinho, não permite sinalizar. Como o enquadramento ambiental depende de porte, localização e processo produtivo, a confirmação precisa vir do órgão ambiental.',
      tipologias: [],
      semCorrespondencia,
      checklist: CHECKLIST_BASE,
      orgao: 'INDEFINIDO',
      orgaoTexto:
        'Procure o órgão ambiental do município onde a empresa está instalada; se ele não for habilitado ao licenciamento, o pedido vai ao Instituto Água e Terra.',
      pendingQuestions: [],
      legalBasis: [FUNDAMENTO_BASE],
      aviso: AVISO,
    };
  }

  const plural = tipologias.length > 1;

  return {
    sinal: 'PROVAVEL',
    headline: plural
      ? 'Estas atividades costumam exigir licenciamento ambiental'
      : 'Esta atividade costuma exigir licenciamento ambiental',
    procedure:
      'A atividade corresponde a uma tipologia que os órgãos ambientais do Paraná licenciam. O ato aplicável — de uma declaração de dispensa a uma licença trifásica — depende da conjugação entre potencial poluidor, porte e localização, que só o órgão define. As perguntas abaixo não classificam a empresa: servem para montar o que você precisa levar e indicar a qual órgão ir.',
    tipologias,
    semCorrespondencia,
    checklist,
    orgao,
    orgaoTexto,
    pendingQuestions: QUESTOES,
    legalBasis: [FUNDAMENTO_BASE, 'Resolução CEMA nº 110/2021 (impacto local)'],
    aviso: AVISO,
  };
}
