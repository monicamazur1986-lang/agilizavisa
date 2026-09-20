'use client';

/**
 * @fileOverview PAINEL DE ORIENTAÇÃO DO LICENCIAMENTO AMBIENTAL — PARANÁ.
 *
 * Deliberadamente diferente dos outros três painéis: eles abrem com um veredito
 * ("precisa" / "não precisa"), porque a norma que aplicam é indexada por CNAE e
 * permite afirmar isso. Aqui não há veredito para dar — o cabeçalho traz um sinal de
 * orientação, e a ressalva de que a confirmação é do órgão aparece antes de qualquer
 * outra coisa, não no rodapé.
 */

import { Leaf, AlertCircle, HelpCircle, Info, ClipboardList, Building2, CheckCircle2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { analyzeAmbiental } from '@/lib/ambiental-analysis';
import type { Cnae, AmbientalResult } from '@/lib/types';

const SINAL_THEMES: Record<string, { text: string; bg: string; border: string; borderTop: string; icon: any }> = {
  PROVAVEL: {
    text: 'text-risk-baixo',
    bg: 'bg-risk-baixo/10',
    border: 'border-risk-baixo/25',
    borderTop: 'border-risk-baixo',
    icon: AlertCircle,
  },
  'NÃO LISTADO': {
    text: 'text-muted-foreground',
    bg: 'bg-secondary/60',
    border: 'border-border',
    borderTop: 'border-border',
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

const ORGAO_LABEL: Record<string, string> = {
  ESTADUAL: 'Provavelmente estadual (IAT)',
  MUNICIPAL_OU_ESTADUAL: 'Possivelmente municipal',
  INDEFINIDO: 'A definir',
};

export function AmbientalPanel({
  cnaes,
  answers,
  onAnswer,
}: {
  cnaes: Cnae[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
}) {
  const result: AmbientalResult = analyzeAmbiental(cnaes, answers);
  const theme = SINAL_THEMES[result.sinal] || SINAL_THEMES['NÃO APLICÁVEL'];
  const SinalIcon = theme.icon;

  return (
    <div
      className={`bg-card rounded-md border border-border border-t-2 ${theme.borderTop} overflow-hidden shadow-refined-lg scroll-mt-6`}
    >
      {/* Cabeçalho — sinal, não veredito. */}
      <div className={`${theme.bg} px-6 md:px-10 py-10 text-center border-b border-border space-y-4`}>
        <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card border ${theme.border} shadow-refined`}>
          <Leaf className={`w-[18px] h-[18px] ${theme.text}`} strokeWidth={2} />
          <span className={`text-[13px] md:text-sm font-bold uppercase tracking-[0.16em] ${theme.text}`}>
            Licenciamento Ambiental
          </span>
        </div>

        <h3 className={`font-display text-2xl md:text-3xl ${theme.text} tracking-tight max-w-2xl mx-auto`}>
          {result.headline}
        </h3>

        <div className="flex items-center justify-center gap-2.5 pt-1">
          <SinalIcon className={`w-4 h-4 ${theme.text} shrink-0`} strokeWidth={1.75} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground/70">
            Orientação — não é veredito
          </span>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-10">
        {/* A ressalva vem antes de tudo, não no rodapé. */}
        <div className="p-6 bg-secondary/60 border border-border border-l-2 border-l-primary rounded-md">
          <div className="flex items-start gap-4">
            <div className="p-2 border border-border rounded-full shrink-0">
              <Info className="w-4 h-4 text-primary" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] text-foreground/85 leading-relaxed flex-1">{result.aviso}</p>
          </div>
        </div>

        <p className="text-sm md:text-base text-foreground/85 leading-relaxed">{result.procedure}</p>

        {/* Tipologias atingidas */}
        {result.tipologias.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h4 className="eyebrow whitespace-nowrap text-muted-foreground">Por que esta atividade aparece aqui</h4>
              <div className="rule-hairline flex-1" />
            </div>

            <div className="space-y-4">
              {result.tipologias.map((item, idx) => (
                <div key={`${item.code}-${idx}`} className="p-6 rounded-md border border-risk-baixo/25 bg-risk-baixo/[0.06] space-y-2.5">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <code className="text-[11px] font-medium text-primary bg-card px-2.5 py-1 rounded-sm shrink-0">
                      {item.code}
                    </code>
                    <span className="text-sm text-foreground/90 leading-snug">{item.description}</span>
                  </div>
                  <p className="text-[13px] text-foreground/85 leading-snug">
                    <span className="font-medium">Tipologia ambiental:</span> {item.tipologia}
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{item.motivo}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.origem}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.semCorrespondencia.length > 0 && result.tipologias.length > 0 && (
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            As demais atividades do CNPJ ({result.semCorrespondencia.map((c) => c.code).join(', ')}) não
            constam da nossa curadoria — o que não significa que estejam dispensadas.
          </p>
        )}

        {/* Triagem: as perguntas correspondem aos três critérios da norma. */}
        {result.pendingQuestions.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h4 className="eyebrow whitespace-nowrap text-muted-foreground">Três perguntas de triagem</h4>
              <div className="rule-hairline flex-1" />
            </div>

            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Elas espelham os três critérios que a norma conjuga — potencial poluidor, porte e
              localização. As respostas não classificam a empresa: montam a lista do que levar e
              indicam o órgão provável.
            </p>

            <div className="space-y-3">
              {result.pendingQuestions.map((q) => (
                <div key={q.id} className="p-6 rounded-sm border border-border bg-secondary/40 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-foreground/90 leading-snug font-medium flex-1">{q.question}</p>
                      {answers[q.id] && (
                        <CheckCircle2 className="w-4 h-4 text-risk-baixo shrink-0 mt-0.5" strokeWidth={2} />
                      )}
                    </div>
                    {q.help && <p className="text-[13px] text-muted-foreground leading-relaxed">{q.help}</p>}
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
                          id={`amb-${q.id}-${opt.value}`}
                          className="h-4 w-4 border-primary mt-0.5 shrink-0"
                        />
                        <Label
                          htmlFor={`amb-${q.id}-${opt.value}`}
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

                  <p className="text-[11px] text-muted-foreground">{q.base}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Órgão provável */}
        {result.orgaoTexto && (
          <div className="p-6 bg-card border border-border border-l-2 border-l-risk-baixo rounded-md space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow text-risk-baixo flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" strokeWidth={1.75} /> A qual órgão recorrer
              </p>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {ORGAO_LABEL[result.orgao]}
              </span>
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">{result.orgaoTexto}</p>
            <a
              href="https://www.iat.pr.gov.br/Pagina/Licenciamento-de-atividades-especificas"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[12px] font-semibold text-primary uppercase tracking-wider hover:underline underline-offset-4"
            >
              IAT · tipologias e formulários
            </a>
          </div>
        )}

        {/* Checklist */}
        {result.checklist.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h4 className="eyebrow whitespace-nowrap text-muted-foreground flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.75} /> O que o órgão vai pedir
              </h4>
              <div className="rule-hairline flex-1" />
            </div>
            <ul className="space-y-2.5">
              {result.checklist.map((item, i) => (
                <li key={i} className="text-sm text-foreground/90 leading-snug flex gap-2.5">
                  <span className="text-risk-baixo shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-6 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Fundamento: {result.legalBasis.join(' · ')}.
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            A correspondência entre o código da atividade e a tipologia ambiental é curadoria do
            portal, não consta de anexo legal — a norma ambiental do Paraná não classifica por CNAE.
          </p>
        </div>
      </div>
    </div>
  );
}
