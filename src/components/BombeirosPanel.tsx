'use client';

/**
 * @fileOverview PAINEL DE LICENCIAMENTO DO CORPO DE BOMBEIROS MILITAR DO PARANÁ.
 * Portaria do Comando-Geral nº 476/2025.
 *
 * Apresenta duas camadas: a triagem imediata do CNAE nos anexos da Portaria e,
 * em seguida, o veredito definitivo obtido pelas respostas de autodeclaração.
 */

import { Flame, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, ShieldAlert } from 'lucide-react';
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

  return (
    <div className={`bg-card rounded-md border border-border border-t-2 ${theme.borderTop} overflow-hidden shadow-refined-lg`}>
      {/* Cabeçalho — veredito */}
      <div className={`${theme.bg} px-6 md:px-10 py-10 text-center border-b border-border space-y-4`}>
        <div className="flex items-center justify-center gap-2.5">
          <Flame className={`w-4 h-4 ${theme.text}`} strokeWidth={1.75} />
          <p className={`eyebrow ${theme.text}`}>Corpo de Bombeiros Militar do Paraná</p>
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
              {result.triagem.map((item, idx) => {
                const style = ANEXO_STYLES[item.anexo ?? 'NENHUM'];
                return (
                  <div key={`${item.code}-${idx}`} className="py-5 space-y-2.5">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <code className="text-[11px] font-medium text-primary bg-secondary px-2.5 py-1 rounded-sm">
                          {item.code}
                        </code>
                        <p className="text-sm text-foreground/90 leading-snug">{item.description}</p>
                      </div>
                      <div className="shrink-0">
                        <span
                          className={`inline-block px-3 py-1.5 rounded-sm border text-[10px] font-medium uppercase tracking-wider ${style.text} ${style.bg} ${style.border}`}
                        >
                          {item.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Autodeclaração */}
        {result.pendingQuestions.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h4 className="eyebrow whitespace-nowrap text-muted-foreground">
                Características do estabelecimento
              </h4>
              <div className="rule-hairline flex-1" />
            </div>

            <p className="text-[13px] text-muted-foreground leading-relaxed">
              A classificação se dá com base nas informações declaradas pelo responsável, cuja
              veracidade pode ser verificada a qualquer tempo pelo CBMPR (art. 16).
            </p>

            <div className="space-y-4">
              {result.pendingQuestions.map((q) => {
                const respondida = !!answers[q.id];
                return (
                  <div
                    key={q.id}
                    className={`p-6 rounded-sm border space-y-4 transition-colors ${
                      respondida ? 'bg-secondary/40 border-border' : 'bg-secondary/60 border-primary/25'
                    }`}
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
                      onValueChange={(v) => onAnswer(q.id, v)}
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
