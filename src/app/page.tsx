'use client';

/**
 * @fileOverview AgilizaVISA – PARANÁ – VERSÃO CONSOLIDADA PARA PUBLICAÇÃO DEFINITIVA.
 * RESOLUÇÃO SESA Nº 1034/2020 | DECRETO ESTADUAL Nº 10.590/2025.
 */

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, RotateCcw, Loader2, ArrowRight, Megaphone, MessageCircle, Mail, FileText, AlertTriangle, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { fetchCnpjData } from './actions';
import { analyzeRisk, resolveCnaeRisk } from '@/lib/risk-analysis';
import { RiskBadge, RiskIcon } from '@/components/risk-components';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MaterialsList } from '@/components/MaterialsList';
import { SimpleCnaeQuery } from '@/components/SimpleCnaeQuery';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { CompanyData, RiskAnalysisResult } from '@/lib/types';

const schema = z.object({
  cnpj: z.string().min(1, "Digite o CNPJ").refine(val => val.replace(/\D/g, '').length === 14, "O CNPJ deve ter 14 números")
});

function TechBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none tech-bg-light">
      <div className="absolute top-0 left-[10%] w-px h-full bg-gradient-to-b from-transparent via-accent/25 to-transparent" />
      <div className="absolute top-0 right-[10%] w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
}

function AgilizaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 122" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="agilizaMarkGrad" x1="8" y1="8" x2="92" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(199, 89%, 48%)" />
          <stop offset="1" stopColor="hsl(231, 48%, 48%)" />
        </linearGradient>
      </defs>
      <path
        d="M35 89 C16 84 14 50 24 33 C31 18 40 13 50 12 C60 13 69 18 76 33 C86 50 84 84 65 89 Z"
        fill="url(#agilizaMarkGrad)"
        fillOpacity="0.08"
        stroke="url(#agilizaMarkGrad)"
        strokeWidth="3"
      />
      <g stroke="url(#agilizaMarkGrad)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 89 L50 22" />
        <path d="M50 89 L50 84 L40 74 L40 28" />
        <path d="M50 89 L50 84 L60 74 L60 28" />
        <path d="M50 89 L50 80 L32 62 L32 40" />
        <path d="M50 89 L50 80 L68 62 L68 40" />
      </g>
      <g fill="hsl(var(--background))" stroke="url(#agilizaMarkGrad)" strokeWidth="2.2">
        <circle cx="50" cy="22" r="2.8" />
        <circle cx="40" cy="28" r="2.8" />
        <circle cx="60" cy="28" r="2.8" />
        <circle cx="32" cy="40" r="2.8" />
        <circle cx="68" cy="40" r="2.8" />
      </g>
      <g fill="url(#agilizaMarkGrad)">
        <path d="M37 88 h26 a2 2 0 0 1 2 2 v3 H35 v-3 a2 2 0 0 1 2 -2 Z" />
        <rect x="35" y="96" width="30" height="4.5" rx="1.2" />
        <rect x="35" y="103" width="30" height="4.5" rx="1.2" />
        <path d="M37 110 h26 l-6 11 h-14 Z" />
      </g>
    </svg>
  );
}

type RiskThemeDef = { textClass: string; borderClass: string; borderSoftClass: string; bgTintClass: string; label: string };

const RISK_THEMES: Record<string, RiskThemeDef> = {
  'BAIXO': { textClass: 'text-risk-baixo', borderClass: 'border-risk-baixo', borderSoftClass: 'border-risk-baixo/25', bgTintClass: 'bg-risk-baixo/10', label: 'Baixo Risco' },
  'MEDIO': { textClass: 'text-risk-medio', borderClass: 'border-risk-medio', borderSoftClass: 'border-risk-medio/25', bgTintClass: 'bg-risk-medio/10', label: 'Médio Risco' },
  'ALTO': { textClass: 'text-risk-alto', borderClass: 'border-risk-alto', borderSoftClass: 'border-risk-alto/25', bgTintClass: 'bg-risk-alto/10', label: 'Alto Risco' },
  'CONDICIONADO': { textClass: 'text-risk-condicionado', borderClass: 'border-risk-condicionado', borderSoftClass: 'border-risk-condicionado/25', bgTintClass: 'bg-risk-condicionado/10', label: 'Risco Condicionado' },
  'NÃO ENCONTRADO': { textClass: 'text-muted-foreground', borderClass: 'border-border', borderSoftClass: 'border-border', bgTintClass: 'bg-muted', label: 'Atividade Não Localizada' },
};

