'use client';

/**
 * @fileOverview AgilizaVISA – PARANÁ – VERSÃO CONSOLIDADA PARA PUBLICAÇÃO DEFINITIVA.
 * RESOLUÇÃO SESA Nº 1034/2020 | DECRETO ESTADUAL Nº 10.590/2025.
 */

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, RotateCcw, Loader2, ArrowRight, Megaphone, MessageCircle, Mail, FileText, Image as ImageIcon, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import newLogo from '../assets/images/logo_large_transparent_1783604980775.jpg';
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
import { FloatingMaterialsIcon } from '@/components/FloatingMaterialsIcon';
import { useFirestore } from '@/firebase'; 
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { CompanyData, RiskAnalysisResult } from '@/lib/types';

const schema = z.object({
  cnpj: z.string().min(1, "DIGITE O CNPJ").refine(val => val.replace(/\D/g, '').length === 14, "O CNPJ DEVE TER 14 NÚMEROS")
});

function TechBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-slate-50">
      {/* Light Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-blue-50/30 to-white/90"></div>
      
      {/* Circuit Pattern - Radial Nodes */}
      <div className="absolute inset-0"
           style={{
             backgroundImage: `
               radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 25%),
               radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 25%),
               linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
               linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
             `,
             backgroundSize: '100px 100px, 100px 100px, 40px 40px, 40px 40px'
           }}></div>

      {/* Subtle light beams */}
      <div className="absolute top-0 left-[20%] w-[1px] h-full bg-gradient-to-b from-transparent via-blue-200/50 to-transparent"></div>
      <div className="absolute top-0 right-[20%] w-[1px] h-full bg-gradient-to-b from-transparent via-blue-200/50 to-transparent"></div>
    </div>
  );
}

