'use client';

/**
 * @fileOverview PAINEL DA LICENÇA DA POLÍCIA CIVIL — PARANÁ.
 *
 * É o único painel do portal que informa CUSTO. Isso é possível porque, uma vez
 * identificado o item do Anexo Único, a lei fixa a alíquota sobre a UPFPR, a
 * periodicidade e a vistoria. O ano da UPFPR aparece junto de cada valor, de propósito:
 * a unidade é atualizada todo exercício, e um número sem ano envelhece mal.
 */

import { BadgeCheck, AlertCircle, HelpCircle, Info, Receipt, CheckCircle2, TriangleAlert } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { analyzePcpr } from '@/lib/pcpr-analysis';
import type { Cnae, PcprResult } from '@/lib/types';

const SINAL_THEMES: Record<string, { text: string; bg: string; border: string; borderTop: string; icon: any }> = {
  PROVAVEL: {
    text: 'text-primary',
    bg: 'bg-primary/[0.07]',
    border: 'border-primary/25',
    borderTop: 'border-primary',
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

function reais(v: number): string {
  return v.toFixed(2).replace('.', ',');
}

export function PcprPanel({
  cnaes,
  answers,
  onAnswer,
}: {
  cnaes: Cnae[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
}) {
  const result: PcprResult = analyzePcpr(cnaes, answers);
  const theme = SINAL_THEMES[result.sinal] || SINAL_THEMES['NÃO APLICÁVEL'];
  const SinalIcon = theme.icon;

  return (
    <div
      className={`bg-card rounded-md border border-border border-t-2 ${theme.borderTop} overflow-hidden shadow-refined-lg scroll-mt-6`}
    >
      <div className={`${theme.bg} px-6 md:px-10 py-10 text-center border-b border-border space-y-4`}>
        <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card border ${theme.border} shadow-refined`}>
          <BadgeCheck className={`w-[18px] h-[18px] ${theme.text}`} strokeWidth={2} />
          <span className={`text-[13px] md:text-sm font-bold uppercase tracking-[0.16em] ${theme.text}`}>
            Polícia Civil
          </span>
        </div>

        <h3 className={`font-display text-2xl md:text-3xl ${theme.text} tracking-tight max-w-2xl mx-auto`}>
          {result.headline}
        </h3>

        <div className="flex items-center justify-center gap-2.5 pt-1">
          <SinalIcon className={`w-4 h-4 ${theme.text} shrink-0`} strokeWidth={1.75} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground/70">
            Anexo Único da Lei nº 20.936/2021
          </span>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-10">
        <div className="p-6 bg-secondary/60 border border-border border-l-2 border-l-primary rounded-md">
          <div className="flex items-start gap-4">
            <div className="p-2 border border-border rounded-full shrink-0">
              <Info className="w-4 h-4 text-primary" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] text-foreground/85 leading-relaxed flex-1">{result.aviso}</p>
          </div>
        </div>

        <p className="text-sm md:text-base text-foreground/85 leading-relaxed">{result.procedure}</p>

        {/* Itens do Anexo atingidos */}
        {result.incidencias.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h4 className="eyebrow whitespace-nowrap text-muted-foreground">Itens do Anexo Único</h4>
              <div className="rule-hairline flex-1" />
            </div>

            <div className="space-y-4">
              {result.incidencias.map((inc, idx) => (
                <div key={`${inc.item}-${inc.code}-${idx}`} className="p-6 rounded-md border border-primary/25 bg-primary/[0.04] space-y-3">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-primary-foreground bg-primary px-2.5 py-1 rounded-sm shrink-0">
                      Item {inc.item}
                    </span>
                    {inc.code ? (
                      <code className="text-[11px] font-medium text-primary bg-card px-2.5 py-1 rounded-sm shrink-0">
                        {inc.code}
                      </code>
                    ) : (
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        Pela sua declaração
                      </span>
                    )}
                    <span className="text-sm text-foreground/90 leading-snug">{inc.discriminacao}</span>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                    <span className="text-foreground/85">
                      <span className="text-muted-foreground">Documento:</span> {inc.documento}
                    </span>
                    <span className="text-foreground/85">
                      <span className="text-muted-foreground">Periodicidade:</span> {inc.periodicidade}
                    </span>
                    {inc.valor2026 !== null && (
                      <span className="text-foreground/85">
                        <span className="text-muted-foreground">Taxa:</span> {inc.aliquota}% da UPFPR —{' '}
                        <strong className="font-semibold">R$ {reais(inc.valor2026)}</strong>
                        {!inc.valorOficial && <span className="text-muted-foreground"> (calculado)</span>}
                      </span>
                    )}
                  </div>

                  {inc.vistoriaPrevia && (
                    <p className="text-[13px] text-foreground/85 leading-snug">
                      Exige vistoria prévia da Polícia Civil, cobrada à parte da taxa da atividade.
                    </p>
                  )}

                  <p className="text-[13px] text-muted-foreground leading-relaxed">{inc.motivo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custo — o que nenhuma outra frente do portal consegue informar. */}
        {result.custoAnual !== null && result.custoAnual > 0 && (
          <div className="p-6 bg-card border border-border border-l-2 border-l-primary rounded-md space-y-3">
            <p className="eyebrow text-primary flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5" strokeWidth={1.75} /> Quanto custa em 2026
            </p>

            {result.isentoMei ? (
              <div className="space-y-2">
                <p className="text-lg font-display text-foreground">
                  R$ 0,00 <span className="text-sm text-muted-foreground">— isento por ser MEI</span>
                </p>
                <p className="text-[13px] text-foreground/85 leading-relaxed">
                  Sem a isenção, a taxa anual seria de R$ {reais(result.custoAnual)}
                  {result.custoVistorias !== null && result.custoVistorias > 0
                    ? `, mais R$ ${reais(result.custoVistorias)} de vistoria`
                    : ''}
                  . A licença e a vistoria continuam obrigatórias.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-lg font-display text-foreground">
                  R$ {reais(result.custoAnual)} <span className="text-sm text-muted-foreground">por ano</span>
                </p>
                {result.custoVistorias !== null && result.custoVistorias > 0 && (
                  <p className="text-[13px] text-foreground/85">
                    Mais R$ {reais(result.custoVistorias)} de vistoria prévia, cobrada à parte.
                  </p>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Valores da UPFPR de 2026 (R$ 147,17). A unidade é atualizada a cada exercício, então
              confira o valor vigente no momento do pedido.
            </p>
          </div>
        )}

        {result.semCorrespondencia.length > 0 && result.incidencias.length > 0 && (
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            As demais atividades do CNPJ ({result.semCorrespondencia.map((c) => c.code).join(', ')}) não
            correspondem a item do Anexo na nossa curadoria.
          </p>
        )}

        {/* Triagem */}
        {result.pendingQuestions.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h4 className="eyebrow whitespace-nowrap text-muted-foreground">Duas perguntas</h4>
              <div className="rule-hairline flex-1" />
            </div>

            <div className="space-y-3">
              {result.pendingQuestions.map((q) => (
                <div key={q.id} className="p-6 rounded-sm border border-border bg-secondary/40 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-foreground/90 leading-snug font-medium flex-1">{q.question}</p>
                      {answers[q.id] && (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
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
                          id={`pcpr-${q.id}-${opt.value}`}
                          className="h-4 w-4 border-primary mt-0.5 shrink-0"
                        />
                        <Label
                          htmlFor={`pcpr-${q.id}-${opt.value}`}
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

        {/* Alertas — recolhidos por padrão, mesmo critério dos demais painéis: são
            observação complementar, não a próxima ação do usuário. */}
        {result.alertas.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="alertas" className="border border-border rounded-md bg-secondary/60 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="flex items-center gap-3 text-sm text-foreground/80">
                  <TriangleAlert className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                  Atenção ({result.alertas.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5">
                <ul className="space-y-3">
                  {result.alertas.map((a, i) => (
                    <li key={i} className="text-sm text-foreground/90 leading-relaxed flex gap-2.5">
                      <span className="text-primary shrink-0">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="pt-6 border-t border-border space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Fundamento: {result.legalBasis.join(' · ')}.
          </p>
          <a
            href="https://www.policiacivil.pr.gov.br/Pagina/Explosivos-Armas-e-Municoes"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-primary uppercase tracking-wider hover:underline underline-offset-4"
          >
            Polícia Civil · produtos controlados
          </a>
        </div>
      </div>
    </div>
  );
}