const PORTE_THEMES: Record<string, { text: string; bg: string; border: string; icon: any; }> = {
  'Porte III': {
    text: 'text-risk-alto',
    bg: 'bg-risk-alto/10',
    border: 'border-risk-alto/25',
    icon: AlertTriangle
  },
  'Porte II e III': {
    text: 'text-risk-medio',
    bg: 'bg-risk-medio/10',
    border: 'border-risk-medio/25',
    icon: AlertCircle
  },
  'Porte I, II e III': {
    text: 'text-risk-baixo',
    bg: 'bg-risk-baixo/10',
    border: 'border-risk-baixo/25',
    icon: CheckCircle2
  }
};

const getPorteTheme = (porte?: string) => {
  if (!porte) return PORTE_THEMES['Porte I, II e III'];
  return PORTE_THEMES[porte] || PORTE_THEMES['Porte I, II e III'];
};

function RiskClassificationMatrix() {
  return (
    <div className="mt-14 mb-20 px-4 space-y-10">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <p className="eyebrow text-muted-foreground">Como funciona</p>
        <h2 className="font-display text-3xl md:text-4xl text-foreground tracking-tight">
          Classificação de Risco Sanitário
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Entenda o nível de exigência sanitária necessário para o funcionamento da sua atividade, conforme a Resolução SESA nº 1.034/2020 e o Decreto Estadual nº 10.590/2025, do Paraná.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(RISK_THEMES).filter(([key]) => key !== 'NÃO ENCONTRADO').map(([key, theme]) => (
          <div key={key} className={`${theme.bgTintClass} rounded-md p-7 flex flex-col gap-3 border ${theme.borderSoftClass} border-t-2 ${theme.borderClass}`}>
            <div className="flex items-center gap-2.5">
              <RiskIcon level={key} className="w-4 h-4" />
              <span className={`font-display text-base ${theme.textClass}`}>{theme.label}</span>
            </div>
            <p className="text-[13px] text-foreground/70 leading-relaxed flex-grow">
              {key === 'BAIXO' && "Atividade econômica dispensada de licenciamento sanitário para funcionamento."}
              {key === 'MEDIO' && "Licença sanitária emitida de forma simplificada, sem inspeção prévia."}
              {key === 'ALTO' && "Exige inspeção sanitária e análise documental prévia à operação."}
              {key === 'CONDICIONADO' && "Definido após respostas a questionário específico sobre a atividade."}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto pt-4">
        <a href="https://www.saude.pr.gov.br/Pagina/Licenciamento-Sanitario" target="_blank" className="bg-card p-7 rounded-md hover:shadow-refined transition-shadow flex items-center justify-between group border border-border border-l-2 border-l-primary gap-6">
          <span className="text-foreground/90 text-sm md:text-base leading-relaxed flex-1">
            Acesse o <span className="font-semibold text-primary">site oficial</span> da Secretaria de Estado da Saúde do Paraná (SESA) para conferir o acervo completo da legislação sanitária no Estado.
          </span>
          <div className="w-10 h-10 border border-border rounded-full flex items-center justify-center text-primary group-hover:border-accent group-hover:text-accent transition-colors shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </a>
        <a href="https://prudentopolisprscp.equiplano.com.br:5028/tramitacaoProcesso/#/abertura-processo/entidade/41dd0a3a-f16f-4e8f-9b2a-8832e9191835/28" target="_blank" className="bg-card p-7 rounded-md hover:shadow-refined transition-shadow flex items-center gap-6 group border border-border border-l-2 border-l-primary">
          <div className="w-10 h-10 border border-border rounded-full flex items-center justify-center text-primary group-hover:border-accent group-hover:text-accent transition-colors shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
          <span className="text-foreground/90 text-sm md:text-base leading-relaxed flex-1">
            Empresas em <span className="font-semibold text-primary">Prudentópolis – PR</span>: solicite ou renove sua licença sanitária aqui.
          </span>
        </a>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="bg-card p-7 rounded-md hover:shadow-refined transition-shadow flex items-center gap-6 group border border-border border-l-2 border-l-primary hover:no-underline">
              <span className="text-foreground/90 text-sm md:text-base leading-relaxed flex-1 text-left">
                Material para <span className="font-semibold text-primary">download</span>: manuais e orientações.
              </span>
            </AccordionTrigger>
            <AccordionContent className="p-4">
              <MaterialsList />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

function ContactSection() {
  return (
    <div className="my-14 px-4 w-full">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-card border border-border border-t-2 border-t-accent rounded-md p-10 md:p-14 shadow-refined space-y-10 text-center">
          <p className="eyebrow text-muted-foreground">Fale conosco</p>
          <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-16">
            <a href="https://wa.me/5542935059222" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
              <div className="w-11 h-11 border border-border rounded-full flex items-center justify-center text-risk-baixo group-hover:border-risk-baixo transition-colors shrink-0">
                <MessageCircle className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-1">WhatsApp</p>
                <p className="font-medium text-foreground text-base md:text-lg whitespace-nowrap">(42) 93505 9222</p>
              </div>
            </a>
            <div className="hidden md:block w-px h-12 bg-border" />
            <div className="flex items-center gap-4 group w-full md:w-auto">
              <div className="w-11 h-11 border border-border rounded-full flex items-center justify-center text-primary group-hover:border-accent transition-colors shrink-0">
                <Mail className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-1">E-mail Institucional</p>
                <a href="mailto:devisat@prudentopolis.pr.gov.br" className="font-medium text-foreground text-sm md:text-lg block break-all md:break-normal hover:text-accent transition-colors">
                  devisat@prudentopolis.pr.gov.br
                </a>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "O que significa cada nível de risco (Baixo, Médio, Alto e Condicionado)?",
    a: "Baixo Risco dispensa o estabelecimento de licenciamento sanitário para iniciar as operações. Médio Risco permite licença sanitária simplificada, sem inspeção prévia. Alto Risco exige inspeção sanitária e/ou análise documental antes do início das atividades. Risco Condicionado depende das respostas a um questionário técnico sobre a infraestrutura e os processos de trabalho para ser definido como Baixo, Médio ou Alto."
  },
  {
    q: "O que é o Porte de Fiscalização (Porte I, II ou III)?",
    a: "É a indicação de quais municípios, conforme sua capacidade técnica e administrativa (Porte I, II ou III), são responsáveis por fiscalizar aquela atividade. Algumas atividades só podem ser fiscalizadas por municípios de Porte II e III, ou exclusivamente de Porte III, conforme a Deliberação CIB nº 85/2021."
  },
  {
    q: "O que é a exigência de Projeto Básico de Arquitetura (PBA)?",
    a: "É a aprovação prévia, pela Vigilância Sanitária, do projeto que descreve a estrutura física do estabelecimento, exigida antes do início das operações e em cada renovação de licença para determinadas atividades, conforme o art. 9º da Resolução SESA nº 1.034/2020."
  },
  {
    q: "Minha empresa tem vários CNAEs. Qual classificação de risco prevalece?",
    a: "Prevalece sempre o critério mais restritivo entre todos os CNAEs cadastrados no CNPJ. Se pelo menos uma atividade for de Alto Risco, o estabelecimento é classificado como Alto Risco, e assim sucessivamente."
  },
  {
    q: "Minha atividade não foi localizada na consulta. O que eu faço?",
    a: "Recomendamos consultar diretamente a Vigilância Sanitária do seu município para o enquadramento individualizado, já que a classificação segue o rol taxativo oficial da Resolução SESA nº 1.034/2020 e do Decreto Estadual nº 10.590/2025."
  },
  {
    q: "Esta consulta substitui a licença sanitária ou é um documento oficial?",
    a: "Não. O Agiliza Visa é uma ferramenta informativa e gratuita para orientar o empreendedor sobre a classificação de risco prevista em lei. A licença sanitária, quando exigida, deve ser solicitada junto à Vigilância Sanitária do município onde a empresa está estabelecida."
  },
  {
    q: "Como solicito ou renovo a licença sanitária do meu estabelecimento?",
    a: "Empresas localizadas em Prudentópolis-PR podem solicitar ou renovar a licença diretamente pelo link disponibilizado nesta página. Para outros municípios, procure a Vigilância Sanitária local."
  }
];

function FaqSection() {
  return (
    <div className="my-14 px-4 w-full">
      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="faq-root" className="border-none">
            <AccordionTrigger className="bg-card p-7 rounded-md hover:shadow-refined transition-shadow flex items-center gap-6 group border border-border border-l-2 border-l-primary hover:no-underline">
              <span className="flex-1 text-center space-y-1.5">
                <span className="eyebrow block text-muted-foreground">Dúvidas Frequentes</span>
                <span className="block text-foreground/90 text-sm md:text-base leading-relaxed">Perguntas e Respostas</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="p-4">
              <Accordion type="single" collapsible className="w-full space-y-3 mt-2">
                {FAQ_ITEMS.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-md bg-card overflow-hidden">
                    <AccordionTrigger className="px-6 py-5 hover:no-underline text-left text-sm md:text-base font-medium text-foreground/90 hover:text-primary transition-colors">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

export default function Home() {
  const db = useFirestore();
  const [data, setData] = useState<CompanyData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleString('pt-BR'));
  }, []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { cnpj: '' }
  });

  const result: RiskAnalysisResult | null = data ? analyzeRisk(data.cnaes || [], answers) : null;
  const currentTheme = result?.level ? (RISK_THEMES[result.level] || RISK_THEMES['NÃO ENCONTRADO']) : RISK_THEMES['NÃO ENCONTRADO'];

  const handleNewQuery = () => {
    setData(null);
    setAnswers({});
    setApiError(null);
    reset();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = (values: any) => {
    const cleanedCnpj = values.cnpj.replace(/\D/g, '');
    setApiError(null);
    setAnswers({});

    startTransition(async () => {
      try {
        if (db) {
          const docRef = doc(db, 'companies', cleanedCnpj);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const cached = docSnap.data() as CompanyData;
            if (cached && Array.isArray(cached.cnaes) && cached.cnaes.length > 0) {
              setData(cached);
              return;
            }
          }
        }

        const res = await fetchCnpjData(values.cnpj);
        if (res && res.success) {
          setData(res.data);
          if (db) {
            setDoc(doc(db, 'companies', cleanedCnpj), { ...res.data, updatedAt: serverTimestamp() }).catch(console.error);
            addDoc(collection(db, 'queries'), {
              cnpj: cleanedCnpj,
              timestamp: serverTimestamp(),
              riskLevel: analyzeRisk(res.data.cnaes, {}).level
            }).catch(console.error);
          }
        } else {
          setApiError(res?.error || "Sistema federal temporariamente indisponível.");
        }
      } catch (e) {
        setApiError("Erro técnico no processamento.");
        console.error(e);
      }
    });
  };

  return (
    <div className="min-h-screen relative font-sans">
      <TechBackground />
      <div className="max-w-6xl mx-auto px-4 py-14 md:py-24 space-y-14 relative z-10">
        {!data && (
          <header className="text-center space-y-8">
            <div className="flex flex-col items-center justify-center gap-5">
              <div className="relative w-16 h-20 md:w-20 md:h-24 bulb-flicker">
                <AgilizaMark className="w-full h-full" />
              </div>
              <div className="space-y-3">
                <h1 className="font-display text-5xl md:text-7xl text-foreground tracking-tight flex items-baseline justify-center gap-1">
                  <span>Agiliza</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">VISA</span>
                </h1>
                <div className="w-16 h-px bg-accent/50 mx-auto" />
              </div>
            </div>
            <p className="text-fluid-subtitle text-muted-foreground max-w-xl mx-auto leading-relaxed px-4">
              Consulte a classificação de risco sanitário de qualquer empresa no Paraná a partir do CNPJ.
            </p>
          </header>
        )}

        <main className="max-w-3xl mx-auto w-full">
          {!data ? (
            <div className="space-y-14">
              <Card className="p-8 md:p-16 bg-card border border-border rounded-md shadow-refined-lg overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
                {apiError && (
                  <div className="mb-10 pl-5 py-4 border-l-2 border-destructive bg-destructive/[0.04]">
                    <span className="error-text-technical text-destructive">{apiError}</span>
                  </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                  <div className="space-y-5 text-center">
                    <Label className="eyebrow block text-muted-foreground">
                      Informe o CNPJ
                    </Label>
                    <div className="relative">
                      <Input
                        {...register('cnpj')}
                        inputMode="numeric"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          e.target.value = val;
                          register('cnpj').onChange(e);
                        }}
                        placeholder="00.000.000/0000-00"
                        className="h-16 md:h-20 text-xl md:text-3xl text-center border border-input bg-background rounded-md font-mono font-semibold text-primary tracking-wider shadow-inner placeholder:text-muted-foreground/40"
                      />
                    </div>
                  </div>
                  {errors.cnpj && <p className="text-destructive text-xs font-medium text-center">{String(errors.cnpj.message)}</p>}
                  <button type="submit" disabled={isPending} className="w-full h-14 md:h-16 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-semibold text-[13px] md:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all shadow-refined active:scale-[0.99] disabled:opacity-50">
                    {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-4 h-4" />}
                    Consultar Risco Sanitário
                  </button>
                </form>
              </Card>

              <RiskClassificationMatrix />

              <SimpleCnaeQuery />

              <div className="bg-primary p-10 rounded-md flex flex-col md:flex-row items-center gap-8 shadow-refined-lg">
                <div className="p-3.5 border border-primary-foreground/20 rounded-full shrink-0">
                  <Megaphone className="w-7 h-7 text-primary-foreground" strokeWidth={1.5} />
                </div>
                <div className="space-y-1.5 text-center md:text-left">
                  <h3 className="font-display text-xl md:text-2xl text-primary-foreground">Atenção, empreendedor</h3>
                  <p className="text-primary-foreground/75 text-sm leading-relaxed">Mais de 900 atividades são dispensadas de licenciamento no Estado do Paraná.</p>
                </div>
              </div>
              <ContactSection />
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-500">
              <Card className={`overflow-hidden border border-border border-t-2 ${currentTheme.borderClass} bg-card rounded-md shadow-refined-lg`}>
                <div className={`${currentTheme.bgTintClass} py-14 px-8 text-center border-b border-border`}>
                  <p className={`eyebrow mb-4 ${currentTheme.textClass}`}>Classificação do Estabelecimento</p>
                  <h3 className={`font-display text-4xl md:text-6xl ${currentTheme.textClass} tracking-tight`}>
                    {result?.level === 'CONDICIONADO' ? 'Risco Condicionado' :
                     result?.level === 'NÃO ENCONTRADO' ? 'Atividade Não Localizada' :
                     currentTheme.label}
                  </h3>
                  {result?.porte && (
                    <div className={`mt-7 inline-flex p-3.5 px-5 rounded-sm border items-center justify-center gap-3 ${getPorteTheme(result.porte).bg} ${getPorteTheme(result.porte).border}`}>
                      {(() => {
                        const ThemeIcon = getPorteTheme(result.porte).icon;
                        return <ThemeIcon className={`w-4 h-4 ${getPorteTheme(result.porte).text}`} strokeWidth={1.75} />;
                      })()}
                      <p className={`text-[11px] font-semibold ${getPorteTheme(result.porte).text} uppercase tracking-[0.15em]`}>
                        Responsabilidade Fiscal: {result.porte}
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-6 md:p-14 space-y-12">
                  <div className="text-center space-y-3">
                    <h2 className="font-display text-xl md:text-2xl text-foreground tracking-tight">{data.razao_social}</h2>
                    <div className="inline-block px-4 py-1.5 border border-border rounded-sm">
                      <p className="text-primary font-mono text-sm md:text-lg font-medium tracking-widest">{data.cnpj}</p>
                    </div>
                  </div>

                  {result && (
                    <div className="relatorio-tecnico bg-secondary/60 p-6 md:p-10 rounded-md border border-border text-foreground/85 text-sm md:text-base">
                      {result.message.split(' ').map((word, i) =>
                        word === 'DISPENSADA' || word === 'SIMPLIFICADA' || word === 'INSPEÇÃO' ?
                        <span key={i} className="font-semibold text-primary">{word} </span> : word + ' '
                      )}
                    </div>
                  )}

                  {result?.requiresPba && (
                    <div className="p-7 bg-secondary/60 border border-border rounded-md space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 border border-border rounded-full shrink-0">
                          <AlertTriangle className="w-4 h-4 text-destructive" strokeWidth={1.75} />
                        </div>
                        <div className="space-y-2 flex-1">
                          <p className="eyebrow text-muted-foreground">Exigência de Projeto Básico de Arquitetura (PBA)</p>
                          <p className="text-sm md:text-base text-foreground/90 leading-snug">
                            Esta atividade está sujeita à aprovação prévia de Projeto Básico de Arquitetura pela Vigilância Sanitária, antes do início das operações e nas renovações da licença, conforme o art. 9º da Resolução SESA nº 1.034/2020. A dispensa dessa aprovação, quando aplicável, não isenta o estabelecimento de construir e manter a estrutura física nos termos da legislação vigente.
                          </p>
                          {result.pbaNotes.length > 0 && (
                            <ul className="space-y-1.5 pt-1">
                              {result.pbaNotes.map((note, i) => (
                                <li key={i} className="text-[13px] text-muted-foreground leading-relaxed flex gap-2">
                                  <span className="text-destructive">•</span> {note}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {result?.specialProjectNotes && result.specialProjectNotes.length > 0 && (
                    <div className="p-7 bg-secondary/60 border border-border rounded-md space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 border border-border rounded-full shrink-0">
                          <AlertCircle className="w-4 h-4 text-primary" strokeWidth={1.75} />
                        </div>
                        <div className="space-y-2 flex-1">
                          <p className="eyebrow text-muted-foreground">Exigência de Projeto Específico</p>
                          <ul className="space-y-1.5">
                            {result.specialProjectNotes.map((note, i) => (
                              <li key={i} className="text-sm text-foreground/90 leading-snug flex gap-2">
                                <span className="text-primary">•</span> {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {result?.porteNotes && result.porteNotes.length > 0 && (
                    <div className="p-7 bg-secondary/60 border border-border rounded-md space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 border border-border rounded-full shrink-0">
                          <HelpCircle className="w-4 h-4 text-primary" strokeWidth={1.75} />
                        </div>
                        <div className="space-y-2 flex-1">
                          <p className="eyebrow text-muted-foreground">Observação sobre o Porte de Fiscalização</p>
                          <ul className="space-y-1.5">
                            {result.porteNotes.map((note, i) => (
                              <li key={i} className="text-sm text-foreground/90 leading-snug flex gap-2">
                                <span className="text-primary">•</span> {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                       <h4 className="eyebrow whitespace-nowrap text-muted-foreground">Detalhamento CNAE</h4>
                       <div className="rule-hairline flex-1"></div>
                    </div>
                    <div className="numbered-list divide-y divide-border border-t border-border">
                      {(data.cnaes || []).map((c, idx) => {
                        const cnaeRes = resolveCnaeRisk(c.code, answers);
                        const cnaeTheme = RISK_THEMES[cnaeRes.risk] || RISK_THEMES['NÃO ENCONTRADO'];
                        return (
                          <div key={`${c.code}-${idx}`} className="numbered-item py-7 flex flex-col md:flex-row md:items-start justify-between gap-5">
                              <div className="flex gap-4 flex-1">
                                <div className="space-y-2 flex-1">
                                  <code className="text-[11px] font-medium text-primary bg-secondary px-2.5 py-1 rounded-sm">{c.code}</code>
                                  <p className="text-sm md:text-base text-foreground/90 leading-snug">{c.description}</p>
                                  {cnaeRes.porte && (
                                    <div className={`mt-2 p-2.5 px-3.5 rounded-sm border inline-flex items-center gap-2.5 w-fit ${getPorteTheme(cnaeRes.porte).bg} ${getPorteTheme(cnaeRes.porte).border}`}>
                                      {(() => {
                                        const ThemeIcon = getPorteTheme(cnaeRes.porte).icon;
                                        return <ThemeIcon className={`w-3.5 h-3.5 ${getPorteTheme(cnaeRes.porte).text}`} strokeWidth={1.75} />;
                                      })()}
                                      <p className={`text-[10px] font-medium ${getPorteTheme(cnaeRes.porte).text} uppercase tracking-wider`}>
                                        Fiscalização: {cnaeRes.porte}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            <div className="flex md:justify-end shrink-0">
                              <RiskBadge level={cnaeRes.risk} />
                            </div>
                            {cnaeRes.risk === 'CONDICIONADO' && cnaeRes.path && (
                              <div className="w-full mt-2 p-6 bg-secondary/60 rounded-sm space-y-5 border border-border">
                                <p className="text-muted-foreground text-[13px] leading-snug">{cnaeRes.question}</p>
                                <RadioGroup value={answers[cnaeRes.path] || ""} onValueChange={(v) => setAnswers(prev => ({ ...prev, [cnaeRes.path!]: v }))} className="flex gap-8">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Sim" id={`${cnaeRes.path}-sim`} className="h-4 w-4 border-primary" />
                                    <Label htmlFor={`${cnaeRes.path}-sim`} className="text-foreground text-sm cursor-pointer">Sim</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Não" id={`${cnaeRes.path}-nao`} className="h-4 w-4 border-primary" />
                                    <Label htmlFor={`${cnaeRes.path}-nao`} className="text-foreground text-sm cursor-pointer">Não</Label>
                                  </div>
                                </RadioGroup>
                              </div>
                            )}
                          </div>
                      );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-7 pt-8 border-t border-border">
                    <p className="text-[11px] text-muted-foreground tracking-wide">Relatório emitido em {currentDate}</p>
                    <button onClick={handleNewQuery} className="h-12 px-8 rounded-sm border border-border text-muted-foreground text-[11px] uppercase tracking-[0.15em] hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5" /> Efetuar Nova Pesquisa
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </main>
        <FaqSection />
        <footer className="text-center pt-14 border-t border-border pb-8 space-y-4">
          <p className="text-[11px] text-muted-foreground tracking-wide">
            O Agiliza Visa é um projeto desenvolvido sem qualquer finalidade comercial ou lucrativa.
          </p>
        </footer>
      </div>
    </div>
  );
}