function LogoGraphic({ className }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-[#3F51B5] blur-xl opacity-20 rounded-full"></div>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 w-full h-full drop-shadow-md">
        <path d="M50 5L56 12L64 10L68 18L77 18L79 26L87 29L86 37L92 42L88 50L92 58L86 63L87 71L79 74L77 82L68 82L64 90L56 88L50 95L44 88L36 90L32 82L23 82L21 74L13 71L14 63L8 58L12 50L8 42L14 37L13 29L21 26L23 18L32 18L36 10L44 12L50 5Z" fill="#3F51B5" />
        <circle cx="45" cy="45" r="18" stroke="white" strokeWidth="5" />
        <line x1="58" y1="58" x2="72" y2="72" stroke="white" strokeWidth="7" strokeLinecap="round" />
        <path d="M36 45L42 51L55 37" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const RISK_THEMES: Record<string, { gradient: string; text: string; label: string; }> = {
  'BAIXO': { gradient: 'from-emerald-100 to-emerald-300', text: 'text-slate-950', label: 'Baixo Risco' },
  'MEDIO': { gradient: 'from-orange-100 to-orange-300', text: 'text-slate-950', label: 'Médio Risco' },
  'ALTO': { gradient: 'from-red-100 to-red-300', text: 'text-slate-950', label: 'Alto Risco' },
  'CONDICIONADO': { gradient: 'from-blue-100 to-blue-300', text: 'text-slate-950', label: 'Risco Condicionado' },
};

const PORTE_THEMES: Record<string, { text: string; bg: string; border: string; icon: any; }> = {
  'Porte III': { 
    text: 'text-red-700', 
    bg: 'bg-red-50', 
    border: 'border-red-200',
    icon: AlertTriangle
  },
  'Porte II e III': { 
    text: 'text-amber-700', 
    bg: 'bg-amber-50', 
    border: 'border-amber-200',
    icon: AlertCircle
  },
  'Porte I, II e III': { 
    text: 'text-emerald-700', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-200',
    icon: CheckCircle2
  }
};

const getPorteTheme = (porte?: string) => {
  if (!porte) return PORTE_THEMES['Porte I, II e III'];
  return PORTE_THEMES[porte] || PORTE_THEMES['Porte I, II e III'];
};

function RiskClassificationMatrix() {
  return (
    <div className="mt-12 mb-20 px-4 space-y-8">
      <div className="text-center space-y-4">
         <h2 className="text-slate-900 font-black text-3xl md:text-4xl tracking-tight leading-tight uppercase">
          Classificação de Risco Sanitário - Como Funciona?
        </h2>
        <p className="text-slate-600 font-bold max-w-xl mx-auto">
          Entenda o nível de exigência sanitária necessário para o funcionamento da sua atividade, conforme estabelecido pela Resolução SESA nº 1.034/2020 e pelo Decreto Estadual nº 11.063, de 29 de agosto de 2025, do Paraná.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 animate-in fade-in duration-1000">
        {Object.entries(RISK_THEMES).map(([key, theme]) => (
          <div key={key} className={`bg-gradient-to-br ${theme.gradient} ${theme.text} p-10 flex flex-col gap-6 transition-all hover:scale-[1.01] cursor-pointer border border-slate-950/20`}>
            <span className="font-black text-xl tracking-tight leading-tight text-center">{theme.label}</span>
            
            <p className="text-xs font-bold leading-relaxed opacity-95 text-justify flex-grow">
              {key === 'BAIXO' && "Atividade econômica dispensada de licenciamento sanitário para funcionamento."}
              {key === 'MEDIO' && "Licença sanitária emitida de forma simplificada, sem inspeção prévia."}
              {key === 'ALTO' && "Exige inspeção sanitária e análise documental prévia à operação."}
              {key === 'CONDICIONADO' && "Definido após respostas a questionário específico sobre a atividade."}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto pt-10">
          <a href="https://www.saude.pr.gov.br/Pagina/Licenciamento-Sanitario" target="_blank" className="bg-white p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all flex items-center justify-between group border-l-8 border-[#3F51B5] gap-6">
            <span className="text-slate-800 font-bold text-sm md:text-lg leading-relaxed tracking-tight flex-1">
              Acesse o <span className="font-black text-[#3F51B5]">SITE</span> oficial da Secretaria de Estado da Saúde do Paraná (SESA) para conferir o acervo completo da legislação sanitária no Estado.
            </span>
            <div className="w-12 h-12 bg-[#3F51B5] rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform shrink-0">
              <ArrowRight className="w-6 h-6" />
            </div>
          </a>
          <a href="https://prudentopolisprscp.equiplano.com.br:5028/tramitacaoProcesso/#/abertura-processo/entidade/41dd0a3a-f16f-4e8f-9b2a-8832e9191835/28" target="_blank" className="bg-white p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all flex items-center gap-6 group border-l-8 border-[#3F51B5]">
            <div className="w-12 h-12 bg-[#3F51B5] rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform shrink-0">
              <ArrowRight className="w-6 h-6" />
            </div>
            <span className="text-slate-800 font-bold text-sm md:text-lg leading-relaxed tracking-tight flex-1">
              Empresas em <span className="font-black text-[#3F51B5]">Prudentópolis – PR</span>: Solicite ou renove sua licença sanitária aqui.
            </span>
          </a>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-none">
              <AccordionTrigger className="bg-white p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all flex items-center gap-6 group border-l-8 border-[#3F51B5] hover:no-underline">
                <span className="text-slate-800 font-bold text-sm md:text-lg leading-relaxed tracking-tight flex-1 text-left">
                  Material para <span className="font-black text-[#3F51B5]">DOWNLOAD</span>: Manuais e orientações.
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
    <div className="my-12 px-4 w-full">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white border-t-4 border-[#3F51B5] rounded-[2rem] p-8 md:p-12 shadow-xl space-y-10 text-center">
          <h4 className="font-black text-[#3F51B5] text-xs tracking-[0.3em] uppercase">FALE CONOSCO</h4>
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
            <a href="https://wa.me/5542935059222" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group transition-all">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-all">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">WhatsApp</p>
                <p className="font-black text-slate-700 text-base md:text-lg tracking-tight">(42) 93505 9222</p>
              </div>
            </a>
            <div className="flex items-center gap-4 group transition-all w-full md:w-auto">
              <div className="p-3 bg-blue-50 rounded-xl text-[#3F51B5] group-hover:scale-110 transition-all">
                <Mail className="w-7 h-7" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">E-mail Institucional</p>
                <a href="mailto:devisat@prudentopolis.pr.gov.br" className="font-black text-slate-700 text-xs md:text-lg tracking-tight block break-all md:break-normal">
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
          setApiError(res?.error || "SISTEMA FEDERAL TEMPORARIAMENTE INDISPONÍVEL.");
        }
      } catch (e) {
        setApiError("ERRO TÉCNICO NO PROCESSAMENTO.");
        console.error(e);
      }
    });
  };

  return (
    <div className="min-h-screen relative font-sans">
      <FloatingMaterialsIcon />
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 space-y-12 relative z-10">
        {!data && (
          <header className="text-center animate-in fade-in duration-1000 space-y-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <Image src={newLogo} alt="Agiliza VISA Logo" width={300} height={300} className="w-24 h-24 md:w-48 md:h-48 object-contain" referrerPolicy="no-referrer" />
              <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase flex items-baseline justify-center">
                <span className="text-slate-900">Agiliza</span><span className="text-4xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-tr from-cyan-400 via-blue-500 to-blue-300 font-black">VISA</span>
              </h1>
            </div>
            <p className="text-fluid-subtitle text-slate-600 font-bold max-w-2xl mx-auto leading-relaxed px-4 uppercase">
              CONSULTE A CLASSIFICAÇÃO DE RISCO SANITÁRIO DE QUALQUER EMPRESA NO PARANÁ PELO CNPJ.
            </p>
          </header>
        )}

        <main className="max-w-4xl mx-auto w-full">
          {!data ? (
            <div className="space-y-12">
              <Card className="p-8 md:p-20 bg-white border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden relative">
                {apiError && (
                  <div className="mb-10 p-6 bg-rose-50 border-l-4 border-rose-500 rounded-2xl shadow-sm">
                    <span className="error-text-technical text-rose-700 text-xs">{apiError}</span>
                  </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
                  <div className="space-y-6 text-center">
                    <div className="space-y-2">
                      <Label className="font-black text-xs md:text-sm text-slate-700 tracking-[0.5em] block uppercase mb-4">
                        Informe o CNPJ
                      </Label>
                      <div className="relative group">
                        <Input 
                          {...register('cnpj')} 
                          inputMode="numeric"
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            e.target.value = val;
                            register('cnpj').onChange(e);
                          }}
                          placeholder="00.000.000/0000-00" 
                          className="h-20 md:h-28 text-2xl md:text-4xl text-center border-2 border-slate-200 bg-white rounded-[2rem] font-mono font-black text-indigo-700 focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/10 shadow-inner transition-all placeholder:text-slate-300 hover:border-slate-300" 
                        />
                      </div>
                    </div>
                    {errors.cnpj && <p className="text-rose-600 text-[11px] font-black uppercase tracking-wider animate-bounce">{String(errors.cnpj.message).toUpperCase()}</p>}
                  </div>
                  <button type="submit" disabled={isPending} className="w-full h-16 md:h-20 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:shadow-[0_10px_30px_rgba(79,70,229,0.3)] text-white rounded-[1.5rem] font-black text-lg md:text-xl flex items-center justify-center transition-all shadow-xl active:scale-95 disabled:opacity-50 uppercase">
                    {isPending ? <Loader2 className="animate-spin mr-3 w-6 h-6" /> : <Search className="mr-3 w-6 h-6" />}
                    Consultar Risco Sanitário
                  </button>
                </form>
              </Card>

              <RiskClassificationMatrix />
              
              <SimpleCnaeQuery />
              
              <div className="bg-[#3F51B5] p-10 rounded-[2.5rem] border border-blue-400 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-sm">
                  <Megaphone className="w-12 h-12 text-white -rotate-12" />
                </div>
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">ATENÇÃO EMPREENDEDOR!</h3>
                  <p className="text-blue-100 font-bold text-xs md:text-sm uppercase tracking-wide opacity-90">MAIS DE 900 ATIVIDADES SÃO DISPENSADAS DE LICENCIAMENTO NO ESTADO DO PARANÁ.</p>
                </div>
              </div>
              <ContactSection />
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
              <Card className={`overflow-hidden border-t-8 ${currentTheme.border} bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl`}>
                <div className={`${currentTheme.bg} py-12 px-8 text-center ${currentTheme.border}`}>
                  <p className={`text-[9px] font-black ${currentTheme.text} tracking-[0.4em] mb-4 uppercase`}>Classificação do Estabelecimento</p>
                  <h3 className={`text-4xl md:text-6xl lg:text-7xl font-black ${currentTheme.text} tracking-tighter uppercase leading-tight`}>
                    {result?.level === 'CONDICIONADO' ? 'Risco Condicionado' : 
                     result?.level === 'NÃO ENCONTRADO' ? 'Atividade Não Localizada' : 
                     `${result?.level || 'SEM'} Risco Sanitário`}
                  </h3>
                  {result?.porte && (
                    <div className={`mt-6 p-4 rounded-2xl border flex items-center justify-center gap-3 ${getPorteTheme(result.porte).bg} ${getPorteTheme(result.porte).border}`}>
                      {(() => {
                        const ThemeIcon = getPorteTheme(result.porte).icon;
                        return <ThemeIcon className={`w-5 h-5 ${getPorteTheme(result.porte).text}`} />;
                      })()}
                      <p className={`text-[10px] md:text-xs font-black ${getPorteTheme(result.porte).text} uppercase tracking-wider`}>
                        Responsabilidade Fiscal: {result.porte}
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-6 md:p-12 space-y-12">
                  <div className="text-center space-y-3">
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">{data.razao_social}</h2>
                    <div className="inline-block px-5 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                      <p className="text-indigo-700 font-mono text-base md:text-xl font-bold tracking-widest">{data.cnpj}</p>
                    </div>
                  </div>
                  
                  {result && (
                    <div className="relatorio-tecnico bg-slate-50 p-6 md:p-10 rounded-[1.5rem] border border-slate-200 text-slate-700 text-xs md:text-lg shadow-inner uppercase">
                      {result.message.split(' ').map((word, i) => 
                        word === 'DISPENSADA' || word === 'SIMPLIFICADA' || word === 'INSPEÇÃO' ? 
                        <span key={i} className="font-black text-indigo-700">{word} </span> : word + ' '
                      )}
                    </div>
                  )}

                  {result?.requiresPba && (
                    <div className="p-6 bg-rose-50 border border-rose-200 rounded-[1.5rem] text-center space-y-3">
                      <p className="font-black text-rose-800 text-base uppercase">⚠️ Exigência de Projeto (PBA)</p>
                      <p className="text-rose-600/80 font-bold text-[10px] uppercase tracking-wide">REQUER APROVAÇÃO PRÉVIA DE PROJETO BÁSICO DE ARQUITETURA ANTES DA LICENÇA.</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                       <h4 className="font-black text-slate-400 text-[10px] tracking-widest whitespace-nowrap uppercase">Detalhamento CNAE</h4>
                       <div className="h-px bg-slate-200 w-full"></div>
                    </div>
                    <div className="grid gap-3">
                      {(data.cnaes || []).map((c, idx) => {
                        const cnaeRes = resolveCnaeRisk(c.code, answers);
                        const cnaeTheme = RISK_THEMES[cnaeRes.risk] || RISK_THEMES['NÃO ENCONTRADO'];
                        return (
                          <div key={`${c.code}-${idx}`} className={`p-5 md:p-8 rounded-[1.5rem] border ${cnaeTheme.border} bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm`}>
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <code className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">{c.code}</code>
                                </div>
                                <p className="text-xs md:text-base text-slate-800 font-extrabold uppercase">{c.description}</p>
                                {cnaeRes.porte && (
                                  <div className={`mt-2 p-3 rounded-xl border flex items-center gap-3 w-fit ${getPorteTheme(cnaeRes.porte).bg} ${getPorteTheme(cnaeRes.porte).border}`}>
                                    {(() => {
                                      const ThemeIcon = getPorteTheme(cnaeRes.porte).icon;
                                      return <ThemeIcon className={`w-4 h-4 ${getPorteTheme(cnaeRes.porte).text}`} />;
                                    })()}
                                    <p className={`text-[9px] font-black ${getPorteTheme(cnaeRes.porte).text} uppercase italic`}>
                                      Responsabilidade de fiscalização: {cnaeRes.porte}
                                    </p>
                                  </div>
                                )}
                              </div>
                            <div className="flex justify-end">
                              <RiskBadge level={cnaeRes.risk} />
                            </div>
                            {cnaeRes.risk === 'CONDICIONADO' && cnaeRes.path && (
                              <div className="w-full mt-4 p-6 bg-slate-50 rounded-xl space-y-5 border border-slate-200">
                                <p className="font-black text-slate-500 text-[10px] uppercase tracking-widest leading-snug">{cnaeRes.question}</p>
                                <RadioGroup value={answers[cnaeRes.path] || ""} onValueChange={(v) => setAnswers(prev => ({ ...prev, [cnaeRes.path!]: v }))} className="flex gap-8">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Sim" id={`${cnaeRes.path}-sim`} className="h-5 w-5 border-indigo-700" />
                                    <Label htmlFor={`${cnaeRes.path}-sim`} className="font-black text-slate-800 text-xs cursor-pointer">SIM</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Não" id={`${cnaeRes.path}-nao`} className="h-5 w-5 border-indigo-700" />
                                    <Label htmlFor={`${cnaeRes.path}-nao`} className="font-black text-slate-800 text-xs cursor-pointer">NÃO</Label>
                                  </div>
                                </RadioGroup>
                              </div>
                            )}
                          </div>
                      );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-8 pt-8 border-t border-slate-200">
                    <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase">Relatório Emitido: {currentDate}</p>
                    <button onClick={handleNewQuery} className="h-14 px-10 rounded-full border-2 border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:border-indigo-700 hover:text-indigo-700 transition-all flex items-center justify-center active:scale-95">
                      <RotateCcw className="mr-2 w-4 h-4" /> Efetuar Nova Pesquisa
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </main>
        <footer className="text-center pt-12 border-t border-slate-100 pb-8 space-y-4">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            O Agiliza Visa é um projeto desenvolvido sem qualquer finalidade comercial ou lucrativa.
          </p>
        </footer>
      </div>
    </div>
  );
}
