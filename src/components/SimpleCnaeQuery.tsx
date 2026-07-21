'use client';

import React, { useState } from 'react';
import { Search, AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { resolveCnaeRisk } from '@/lib/risk-analysis';
import { RiskBadge } from './risk-components';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

const PORTE_THEMES: Record<string, { text: string; bg: string; border: string; icon: any; label: string; }> = {
  'Porte III': {
    text: 'text-risk-alto',
    bg: 'bg-risk-alto/10',
    border: 'border-risk-alto/25',
    icon: AlertTriangle,
    label: 'Alta Complexidade'
  },
  'Porte II e III': {
    text: 'text-risk-medio',
    bg: 'bg-risk-medio/10',
    border: 'border-risk-medio/25',
    icon: AlertCircle,
    label: 'Média Complexidade'
  },
  'Porte I, II e III': {
    text: 'text-risk-baixo',
    bg: 'bg-risk-baixo/10',
    border: 'border-risk-baixo/25',
    icon: CheckCircle2,
    label: ''
  }
};

const RISK_BG: Record<string, { text: string; bg: string; }> = {
  'BAIXO': { text: 'text-risk-baixo', bg: 'bg-risk-baixo/10' },
  'MEDIO': { text: 'text-risk-medio', bg: 'bg-risk-medio/10' },
  'ALTO': { text: 'text-risk-alto', bg: 'bg-risk-alto/10' },
};

export function SimpleCnaeQuery() {
  const [query, setQuery] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);

  const handleSearch = (currentAnswers?: Record<string, string>) => {
    if (!query) return;
    const activeAnswers = currentAnswers !== undefined ? currentAnswers : {};
    if (currentAnswers === undefined) {
      setAnswers({});
    }
    const res = resolveCnaeRisk(query, activeAnswers);
    setResult(res);
  };

  const reset = () => {
    setQuery('');
    setResult(null);
    setAnswers({});
  };

  return (
    <Card className="p-8 md:p-14 bg-card border border-border rounded-md shadow-refined overflow-hidden relative mt-14">
      <div className="space-y-9">
        <div className="text-center space-y-2">
          <p className="eyebrow text-muted-foreground">Antes de abrir sua empresa</p>
          <h3 className="font-display text-2xl md:text-3xl text-foreground flex items-center justify-center gap-3">
            <Search className="w-5 h-5 text-accent" strokeWidth={1.75} />
            Consulta Prévia por CNAE
          </h3>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <div className="w-full md:w-64">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0000-0/00"
              value={query}
              onChange={(e) => setQuery(e.target.value.replace(/\D/g, ''))}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="h-14 text-lg md:text-xl text-center border border-input bg-background rounded-md font-mono font-medium text-primary shadow-inner placeholder:text-muted-foreground/30"
            />
          </div>
          <Button
            onClick={() => handleSearch()}
            className="h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-semibold uppercase tracking-[0.15em] transition-all shadow-refined w-full md:w-auto"
          >
            Consultar
          </Button>
        </div>

        {result && result.risk !== 'NÃO ENCONTRADO' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 border border-border rounded-md divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
              <div className={`${RISK_BG[result.risk]?.bg || 'bg-card'} p-6 space-y-4`}>
                <div className="flex items-center justify-between">
                  <span className={`eyebrow ${RISK_BG[result.risk]?.text || 'text-muted-foreground'}`}>Grau de Risco</span>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
                <div className="text-center py-2">
                  <p className={`font-display text-2xl md:text-3xl tracking-tight ${RISK_BG[result.risk]?.text || 'text-foreground'}`}>
                    {result.risk}
                  </p>
                </div>
                <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
                  {result.risk === 'BAIXO' && "Dispensa licenciamento sanitário"}
                  {result.risk === 'MEDIO' && "Licenciamento simplificado (Nível II)"}
                  {result.risk === 'ALTO' && result.requiresPba && "Exige inspeção sanitária e Projeto Básico de Arquitetura (PBA) (Nível III)"}
                  {result.risk === 'ALTO' && !result.requiresPba && "Exige inspeção sanitária prévia (Nível III)"}
                </p>
              </div>

              <div className={`${PORTE_THEMES[result.porte]?.bg || 'bg-card'} p-6 space-y-4`}>
                <div className="flex items-center justify-between">
                  <span className={`eyebrow ${PORTE_THEMES[result.porte]?.text || 'text-muted-foreground'}`}>
                    Porte de Fiscalização
                  </span>
                  {(() => {
                    const ThemeIcon = PORTE_THEMES[result.porte]?.icon || CheckCircle2;
                    return <ThemeIcon className={`w-3.5 h-3.5 ${PORTE_THEMES[result.porte]?.text || 'text-muted-foreground/50'}`} strokeWidth={1.75} />;
                  })()}
                </div>
                <div className="text-center py-2">
                  <p className={`font-display text-2xl md:text-3xl tracking-tight ${PORTE_THEMES[result.porte]?.text || 'text-foreground'}`}>
                    {result.porte}
                  </p>
                  {PORTE_THEMES[result.porte]?.label && (
                    <p className={`text-[10px] font-medium uppercase tracking-wider mt-1 opacity-80 ${PORTE_THEMES[result.porte]?.text || 'text-muted-foreground'}`}>
                      {PORTE_THEMES[result.porte]?.label}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {result.risk === 'CONDICIONADO' && result.path && (
              <div className="p-7 bg-secondary/60 border border-border rounded-md space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-border rounded-full shrink-0">
                    <AlertCircle className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <p className="eyebrow text-muted-foreground">Questionário de Autodeclaração</p>
                    <p className="text-sm md:text-base text-foreground/90 leading-snug">{result.question}</p>
                  </div>
                </div>
                <RadioGroup
                  value={answers[result.path] || ""}
                  onValueChange={(v) => {
                    const nextAnswers = { ...answers, [result.path!]: v };
                    setAnswers(nextAnswers);
                    handleSearch(nextAnswers);
                  }}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-3 bg-card px-6 py-3 rounded-md border border-border hover:border-accent transition-colors cursor-pointer">
                    <RadioGroupItem value="Sim" id="pre-sim" className="h-4 w-4 border-primary" />
                    <Label htmlFor="pre-sim" className="text-foreground text-sm cursor-pointer">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-3 bg-card px-6 py-3 rounded-md border border-border hover:border-accent transition-colors cursor-pointer">
                    <RadioGroupItem value="Não" id="pre-nao" className="h-4 w-4 border-primary" />
                    <Label htmlFor="pre-nao" className="text-foreground text-sm cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {result.requiresPba && (
              <div className="p-7 bg-secondary/60 border border-border rounded-md space-y-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-border rounded-full shrink-0">
                    <AlertTriangle className="w-4 h-4 text-destructive" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="eyebrow text-muted-foreground">Exigência de Projeto Básico de Arquitetura (PBA)</p>
                    <p className="text-sm text-foreground/90 leading-snug">
                      O Projeto Básico de Arquitetura (PBA), documento técnico que descreve a estrutura física do estabelecimento, deve ser <span className="font-semibold text-foreground">previamente aprovado pela Vigilância Sanitária</span> antes do início das operações e em cada renovação da licença (art. 9º da Resolução SESA nº 1.034/2020).
                    </p>
                    {result.pbaNote && (
                      <p className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                        <span className="text-destructive shrink-0">•</span> {result.pbaNote}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {result.specialProjectNote && (
              <div className="p-7 bg-secondary/60 border border-border rounded-md space-y-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-border rounded-full shrink-0">
                    <AlertCircle className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="eyebrow text-muted-foreground">Exigência de Projeto Específico</p>
                    <p className="text-sm text-foreground/90 leading-snug">{result.specialProjectNote}</p>
                  </div>
                </div>
              </div>
            )}

            {result.porteNote && (
              <div className="p-7 bg-secondary/60 border border-border rounded-md space-y-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-border rounded-full shrink-0">
                    <HelpCircle className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="eyebrow text-muted-foreground">Observação sobre o Porte de Fiscalização</p>
                    <p className="text-sm text-foreground/90 leading-snug">{result.porteNote}</p>
                  </div>
                </div>
              </div>
            )}

            {result.baixoRiscoNote && (
              <div className="p-7 bg-secondary/60 border border-border rounded-md space-y-2">
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-border rounded-full shrink-0">
                    <HelpCircle className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="eyebrow text-muted-foreground">Nota sobre Baixo Risco (Decreto Estadual nº 10.590/2025)</p>
                    <p className="text-sm text-foreground/90 leading-snug">{result.baixoRiscoNote}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                onClick={reset}
                variant="outline"
                className="border-border text-muted-foreground hover:border-primary hover:text-primary rounded-md px-10 py-5 h-auto text-[11px] font-semibold uppercase tracking-[0.15em]"
              >
                Nova Consulta
              </Button>
            </div>
          </div>
        )}

        {result && result.risk === 'NÃO ENCONTRADO' && (
          <div className="p-8 border-l-2 border-destructive bg-destructive/[0.04] rounded-sm text-center space-y-4">
            <XCircle className="w-8 h-8 text-destructive mx-auto" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="text-foreground font-display text-lg">CNAE não localizado</p>
              <p className="text-muted-foreground text-[13px]">Verifique o código ou consulte a vigilância local.</p>
            </div>
            <Button onClick={reset} variant="outline" className="border-border text-muted-foreground hover:border-primary hover:text-primary text-[11px] font-semibold uppercase tracking-wider">Tentar Novamente</Button>
          </div>
        )}

        <div className="pt-10 space-y-6">
          <div className="flex items-center gap-4">
             <div className="rule-hairline flex-1"></div>
             <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.3em] whitespace-nowrap">Nota Explicativa</span>
             <div className="rule-hairline flex-1"></div>
          </div>

          <div className="bg-secondary/40 p-8 md:p-12 rounded-md border border-border">
            <p className="text-sm md:text-base text-foreground/80 leading-relaxed text-center max-w-2xl mx-auto">
              O porte de cada município (I, II ou III) pode variar de acordo com a sua capacidade técnica e administrativa.
              Consulte a classificação do seu município no documento oficial abaixo:
            </p>
            <div className="flex justify-center mt-7">
              <a
                href="/porte-dos-municipios.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-primary px-7 py-3.5 rounded-md text-[11px] font-semibold text-primary-foreground uppercase tracking-[0.15em] hover:bg-primary/90 transition-colors shadow-refined"
              >
                <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
                Consultar Porte dos Municípios
              </a>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
