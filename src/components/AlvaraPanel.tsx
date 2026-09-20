'use client';

/**
 * @fileOverview PAINEL DO ALVARÁ DE FUNCIONAMENTO — PARANÁ.
 * Decreto Estadual nº 11.063/2025, que atualiza o Anexo Único do Decreto
 * Estadual nº 3.434/2023.
 *
 * Diferente do Bombeiros — questionário pequeno e global —, aqui cada CNAE
 * carrega sua própria lista de condições, então o corpo do painel é uma lista
 * de blocos por CNAE, cada um com seu próprio checklist de autodeclaração.
 */

import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Circle,
  XCircle,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { analyzeAlvara, chaveCondicao } from '@/lib/alvara-analysis';
import type { Cnae, AlvaraTriagemItem } from '@/lib/types';

type PanelTheme = { text: string; bg: string; border: string; borderTop: string; icon: any };

const PANEL_THEMES: Record<string, PanelTheme> = {
  BAIXO: {
    text: 'text-risk-baixo',
    bg: 'bg-risk-baixo/10',
    border: 'border-risk-baixo/25',
    borderTop: 'border-risk-baixo',
    icon: CheckCircle2,
  },
  PADRAO: {
    text: 'text-risk-medio',
    bg: 'bg-risk-medio/10',
    border: 'border-risk-medio/25',
    borderTop: 'border-risk-medio',
    icon: AlertCircle,
  },
  'NÃO ENCONTRADO': {
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
    borderTop: 'border-border',
    icon: HelpCircle,
  },
};

type ItemStatus = 'ATENDE' | 'PENDENTE' | 'NAO_ATENDE' | 'FORA';

