'use client';

/**
 * @fileOverview PAINEL DE LICENCIAMENTO DO CORPO DE BOMBEIROS MILITAR DO PARANÁ.
 * Portaria do Comando-Geral nº 476/2025.
 *
 * Apresenta duas camadas: a triagem imediata do CNAE nos anexos da Portaria e,
 * em seguida, o veredito definitivo obtido pelas respostas de autodeclaração.
 */

import { useEffect, useRef, useState } from 'react';
import { Flame, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, ShieldAlert, ClipboardCheck, Pencil } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { analyzeBombeiros } from '@/lib/bombeiros-analysis';
import type { Cnae, BombeirosResult } from '@/lib/types';

type PanelTheme = {
  text: string;
  bg: string;
  border: string;
  borderTop: string;
  icon: any;
};

const PANEL_THEMES: Record<string, PanelTheme> = {
  BAIXO: {
    text: 'text-risk-baixo',
    bg: 'bg-risk-baixo/10',
    border: 'border-risk-baixo/25',
    borderTop: 'border-risk-baixo',
    icon: CheckCircle2,
  },
  MEDIO: {
    text: 'text-risk-medio',
    bg: 'bg-risk-medio/10',
    border: 'border-risk-medio/25',
    borderTop: 'border-risk-medio',
    icon: AlertCircle,
  },
  ALTO: {
    text: 'text-risk-alto',
    bg: 'bg-risk-alto/10',
    border: 'border-risk-alto/25',
    borderTop: 'border-risk-alto',
    icon: AlertTriangle,
  },
  PENDENTE: {
    text: 'text-primary',
    bg: 'bg-secondary/60',
    border: 'border-border',
    borderTop: 'border-primary',
    icon: HelpCircle,
  },
  'NÃO APLICÁVEL': {
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
    borderTop: 'border-border',
    icon: HelpCircle,
  },
};

const ANEXO_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: 'text-risk-baixo', bg: 'bg-risk-baixo/10', border: 'border-risk-baixo/25' },
  B: { text: 'text-risk-alto', bg: 'bg-risk-alto/10', border: 'border-risk-alto/25' },
  NENHUM: { text: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border' },
};

/**
 * Agrupa as atividades por anexo. Com vários CNAEs no mesmo enquadramento, repetir o
 * texto explicativo em cada linha inflava a coluna sem acrescentar informação — aqui ele
 * aparece uma única vez por grupo. Os grupos saem na ordem de impacto sobre o resultado:
 * Anexo B decide o alto risco, "não listado" impede o baixo, Anexo A é o permissivo.
 */
