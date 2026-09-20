'use client';

/**
 * @fileOverview BUSCA RÁPIDA POR CNAE — QUINTA FRENTES EM UM MENU SÓ.
 *
 * Antes, os resultados das três primeiras frentes ficavam todos visíveis ao mesmo tempo
 * logo abaixo da busca, o que poluía a tela assim que a quarta e a quinta frente (ambiental
 * e Polícia Civil) entraram no portal. Agora a busca devolve cinco botões-menu — um por
 * frente — e só um fica aberto por vez, com todo o conteúdo daquela frente (veredito,
 * questionário, fundamentação) organizado dentro do próprio menu. Os quatro painéis que não
 * são a Vigilância Sanitária são os mesmos componentes completos usados na consulta por CNPJ
 * (BombeirosPanel, AlvaraPanel, AmbientalPanel, PcprPanel), alimentados aqui com um único CNAE.
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  XCircle,
  ShieldCheck,
  Flame,
  Building2,
  Leaf,
  BadgeCheck,
} from 'lucide-react';
import { resolveCnaeRisk } from '@/lib/risk-analysis';
import { triarCnaes as triarBombeiros } from '@/lib/bombeiros-analysis';
import { triarCnaes as triarAlvara } from '@/lib/alvara-analysis';
import { analyzeAmbiental } from '@/lib/ambiental-analysis';
import { analyzePcpr } from '@/lib/pcpr-analysis';
import { descricaoCnae } from '@/lib/cnae-catalogo';
import type { Cnae } from '@/lib/types';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { BombeirosPanel } from './BombeirosPanel';
import { AlvaraPanel } from './AlvaraPanel';
import { AmbientalPanel } from './AmbientalPanel';
import { PcprPanel } from './PcprPanel';

const PORTE_THEMES: Record<string, { text: string; bg: string; border: string; label: string; }> = {
  'Porte III': { text: 'text-risk-alto', bg: 'bg-risk-alto/10', border: 'border-risk-alto/25', label: 'Alta Complexidade' },
  'Porte II e III': { text: 'text-risk-medio', bg: 'bg-risk-medio/10', border: 'border-risk-medio/25', label: 'Média Complexidade' },
  'Porte I, II e III': { text: 'text-risk-baixo', bg: 'bg-risk-baixo/10', border: 'border-risk-baixo/25', label: '' },
};

const RISK_BG: Record<string, { text: string; bg: string; }> = {
  BAIXO: { text: 'text-risk-baixo', bg: 'bg-risk-baixo/10' },
  MEDIO: { text: 'text-risk-medio', bg: 'bg-risk-medio/10' },
  ALTO: { text: 'text-risk-alto', bg: 'bg-risk-alto/10' },
};

// Mesmas cores do painel "Cinco licenças, uma consulta" na home — a mesma frente
// tem a mesma cor em toda a página, acesa mesmo com o menu fechado.
const MENUS = [
  { id: 'VISA', Icon: ShieldCheck, label: 'Vigilância Sanitária', text: 'text-primary', border: 'border-t-primary', tint: 'bg-primary/10', ring: 'border-primary' },
  { id: 'CBMPR', Icon: Flame, label: 'Corpo de Bombeiros', text: 'text-risk-alto', border: 'border-t-risk-alto', tint: 'bg-risk-alto/10', ring: 'border-risk-alto' },
  { id: 'ALVARA', Icon: Building2, label: 'Alvará de Funcionamento', text: 'text-risk-condicionado', border: 'border-t-risk-condicionado', tint: 'bg-risk-condicionado/10', ring: 'border-risk-condicionado' },
  { id: 'AMBIENTAL', Icon: Leaf, label: 'Licenciamento Ambiental', text: 'text-risk-baixo', border: 'border-t-risk-baixo', tint: 'bg-risk-baixo/10', ring: 'border-risk-baixo' },
  { id: 'PCPR', Icon: BadgeCheck, label: 'Polícia Civil', text: 'text-primary', border: 'border-t-primary', tint: 'bg-primary/10', ring: 'border-primary' },
] as const;
type MenuId = typeof MENUS[number]['id'];

/** Cor do sinalizador no botão fechado — dá um resumo antes mesmo de abrir o menu. */
function dotVisa(risk?: string): string {
  if (risk === 'BAIXO') return 'bg-risk-baixo';
  if (risk === 'MEDIO') return 'bg-risk-medio';
  if (risk === 'ALTO') return 'bg-risk-alto';
  if (risk === 'CONDICIONADO') return 'bg-risk-condicionado';
  return 'bg-muted-foreground/30';
}
function dotBombeiro(item: ReturnType<typeof triarBombeiros>[number] | null): string {
  if (!item) return 'bg-muted-foreground/30';
  if (item.anexo === 'B') return 'bg-risk-alto';
  if (item.anexo === 'A') return 'bg-risk-medio';
  return 'bg-muted-foreground/30';
}
function dotAlvara(item: ReturnType<typeof triarAlvara>[number] | null): string {
  if (!item) return 'bg-muted-foreground/30';
  if (!item.enquadrado) return 'bg-risk-medio';
  if (item.atende) return 'bg-risk-baixo';
  if (item.pendente) return 'bg-primary';
  return 'bg-risk-medio';
}
function dotSinal(sinal?: string): string {
  if (sinal === 'PROVAVEL') return 'bg-risk-baixo';
  if (sinal === 'NÃO LISTADO') return 'bg-muted-foreground/30';
  return 'bg-muted-foreground/30';
}

