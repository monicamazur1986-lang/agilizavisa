'use client';

/**
 * @fileOverview PAINEL DA VIGILÂNCIA SANITÁRIA — PARANÁ.
 * Resolução SESA nº 1.034/2020 · Decreto Estadual nº 10.590/2025.
 *
 * Reescrito para o mesmo formato compacto dos outros quatro painéis: um veredito
 * direto no cabeçalho já responde a pergunta prática (precisa ou não de licença), as
 * notas legais (PBA, projeto específico, porte, baixo risco) vão para um único bloco
 * de observações em vez de um cartão cada, e o parágrafo técnico longo — que só
 * repetia em registro formal o que o veredito já disse — foi removido.
 */

import { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, ShieldCheck } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RiskBadge } from '@/components/risk-components';
import { analyzeRisk, resolveCnaeRisk } from '@/lib/risk-analysis';
import type { Cnae, RiskAnalysisResult } from '@/lib/types';

type PanelTheme = { text: string; bg: string; border: string; borderTop: string; icon: any };

const PANEL_THEMES: Record<string, PanelTheme> = {
  BAIXO: { text: 'text-risk-baixo', bg: 'bg-risk-baixo/10', border: 'border-risk-baixo/25', borderTop: 'border-risk-baixo', icon: CheckCircle2 },
  MEDIO: { text: 'text-risk-medio', bg: 'bg-risk-medio/10', border: 'border-risk-medio/25', borderTop: 'border-risk-medio', icon: AlertCircle },
  ALTO: { text: 'text-risk-alto', bg: 'bg-risk-alto/10', border: 'border-risk-alto/25', borderTop: 'border-risk-alto', icon: AlertTriangle },
  CONDICIONADO: { text: 'text-risk-condicionado', bg: 'bg-risk-condicionado/10', border: 'border-risk-condicionado/25', borderTop: 'border-risk-condicionado', icon: HelpCircle },
  'NÃO ENCONTRADO': { text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', borderTop: 'border-border', icon: HelpCircle },
};

/** Traduz o nível técnico na resposta prática que o empresário procura. */
const VEREDITOS: Record<string, { headline: string; detail: string }> = {
  BAIXO: { headline: 'Dispensada de licença sanitária', detail: 'Pode operar sem licenciamento prévio, observadas as normas sanitárias vigentes.' },
  MEDIO: { headline: 'Exige licença sanitária simplificada', detail: 'Emissão sem inspeção prévia — pode operar assim que a licença sair.' },
  ALTO: { headline: 'Exige licença sanitária com inspeção', detail: 'A emissão depende de inspeção e/ou análise documental prévias.' },
  CONDICIONADO: { headline: 'Depende das respostas abaixo', detail: 'Responda ao questionário de cada CNAE para fechar a classificação.' },
  'NÃO ENCONTRADO': { headline: 'Consulte a Vigilância Sanitária municipal', detail: 'Atividade fora do rol oficial — o enquadramento precisa ser individualizado.' },
};

const PORTE_THEMES: Record<string, { text: string; bg: string; border: string; label: string }> = {
  'Porte III': { text: 'text-risk-alto', bg: 'bg-risk-alto/10', border: 'border-risk-alto/25', label: 'Fiscalização: Porte III' },
  'Porte II e III': { text: 'text-risk-medio', bg: 'bg-risk-medio/10', border: 'border-risk-medio/25', label: 'Fiscalização: Porte II e III' },
  'Porte I, II e III': { text: 'text-risk-baixo', bg: 'bg-risk-baixo/10', border: 'border-risk-baixo/25', label: 'Fiscalização: qualquer porte' },
};

function vereditoLabel(result: RiskAnalysisResult): string {
  if (result.level === 'CONDICIONADO') return 'Risco Condicionado';
  if (result.level === 'NÃO ENCONTRADO') return 'Atividade Não Localizada';
  const labels: Record<string, string> = { BAIXO: 'Baixo Risco', MEDIO: 'Médio Risco', ALTO: 'Alto Risco' };
  return labels[result.level] || result.level;
}

export function VisaPanel({
  cnaes,
  answers,
  onAnswer,
}: {
  cnaes: Cnae[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
}) {
  const result = analyzeRisk(cnaes, answers);
  const theme = PANEL_THEMES[result.level] || PANEL_THEMES['NÃO ENCONTRADO'];
  const veredito = VEREDITOS[result.level] || VEREDITOS['NÃO ENCONTRADO'];
  const VereditoIcon = theme.icon;

  // Observações legais agrupadas por assunto — o rótulo aparece uma vez por grupo, não
  // repetido a cada nota — e ficam dentro de um acordeão sempre fechado por padrão: com
  // vários CNAEs a lista cresce rápido (uma nota de porte e uma de baixo risco por
  // atividade), e a maioria dessas notas só interessa a quem quer o detalhe jurídico.
  const grupos: { label: string; itens: string[] }[] = [];
  if (result.requiresPba) {
    grupos.push({
      label: 'Projeto Básico de Arquitetura (PBA)',
      itens: [
        'Aprovação prévia pela Vigilância Sanitária antes de operar e em cada renovação (art. 9º da Resolução SESA nº 1.034/2020).',
        ...result.pbaNotes,
      ],
    });
  }
  if (result.specialProjectNotes.length > 0) grupos.push({ label: 'Projeto específico', itens: result.specialProjectNotes });
  if (result.porteNotes.length > 0) grupos.push({ label: 'Porte de fiscalização', itens: result.porteNotes });
  if (result.baixoRiscoNotes.length > 0) grupos.push({ label: 'Baixo Risco (Decreto Estadual nº 10.590/2025)', itens: result.baixoRiscoNotes });
  const totalObservacoes = grupos.reduce((n, g) => n + g.itens.length, 0);

  // Ao responder a última pergunta pendente do questionário condicionado, a lista de
  // CNAEs continua embaixo — mas o que responde à pergunta do usuário é o veredito lá
  // em cima. Por isso, quando a última pendência é resolvida, o painel volta sozinho
  // para o topo, onde está o resultado final.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pendentesAnteriorRef = useRef(result.unresolved.length);
  useEffect(() => {
    const anterior = pendentesAnteriorRef.current;
    const atual = result.unresolved.length;
    if (anterior > 0 && atual === 0) {
      requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    pendentesAnteriorRef.current = atual;
  }, [result.unresolved.length]);

  return (
    <div ref={panelRef} className={`bg-card rounded-md border border-border border-t-2 ${theme.borderTop} overflow-hidden shadow-refined-lg scroll-mt-6`}>
      <div className={`${theme.bg} px-6 md:px-10 py-10 text-center border-b border-border space-y-3`}>
        <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card border ${theme.border} shadow-refined`}>
          <ShieldCheck className={`w-[18px] h-[18px] ${theme.text}`} strokeWidth={2} />
          <span className={`text-[13px] md:text-sm font-bold uppercase tracking-[0.16em] ${theme.text}`}>Vigilância Sanitária</span>
        </div>

        <h3 className={`font-display text-3xl md:text-4xl ${theme.text} tracking-tight`}>{vereditoLabel(result)}</h3>

        <div className="flex items-center justify-center gap-2.5 pt-1">
          <VereditoIcon className={`w-4 h-4 ${theme.text} shrink-0`} strokeWidth={1.75} />
          <p className="text-sm text-foreground/80 leading-snug max-w-xl">
            <span className="font-semibold">{veredito.headline}.</span> {veredito.detail}
          </p>
        </div>

        {result.porte && (
          <span
            className={`inline-flex mt-2 px-3.5 py-1.5 rounded-sm border items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] ${
              (PORTE_THEMES[result.porte] || PORTE_THEMES['Porte I, II e III']).bg
            } ${(PORTE_THEMES[result.porte] || PORTE_THEMES['Porte I, II e III']).border} ${
              (PORTE_THEMES[result.porte] || PORTE_THEMES['Porte I, II e III']).text
            }`}
          >
            {(PORTE_THEMES[result.porte] || PORTE_THEMES['Porte I, II e III']).label}
          </span>
        )}
      </div>

      <div className="p-6 md:p-10 space-y-8">
        {grupos.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="observacoes" className="border border-border rounded-md bg-secondary/60 overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="flex items-center gap-3 text-sm text-foreground/80">
                  <HelpCircle className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                  Observações ({totalObservacoes})
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5 space-y-4">
                {grupos.map((g, gi) => (
                  <div key={gi} className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
                    <ul className="space-y-1.5">
                      {g.itens.map((texto, i) => (
                        <li key={i} className="text-sm text-foreground/90 leading-snug flex gap-2">
                          <span className="text-primary shrink-0">•</span>
                          <span>{texto}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h4 className="eyebrow whitespace-nowrap text-muted-foreground">Detalhamento por CNAE</h4>
            <div className="rule-hairline flex-1" />
          </div>

          <div className="space-y-3">
            {(cnaes || []).map((c, idx) => {
              const cnaeRes = resolveCnaeRisk(c.code, answers);
              return (
                <div key={`${c.code}-${idx}`} className="rounded-md border border-border overflow-hidden">
                  <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-baseline gap-2.5 flex-wrap flex-1 min-w-0">
                      <code className="text-[11px] font-medium text-primary bg-secondary px-2.5 py-1 rounded-sm shrink-0">{c.code}</code>
                      <span className="text-sm text-foreground/90 leading-snug">{c.description}</span>
                    </div>
                    <RiskBadge level={cnaeRes.risk} />
                  </div>

                  {cnaeRes.risk === 'CONDICIONADO' && cnaeRes.path && (
                    <div className="p-5 border-t border-border bg-secondary/40 space-y-3">
                      <p className="text-sm text-foreground/90 leading-snug font-medium">{cnaeRes.question}</p>
                      <RadioGroup
                        value={answers[cnaeRes.path] || ''}
                        onValueChange={(v) => onAnswer(cnaeRes.path!, v)}
                        className="flex flex-wrap gap-3"
                      >
                        <div className="flex items-center space-x-3 bg-card px-6 py-3 rounded-md border border-border hover:border-primary transition-colors">
                          <RadioGroupItem value="Sim" id={`visa-${cnaeRes.path}-sim`} className="h-4 w-4 border-primary" />
                          <Label htmlFor={`visa-${cnaeRes.path}-sim`} className="text-foreground text-sm cursor-pointer">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-3 bg-card px-6 py-3 rounded-md border border-border hover:border-primary transition-colors">
                          <RadioGroupItem value="Não" id={`visa-${cnaeRes.path}-nao`} className="h-4 w-4 border-primary" />
                          <Label htmlFor={`visa-${cnaeRes.path}-nao`} className="text-foreground text-sm cursor-pointer">Não</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="eyebrow text-muted-foreground">Porte de Fiscalização por Município</p>
          <p className="text-sm text-foreground/90 leading-snug">
            O porte de cada município (I, II ou III) pode variar de acordo com a sua capacidade técnica e
            administrativa.
          </p>
          <a
            href="/porte-dos-municipios.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-primary uppercase tracking-wider hover:underline underline-offset-4"
          >
            <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
            Consultar Porte dos Municípios
          </a>
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Fundamento: Resolução SESA nº 1.034/2020 · Decreto Estadual nº 10.590/2025.
          </p>
        </div>
      </div>
    </div>
  );
}
