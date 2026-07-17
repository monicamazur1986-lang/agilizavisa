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
    text: 'text-red-700', 
    bg: 'bg-red-50', 
    border: 'border-red-200',
    icon: AlertTriangle,
    label: 'Alta Complexidade'
  },
  'Porte II e III': { 
    text: 'text-amber-700', 
    bg: 'bg-amber-50', 
    border: 'border-amber-200',
    icon: AlertCircle,
    label: 'Média Complexidade'
  },
  'Porte I, II e III': { 
    text: 'text-emerald-700', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-200',
    icon: CheckCircle2,
    label: ''
  }
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
    <Card className="p-8 md:p-12 bg-[#fffdf0] border border-amber-100 rounded-[3rem] shadow-2xl overflow-hidden relative mt-12">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center justify-center gap-3">
            <Search className="w-6 h-6 text-blue-600" />
            Consulta Prévia por CNAE
          </h3>
          <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
            Descubra o risco e o porte antes de abrir sua empresa
          </p>
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
              className="h-16 text-xl md:text-2xl text-center border-2 border-slate-200 bg-white rounded-2xl font-mono font-black text-blue-700 focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-200 shadow-inner"
            />
          </div>
          <Button
            onClick={handleSearch}
            className="h-16 px-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg shadow-blue-500/20 w-full md:w-auto"
          >
            Consultar
          </Button>
        </div>

        {result && result.risk !== 'NÃO ENCONTRADO' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Grau de Risco</span>
                  <HelpCircle className="w-4 h-4 text-slate-300" />
                </div>
                <div className="text-center py-2">
                  <p className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-800">
                    {result.risk}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 font-bold text-center leading-relaxed italic">
                  {result.risk === 'BAIXO' && "Dispensa licenciamento sanitário"}
                  {result.risk === 'MEDIO' && "Licenciamento simplificado (Nível II)."}
                  {result.risk === 'ALTO' && "Exige inspeção e projeto prévio (Nível III)."}
                </p>
              </div>

              <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${PORTE_THEMES[result.porte]?.bg || 'bg-slate-50'} ${PORTE_THEMES[result.porte]?.border || 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${PORTE_THEMES[result.porte]?.text || 'text-slate-400'}`}>
                    Porte de Fiscalização
                  </span>
                  {(() => {
                    const ThemeIcon = PORTE_THEMES[result.porte]?.icon || CheckCircle2;
                    return <ThemeIcon className={`w-4 h-4 ${PORTE_THEMES[result.porte]?.text || 'text-slate-300'}`} />;
                  })()}
                </div>
                <div className="text-center py-2">
                  <p className={`text-2xl md:text-3xl font-black uppercase tracking-tighter ${PORTE_THEMES[result.porte]?.text || 'text-slate-800'}`}>
                    {result.porte}
                  </p>
                  {PORTE_THEMES[result.porte]?.label && (
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 opacity-80 ${PORTE_THEMES[result.porte]?.text || 'text-slate-600'}`}>
                      {PORTE_THEMES[result.porte]?.label}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {result.risk === 'CONDICIONADO' && result.path && (
              <div className="p-8 bg-blue-50 border border-blue-100 rounded-3xl space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Questionário de Autodeclaração</p>
                    <p className="text-sm md:text-base font-black text-blue-950 uppercase leading-tight">{result.question}</p>
                  </div>
                </div>
                <RadioGroup 
                  value={answers[result.path] || ""} 
                  onValueChange={(v) => {
                    const nextAnswers = { ...answers, [result.path!]: v };
                    setAnswers(nextAnswers);
                    handleSearch(nextAnswers);
                  }} 
                  className="flex gap-12"
                >
                  <div className="flex items-center space-x-3 bg-white px-6 py-3 rounded-2xl border border-blue-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all">
                    <RadioGroupItem value="Sim" id="pre-sim" className="h-5 w-5 border-blue-600" />
                    <Label htmlFor="pre-sim" className="font-black text-blue-900 text-sm cursor-pointer">SIM</Label>
                  </div>
                  <div className="flex items-center space-x-3 bg-white px-6 py-3 rounded-2xl border border-blue-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all">
                    <RadioGroupItem value="Não" id="pre-nao" className="h-5 w-5 border-blue-600" />
                    <Label htmlFor="pre-nao" className="font-black text-blue-900 text-sm cursor-pointer">NÃO</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={reset} 
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-2xl px-12 py-6 h-auto text-xs font-black uppercase tracking-widest transition-all"
              >
                Nova Consulta
              </Button>
            </div>
          </div>
        )}

        {result && result.risk === 'NÃO ENCONTRADO' && (
          <div className="p-8 bg-rose-50 border border-rose-100 rounded-3xl text-center space-y-4 animate-in shake-in duration-300">
            <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-rose-900 font-black text-lg uppercase">CNAE não localizado</p>
              <p className="text-rose-600 font-bold text-xs uppercase tracking-tight">Verifique o código ou consulte a vigilância local.</p>
            </div>
            <Button onClick={reset} variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-100 uppercase text-[10px] font-black">Tentar Novamente</Button>
          </div>
        )}

        <div className="pt-10 border-t border-slate-100 space-y-6">
          <div className="flex items-center gap-4">
             <div className="h-px bg-slate-200 w-full"></div>
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] whitespace-nowrap">Nota Explicativa</span>
             <div className="h-px bg-slate-200 w-full"></div>
          </div>
          
          <div className="bg-blue-50/50 p-8 md:p-12 rounded-[2.5rem] border border-blue-100 shadow-sm">
            <p className="text-sm md:text-base font-medium text-slate-700 leading-relaxed text-center max-w-2xl mx-auto">
              O porte de cada município (I, II ou III) pode variar de acordo com a sua capacidade técnica e administrativa. 
              Consulte a classificação do seu município no documento oficial abaixo:
            </p>
            <div className="flex justify-center mt-8">
              <a 
                href="https://conselho.saude.pr.gov.br/sites/ces/arquivos_restritos/files/migrados/File/Demonstracao_porte_municipios_pr.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-blue-600 px-8 py-4 rounded-full text-xs font-black text-white uppercase tracking-widest hover:bg-blue-700 hover:scale-105 transition-all shadow-xl shadow-blue-500/20"
              >
                <HelpCircle className="w-4 h-4" />
                Consultar Porte dos Municípios
              </a>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