function agruparPorAnexo(triagem: BombeirosResult['triagem']) {
  const ordem: Array<'B' | 'NENHUM' | 'A'> = ['B', 'NENHUM', 'A'];

  return ordem
    .map((chave) => {
      const itens = triagem.filter((t) => (t.anexo ?? 'NENHUM') === chave);
      if (itens.length === 0) return null;
      return { chave, itens, label: itens[0].label, detail: itens[0].detail };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);
}

/** Rótulo grande e inequívoco do veredito — é a resposta que o usuário veio buscar. */
function vereditoLabel(result: BombeirosResult): string {
  if (result.level === 'PENDENTE') return 'Depende das características do local';
  if (result.level === 'NÃO APLICÁVEL') return 'Não foi possível classificar';
  return result.requiresLicense ? 'Precisa da licença' : 'Não precisa da licença';
}

export function BombeirosPanel({
  cnaes,
  answers,
  onAnswer,
}: {
  cnaes: Cnae[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
}) {
  const result = analyzeBombeiros(cnaes, answers);
  const theme = PANEL_THEMES[result.level] || PANEL_THEMES['NÃO APLICÁVEL'];
  const VereditoIcon = theme.icon;

  const topoRef = useRef<HTMLDivElement>(null);
  const [revisando, setRevisando] = useState(false);
  // Pergunta reaberta para edição. Respondidas ficam recolhidas em uma linha, para que
  // a tela dê lugar às que ainda faltam — o primeiro bloco, com sete opções, é o que
  // mais ocupa espaço depois de respondido.
  const [editando, setEditando] = useState<string | null>(null);

  const totalPerguntas = result.pendingQuestions.length;
  const respondidas = result.pendingQuestions.filter((q) => !!answers[q.id]).length;
  // Concluído = havia questionário e a análise já chegou a um veredito definitivo.
  const concluido = totalPerguntas > 0 && result.level !== 'PENDENTE';

  // Ao fechar o questionário, devolve o usuário ao veredito no topo do painel —
  // sem isso ele fica olhando para o espaço vazio deixado pelas perguntas ocultas.
  useEffect(() => {
    if (!concluido) return;
    setRevisando(false);
    topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [concluido]);

  const mostrarPerguntas = totalPerguntas > 0 && (!concluido || revisando);

  return (
    <div
      ref={topoRef}
      className={`bg-card rounded-md border border-border border-t-2 ${theme.borderTop} overflow-hidden shadow-refined-lg scroll-mt-6`}
    >
      {/* Cabeçalho — veredito */}
      <div className={`${theme.bg} px-6 md:px-10 py-10 text-center border-b border-border space-y-4`}>
        <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card border ${theme.border} shadow-refined`}>
          <Flame className={`w-[18px] h-[18px] ${theme.text}`} strokeWidth={2} />
          <span className={`text-[13px] md:text-sm font-bold uppercase tracking-[0.16em] ${theme.text}`}>
            Corpo de Bombeiros
          </span>
        </div>

        <h3 className={`font-display text-3xl md:text-4xl ${theme.text} tracking-tight`}>
          {vereditoLabel(result)}
        </h3>

        <div className="flex items-center justify-center gap-2.5 pt-1">
          <VereditoIcon className={`w-4 h-4 ${theme.text} shrink-0`} strokeWidth={1.75} />
          <p className="text-sm text-foreground/80 leading-snug max-w-xl">{result.headline}</p>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-10">
        <p className="text-sm md:text-base text-foreground/85 leading-relaxed">{result.procedure}</p>

        {/* Alerta do art. 8º, parágrafo único: dispensado da licença, mas não das medidas. */}
        {result.requiresLicense === false && result.requiresFireSafetyMeasures === true && (
          <div className="p-6 bg-risk-medio/10 border border-risk-medio/25 rounded-md">
            <div className="flex items-start gap-4">
              <div className="p-2 border border-risk-medio/30 rounded-full shrink-0">
                <ShieldAlert className="w-4 h-4 text-risk-medio" strokeWidth={1.75} />
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="eyebrow text-risk-medio">A dispensa não alcança as medidas de prevenção</p>
                <p className="text-sm text-foreground/90 leading-snug">
                  Por se enquadrar no art. 3º, VII, o estabelecimento fica dispensado do licenciamento,
                  mas permanece obrigado a implementar e manter as medidas de prevenção e combate a
                  incêndio e a desastres (art. 8º, parágrafo único).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Triagem por CNAE */}
        {result.triagem.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h4 className="eyebrow whitespace-nowrap text-muted-foreground">Enquadramento nos anexos</h4>
              <div className="rule-hairline flex-1" />
            </div>
            <div className="divide-y divide-border border-t border-border">
              {agruparPorAnexo(result.triagem).map((grupo) => {
                const style = ANEXO_STYLES[grupo.chave];
                return (
                  <div key={grupo.chave} className="py-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-block px-3 py-1.5 rounded-sm border text-[10px] font-medium uppercase tracking-wider ${style.text} ${style.bg} ${style.border}`}
                      >
                        {grupo.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {grupo.itens.length} {grupo.itens.length === 1 ? 'atividade' : 'atividades'}
                      </span>
                    </div>

                    <ul className="space-y-1.5">
                      {grupo.itens.map((item, idx) => (
                        <li key={`${item.code}-${idx}`} className="flex items-baseline gap-2.5">
                          <code className="text-[11px] font-medium text-primary shrink-0">{item.code}</code>
                          <span className="text-[13px] text-foreground/85 leading-snug">
                            {item.description}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <p className="text-[12px] text-muted-foreground leading-relaxed">{grupo.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Questionário concluído — perguntas recolhidas, com opção de revisar. */}
        {concluido && !revisando && (
          <div className="p-6 rounded-md border border-risk-baixo/25 bg-risk-baixo/10 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 border border-risk-baixo/30 rounded-full shrink-0">
                <ClipboardCheck className="w-4 h-4 text-risk-baixo" strokeWidth={1.75} />
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="eyebrow text-risk-baixo">Questionário respondido</p>
                <p className="text-sm text-foreground/90 leading-snug">
                  As {totalPerguntas} perguntas sobre o estabelecimento foram respondidas. O
                  resultado acima já considera as suas declarações.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRevisando(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-5 rounded-sm border border-border bg-card text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Revisar respostas
            </button>
          </div>
        )}

        {/* Autodeclaração */}
        {mostrarPerguntas && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h4 className="eyebrow whitespace-nowrap text-muted-foreground">
                Características do estabelecimento
              </h4>
              <div className="rule-hairline flex-1" />
              <span className="eyebrow text-muted-foreground whitespace-nowrap shrink-0">
                {respondidas} de {totalPerguntas}
              </span>
            </div>

            <p className="text-[13px] text-muted-foreground leading-relaxed">
              A classificação se dá com base nas informações declaradas pelo responsável, cuja
              veracidade pode ser verificada a qualquer tempo pelo CBMPR (art. 16).
            </p>

            <div className="space-y-3">
              {result.pendingQuestions.map((q) => {
                const respondida = !!answers[q.id];
                const recolhida = respondida && editando !== q.id;

                if (recolhida) {
                  const escolhida = q.options.find((o) => o.value === answers[q.id]);
                  return (
                    <div
                      key={q.id}
                      className="flex items-start justify-between gap-3 p-4 rounded-sm border border-border bg-secondary/30"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-risk-baixo shrink-0 mt-0.5" strokeWidth={2} />
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {q.shortLabel}
                          </p>
                          <p className="text-[13px] text-foreground/90 leading-snug">
                            {escolhida?.label ?? answers[q.id]}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditando(q.id)}
                        className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                      >
                        Alterar
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={q.id}
                    className="p-6 rounded-sm border border-primary/25 bg-secondary/60 space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-foreground/90 leading-snug font-medium flex-1">
                          {q.question}
                        </p>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0 pt-0.5">
                          {q.base}
                        </span>
                      </div>
                      {q.help && (
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{q.help}</p>
                      )}
                    </div>

                    <RadioGroup
                      value={answers[q.id] || ''}
                      onValueChange={(v) => {
                        onAnswer(q.id, v);
                        setEditando(null); // recolhe assim que a resposta é dada
                      }}
                      className="space-y-2.5"
                    >
                      {q.options.map((opt) => (
                        <div key={opt.value} className="flex items-start space-x-3">
                          <RadioGroupItem
                            value={opt.value}
                            id={`${q.id}-${opt.value}`}
                            className="h-4 w-4 border-primary mt-0.5 shrink-0"
                          />
                          <Label
                            htmlFor={`${q.id}-${opt.value}`}
                            className="text-foreground text-sm cursor-pointer leading-snug font-normal"
                          >
                            {opt.label}
                            {opt.hint && (
                              <span className="block text-[12px] text-muted-foreground mt-1 leading-relaxed">
                                {opt.hint}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                );
              })}
            </div>

            {/* Só aparece na revisão: fecha o questionário e volta ao veredito. */}
            {concluido && revisando && (
              <button
                type="button"
                onClick={() => {
                  setRevisando(false);
                  topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-sm border border-primary/40 bg-primary/5 text-[11px] uppercase tracking-[0.12em] text-primary hover:bg-primary/10 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Concluir e ver o resultado
              </button>
            )}
          </div>
        )}

        {/* Fundamentação do resultado */}
        {result.reasons.length > 0 && (
          <div className="p-6 bg-secondary/60 border border-border rounded-md">
            <div className="flex items-start gap-4">
              <div className="p-2 border border-border rounded-full shrink-0">
                <HelpCircle className="w-4 h-4 text-primary" strokeWidth={1.75} />
              </div>
              <div className="space-y-2 flex-1">
                <p className="eyebrow text-muted-foreground">Por que este enquadramento</p>
                <ul className="space-y-2">
                  {result.reasons.map((reason, i) => (
                    <li key={i} className="text-sm text-foreground/90 leading-snug flex gap-2">
                      <span className="text-primary shrink-0">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Fundamento: {result.legalBasis.join(' · ')}.
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Esta análise abrange a trilha de <strong className="font-medium">empresas e estabelecimentos</strong>.
            A edificação possui classificação própria (art. 6º a 12), e o licenciamento da empresa
            fica vinculado ao da edificação, exigindo que o risco da empresa seja igual ou inferior
            ao do imóvel (art. 18). O licenciamento da empresa tem validade de 1 ano (art. 19).
          </p>
        </div>
      </div>
    </div>
  );
}