// "Atende" aqui é sobre UMA condição do Anexo Único (ex.: "não gera efluente industrial"),
// não sobre o veredito final — por isso o rótulo nunca usa a palavra "risco": o Alvará não
// classifica por risco, só decide se o rito é com ou sem vistoria prévia.
const STATUS_STYLES: Record<ItemStatus, { text: string; bg: string; border: string; label: string }> = {
  ATENDE: { text: 'text-risk-baixo', bg: 'bg-risk-baixo/10', border: 'border-risk-baixo/25', label: 'Condição atendida' },
  PENDENTE: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/25', label: 'Pendente' },
  NAO_ATENDE: { text: 'text-risk-medio', bg: 'bg-risk-medio/10', border: 'border-risk-medio/25', label: 'Condição não atendida' },
  FORA: { text: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border', label: 'Fora do Anexo' },
};

function statusDoItem(item: AlvaraTriagemItem): ItemStatus {
  if (!item.enquadrado) return 'FORA';
  if (item.atende) return 'ATENDE';
  if (item.pendente) return 'PENDENTE';
  return 'NAO_ATENDE';
}

export function AlvaraPanel({
  cnaes,
  answers,
  onAnswer,
}: {
  cnaes: Cnae[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
}) {
  const result = analyzeAlvara(cnaes, answers);
  const theme = PANEL_THEMES[result.level] || PANEL_THEMES['NÃO ENCONTRADO'];
  const VereditoIcon = theme.icon;

  // Condição reaberta para edição — depois de respondida, cada condição recolhe
  // em uma linha, para o checklist não crescer sem fim conforme o usuário avança.
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div
      className={`bg-card rounded-md border border-border border-t-2 ${theme.borderTop} overflow-hidden shadow-refined-lg scroll-mt-6`}
    >
      {/* Cabeçalho — veredito */}
      <div className={`${theme.bg} px-6 md:px-10 py-10 text-center border-b border-border space-y-4`}>
        <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card border ${theme.border} shadow-refined`}>
          <Building2 className={`w-[18px] h-[18px] ${theme.text}`} strokeWidth={2} />
          <span className={`text-[13px] md:text-sm font-bold uppercase tracking-[0.16em] ${theme.text}`}>
            Alvará de Funcionamento
          </span>
        </div>

        <h3 className={`font-display text-2xl md:text-3xl ${theme.text} tracking-tight max-w-2xl mx-auto`}>
          {result.headline}
        </h3>

        {/* A dúvida mais comum sobre esta frente: "processo padrão" não quer dizer que o
            alvará é dispensado. Por isso essa frase vem sempre, nos dois desfechos. */}
        {result.level !== 'NÃO ENCONTRADO' && (
          <div className="flex items-center justify-center gap-2.5 pt-1">
            <VereditoIcon className={`w-4 h-4 ${theme.text} shrink-0`} strokeWidth={1.75} />
            <p className="text-sm text-foreground/80 leading-snug max-w-xl">
              O alvará continua sendo obrigatório — muda só o rito de emissão.
            </p>
          </div>
        )}
      </div>

      <div className="p-6 md:p-10 space-y-10">
        <p className="text-sm md:text-base text-foreground/85 leading-relaxed">{result.procedure}</p>

        {/* Detalhamento por CNAE */}
        {result.triagem.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h4 className="eyebrow whitespace-nowrap text-muted-foreground">Enquadramento por CNAE</h4>
              <div className="rule-hairline flex-1" />
            </div>

            <div className="space-y-4">
              {result.triagem.map((item, idx) => {
                const status = statusDoItem(item);
                const style = STATUS_STYLES[status];

                return (
                  <div
                    key={`${item.code}-${idx}`}
                    className={`rounded-md border ${style.border} overflow-hidden`}
                  >
                    <div className={`${style.bg} p-5 flex items-start justify-between gap-4`}>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-baseline gap-2.5 flex-wrap">
                          <code className="text-[11px] font-medium text-primary bg-card px-2.5 py-1 rounded-sm shrink-0">
                            {item.code}
                          </code>
                          <span className="text-sm text-foreground/90 leading-snug">{item.description}</span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 px-3 py-1.5 rounded-sm border text-[10px] font-medium uppercase tracking-wider ${style.text} bg-card ${style.border}`}
                      >
                        {style.label}
                      </span>
                    </div>

                    {!item.enquadrado && (
                      <p className="px-5 py-4 text-[13px] text-muted-foreground leading-relaxed">
                        Atividade não consta do Anexo Único. Siga o processo padrão de alvará junto ao órgão
                        competente do seu município.
                      </p>
                    )}

                    {item.enquadrado && item.condicoes.length === 0 && (
                      <p className="px-5 py-4 text-[13px] text-foreground/85 leading-relaxed">
                        Enquadramento incondicional — nenhuma condição adicional exigida pelo Anexo Único para
                        esta atividade.
                      </p>
                    )}

                    {item.enquadrado && item.condicoes.length > 0 && (
                      <div className="p-5 space-y-3 border-t border-border">
                        {item.condicoes.map((cond, condIdx) => {
                          const key = chaveCondicao(item.code, condIdx);
                          const respondida = cond.atendida !== null;
                          const recolhida = respondida && editando !== key;

                          if (recolhida) {
                            const Icon = cond.atendida ? CheckCircle2 : XCircle;
                            return (
                              <div
                                key={key}
                                className="flex items-start justify-between gap-3 p-4 rounded-sm border border-border bg-secondary/30"
                              >
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <Icon
                                    className={`w-4 h-4 shrink-0 mt-0.5 ${cond.atendida ? 'text-risk-baixo' : 'text-risk-medio'}`}
                                    strokeWidth={2}
                                  />
                                  <p className="text-[13px] text-foreground/90 leading-snug">{cond.texto}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditando(key)}
                                  className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                                >
                                  Alterar
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div key={key} className="p-5 rounded-sm border border-primary/25 bg-secondary/60 space-y-3">
                              <div className="flex items-start gap-2.5">
                                <Circle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" strokeWidth={2} />
                                <p className="text-sm text-foreground/90 leading-snug font-medium flex-1">
                                  {cond.texto}
                                </p>
                              </div>
                              <RadioGroup
                                value={cond.atendida === true ? 'sim' : cond.atendida === false ? 'nao' : ''}
                                onValueChange={(v) => {
                                  onAnswer(key, v);
                                  setEditando(null);
                                }}
                                className="flex flex-wrap gap-3 pl-6"
                              >
                                <div className="flex items-center space-x-3 bg-card px-6 py-3 rounded-md border border-border hover:border-primary transition-colors">
                                  <RadioGroupItem value="sim" id={`${key}-sim`} className="h-4 w-4 border-primary" />
                                  <Label htmlFor={`${key}-sim`} className="text-foreground text-sm cursor-pointer">
                                    Sim, atende
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-3 bg-card px-6 py-3 rounded-md border border-border hover:border-primary transition-colors">
                                  <RadioGroupItem value="nao" id={`${key}-nao`} className="h-4 w-4 border-primary" />
                                  <Label htmlFor={`${key}-nao`} className="text-foreground text-sm cursor-pointer">
                                    Não atende
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fundamentação do resultado — recolhida por padrão: com vários CNAEs a lista
            cresce (uma linha por atividade fora do rito simplificado), e é justificativa,
            não a próxima ação do usuário. */}
        {result.reasons.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="motivos" className="border border-border rounded-md bg-secondary/60 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="flex items-center gap-3 text-sm text-foreground/80">
                  <HelpCircle className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                  Por que este enquadramento ({result.reasons.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5">
                <ul className="space-y-2">
                  {result.reasons.map((reason, i) => (
                    <li key={i} className="text-sm text-foreground/90 leading-snug flex gap-2">
                      <span className="text-primary shrink-0">•</span>
                      <span>{reason}</span>
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
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            O enquadramento no Anexo Único vem de decreto estadual, mas o <strong className="font-medium">alvará de
            funcionamento em si é emitido pela prefeitura</strong> do município onde a empresa está
            estabelecida. Constar no Anexo Único libera a emissão sem vistoria prévia — não dispensa a
            solicitação do alvará.
          </p>
        </div>
      </div>
    </div>
  );
}