export function SimpleCnaeQuery() {
  const [query, setQuery] = useState('');
  // Código efetivamente pesquisado — só muda ao clicar "Consultar", para não recalcular tudo a
  // cada tecla digitada no campo (que segue livre para o usuário corrigir antes de buscar de novo).
  const [searchedCode, setSearchedCode] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bombeirosAnswers, setBombeirosAnswers] = useState<Record<string, string>>({});
  const [alvaraAnswers, setAlvaraAnswers] = useState<Record<string, string>>({});
  const [ambientalAnswers, setAmbientalAnswers] = useState<Record<string, string>>({});
  const [pcprAnswers, setPcprAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  // Só um menu fica aberto por vez — é o que evita que a tela acumule as cinco frentes juntas.
  const [menuAberto, setMenuAberto] = useState<MenuId | null>(null);

  const handleSearch = (currentAnswers?: Record<string, string>) => {
    if (!query) return;
    const activeAnswers = currentAnswers !== undefined ? currentAnswers : {};
    if (currentAnswers === undefined) {
      setAnswers({});
      setBombeirosAnswers({});
      setAlvaraAnswers({});
      setAmbientalAnswers({});
      setPcprAnswers({});
      setSearchedCode(query);
      setMenuAberto('VISA');
    }
    const res = resolveCnaeRisk(query, activeAnswers);
    setResult(res);
  };

  const reset = () => {
    setQuery('');
    setSearchedCode('');
    setResult(null);
    setAnswers({});
    setBombeirosAnswers({});
    setAlvaraAnswers({});
    setAmbientalAnswers({});
    setPcprAnswers({});
    setMenuAberto(null);
  };

  // As cinco frentes são independentes — cada órgão tem seu próprio anexo/rol, então uma
  // atividade pode não constar de um e constar de outro (mesmo princípio explicado dentro de
  // cada painel: a dispensa de um órgão não vale para os demais).
  // Descrição oficial do IBGE: confirma ao usuário que o código digitado é o que ele
  // pensa que é, e separa "código inexistente" de "código que o órgão não classifica".
  const descricaoOficial = searchedCode ? descricaoCnae(searchedCode) : null;
  const codigoExiste = descricaoOficial !== null;
  const cnaesArray: Cnae[] = codigoExiste ? [{ code: searchedCode, description: descricaoOficial || '' }] : [];

  const bombeirosItem = codigoExiste ? triarBombeiros(cnaesArray)[0] : null;
  const alvaraItem = codigoExiste ? triarAlvara(cnaesArray, alvaraAnswers)[0] : null;
  const ambientalResult = codigoExiste ? analyzeAmbiental(cnaesArray, ambientalAnswers) : null;
  const pcprResult = codigoExiste ? analyzePcpr(cnaesArray, pcprAnswers) : null;

  const DOTS: Record<MenuId, string> = {
    VISA: dotVisa(result?.risk),
    CBMPR: dotBombeiro(bombeirosItem),
    ALVARA: dotAlvara(alvaraItem),
    AMBIENTAL: dotSinal(ambientalResult?.sinal),
    PCPR: dotSinal(pcprResult?.sinal),
  };

  return (
    <Card className="p-8 md:p-12 bg-card border border-border border-t-2 border-t-sinal rounded-md shadow-refined overflow-hidden relative">
      <div className="space-y-9">
        {/* O cabeçalho vive na seção que embrulha este cartão; aqui fica só a ação. */}
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

        {/* Identificação da atividade, direto do catálogo oficial do IBGE. */}
        {searchedCode && descricaoOficial && (
          <div className="p-6 rounded-md border border-border bg-secondary/40 animate-in fade-in duration-300">
            <p className="eyebrow text-muted-foreground mb-1.5">Atividade consultada</p>
            <p className="text-sm md:text-base text-foreground/90 leading-snug">
              <code className="text-[12px] font-medium text-primary bg-card px-2 py-0.5 rounded-sm mr-2">
                {searchedCode}
              </code>
              {descricaoOficial}
            </p>
          </div>
        )}

        {/* Código que não existe na CNAE é erro de digitação, não ausência de exigência. */}
        {searchedCode && !codigoExiste && (
          <div className="p-8 border-l-2 border-destructive bg-destructive/[0.04] rounded-sm text-center space-y-3 animate-in fade-in duration-300">
            <XCircle className="w-8 h-8 text-destructive mx-auto" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="text-foreground font-display text-lg">Este código não existe na CNAE</p>
              <p className="text-muted-foreground text-[13px] max-w-md mx-auto leading-relaxed">
                O número {searchedCode} não corresponde a nenhuma das 1.332 subclasses vigentes da
                Classificação Nacional de Atividades Econômicas. Confira o código no cartão CNPJ ou no
                contrato social e consulte de novo.
              </p>
            </div>
          </div>
        )}

        {/* Os cinco menus — um por frente. Só um abre por vez, o que é o que evita que a tela
            acumule cinco resultados ao mesmo tempo. */}
        {codigoExiste && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {MENUS.map(({ id, Icon, label, text, border, tint, ring }) => {
                const isOpen = menuAberto === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMenuAberto(isOpen ? null : id)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-md border border-border border-t-2 ${border} bg-card text-center transition-all hover:shadow-refined ${
                      isOpen ? `${tint} ring-1 ${ring} shadow-refined` : ''
                    }`}
                  >
                    <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${DOTS[id]}`} />
                    <div className={`p-2 rounded-full ${tint} border border-border`}>
                      <Icon className={`w-4 h-4 ${text}`} strokeWidth={1.75} />
                    </div>
                    <span className={`text-[11px] font-semibold uppercase tracking-wider leading-tight ${isOpen ? text : 'text-foreground/80'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* O conteúdo do menu aberto — tudo daquela frente organizado dentro dela mesma:
                veredito, questionário quando houver, e a fundamentação legal. */}
            {menuAberto === 'VISA' && result && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {result.risk !== 'NÃO ENCONTRADO' ? (
                  <>
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
                          {result.risk === 'BAIXO' && 'Dispensa licenciamento sanitário'}
                          {result.risk === 'MEDIO' && 'Licenciamento simplificado (Nível II)'}
                          {result.risk === 'ALTO' && result.requiresPba && 'Exige inspeção sanitária e Projeto Básico de Arquitetura (PBA) (Nível III)'}
                          {result.risk === 'ALTO' && !result.requiresPba && 'Exige inspeção sanitária prévia (Nível III)'}
                        </p>
                      </div>

                      <div className={`${PORTE_THEMES[result.porte]?.bg || 'bg-card'} p-6 space-y-4`}>
                        <div className="flex items-center justify-between">
                          <span className={`eyebrow ${PORTE_THEMES[result.porte]?.text || 'text-muted-foreground'}`}>
                            Porte de Fiscalização
                          </span>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${PORTE_THEMES[result.porte]?.text || 'text-muted-foreground/50'}`} strokeWidth={1.75} />
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
                          value={answers[result.path] || ''}
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
                      <div className="p-6 bg-card border border-border border-l-2 border-l-risk-alto rounded-md space-y-1.5">
                        <p className="eyebrow text-muted-foreground">Exigência de Projeto Básico de Arquitetura (PBA)</p>
                        <p className="text-sm text-foreground/90 leading-snug">
                          O Projeto Básico de Arquitetura (PBA), documento técnico que descreve a estrutura física do
                          estabelecimento, deve ser previamente aprovado pela Vigilância Sanitária antes do início das
                          operações e em cada renovação da licença (art. 9º da Resolução SESA nº 1.034/2020).
                          {result.pbaNote && <span className="block mt-1 text-muted-foreground">{result.pbaNote}</span>}
                        </p>
                      </div>
                    )}

                    {result.specialProjectNote && (
                      <div className="p-6 bg-card border border-border rounded-md space-y-1.5">
                        <p className="eyebrow text-muted-foreground">Exigência de Projeto Específico</p>
                        <p className="text-sm text-foreground/90 leading-snug">{result.specialProjectNote}</p>
                      </div>
                    )}

                    {result.porteNote && (
                      <div className="p-6 bg-card border border-border rounded-md space-y-1.5">
                        <p className="eyebrow text-muted-foreground">Observação sobre o Porte de Fiscalização</p>
                        <p className="text-sm text-foreground/90 leading-snug">{result.porteNote}</p>
                      </div>
                    )}

                    {result.baixoRiscoNote && (
                      <div className="p-6 bg-card border border-border rounded-md space-y-1.5">
                        <p className="eyebrow text-muted-foreground">Nota sobre Baixo Risco (Decreto Estadual nº 10.590/2025)</p>
                        <p className="text-sm text-foreground/90 leading-snug">{result.baixoRiscoNote}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-7 border-l-2 border-risk-medio bg-risk-medio/[0.06] rounded-sm space-y-2">
                    <p className="eyebrow text-risk-medio">Vigilância Sanitária</p>
                    <p className="text-sm text-foreground/90 leading-snug">
                      A atividade existe na CNAE, mas não consta do rol sanitário do Paraná. Isso não é
                      dispensa automática: significa que o enquadramento precisa ser feito caso a caso pela
                      Vigilância Sanitária do seu município.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
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
              </div>
            )}

            {menuAberto === 'CBMPR' && (
              <div className="animate-in fade-in duration-300">
                <BombeirosPanel
                  cnaes={cnaesArray}
                  answers={bombeirosAnswers}
                  onAnswer={(id, value) => setBombeirosAnswers((prev) => ({ ...prev, [id]: value }))}
                />
              </div>
            )}

            {menuAberto === 'ALVARA' && (
              <div className="animate-in fade-in duration-300">
                <AlvaraPanel
                  cnaes={cnaesArray}
                  answers={alvaraAnswers}
                  onAnswer={(id, value) => setAlvaraAnswers((prev) => ({ ...prev, [id]: value }))}
                />
              </div>
            )}

            {menuAberto === 'AMBIENTAL' && (
              <div className="animate-in fade-in duration-300">
                <AmbientalPanel
                  cnaes={cnaesArray}
                  answers={ambientalAnswers}
                  onAnswer={(id, value) => setAmbientalAnswers((prev) => ({ ...prev, [id]: value }))}
                />
              </div>
            )}

            {menuAberto === 'PCPR' && (
              <div className="animate-in fade-in duration-300">
                <PcprPanel
                  cnaes={cnaesArray}
                  answers={pcprAnswers}
                  onAnswer={(id, value) => setPcprAnswers((prev) => ({ ...prev, [id]: value }))}
                />
              </div>
            )}
          </div>
        )}

        {searchedCode && (
          <div className="flex justify-center">
            <Button
              onClick={reset}
              variant="outline"
              className="border-border text-muted-foreground hover:border-primary hover:text-primary rounded-md px-10 py-5 h-auto text-[11px] font-semibold uppercase tracking-[0.15em]"
            >
              Nova Consulta
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
