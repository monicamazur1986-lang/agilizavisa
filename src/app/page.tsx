'use client';

/**
 * @fileOverview AgilizaVISA – PARANÁ – VERSÃO CONSOLIDADA PARA PUBLICAÇÃO DEFINITIVA.
 * RESOLUÇÃO SESA Nº 1034/2020 | DECRETO ESTADUAL Nº 10.590/2025.
 */

import { useState, useTransition, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, RotateCcw, Loader2, ArrowRight, Megaphone, MessageCircle, FileText, AlertTriangle, AlertCircle, CheckCircle2, HelpCircle, ShieldCheck, Flame, Building2 } from 'lucide-react';
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
import { BombeirosPanel } from '@/components/BombeirosPanel';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
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

/**
 * Traduz o nível de risco sanitário na resposta objetiva que o empresário procura:
 * precisa ou não da licença. O nível técnico (Nível I/II/III) continua exibido acima,
 * mas sozinho ele não responde a pergunta prática.
 */
const VISA_VEREDITOS: Record<string, { headline: string; detail: string; icon: any }> = {
  'BAIXO': {
    headline: 'Dispensada de licença sanitária',
    detail: 'O estabelecimento pode iniciar as operações sem licenciamento prévio, observadas as normas sanitárias vigentes.',
    icon: CheckCircle2,
  },
  'MEDIO': {
    headline: 'Exige licença sanitária',
    detail: 'Emissão simplificada, sem inspeção prévia: as operações podem começar logo após o licenciamento.',
    icon: AlertCircle,
  },
  'ALTO': {
    headline: 'Exige licença sanitária',
    detail: 'Com inspeção sanitária e/ou análise documental prévias ao início das atividades.',
    icon: AlertTriangle,
  },
  'CONDICIONADO': {
    headline: 'Depende das respostas abaixo',
    detail: 'Responda ao questionário no detalhamento CNAE para definir a exigência.',
    icon: HelpCircle,
  },
  'NÃO ENCONTRADO': {
    headline: 'Consulte a Vigilância Sanitária municipal',
    detail: 'Atividade não localizada no rol oficial: o enquadramento precisa ser individualizado.',
    icon: HelpCircle,
  },
};

const getVisaVeredito = (level?: string) => (level ? VISA_VEREDITOS[level] : undefined);

/**
 * A assinatura da página. A marca do portal é uma lâmpada, então cada licença é uma
 * luz: apagadas, dizem o que ainda não se sabe sobre o negócio; a consulta acende.
 */
function LampPanel({ acesa = false, className = '' }: { acesa?: boolean; className?: string }) {
  const LUZES = ['Vigilância Sanitária', 'Corpo de Bombeiros', 'Alvará de localização'];
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-7 ${className}`}>
      {LUZES.map((luz, i) => (
        <div key={luz} className="flex items-center gap-2.5">
          {/* Durante a consulta as luzes acendem em sequência: é a espera virando resposta. */}
          <span
            className={`lamp shrink-0 ${acesa ? 'lamp-on' : ''}`}
            style={acesa ? { animationDelay: `${i * 180}ms` } : undefined}
            aria-hidden="true"
          />
          <span className={`text-[11px] font-medium uppercase tracking-[0.16em] transition-colors ${acesa ? 'text-white/80' : 'text-white/45'}`}>
            {luz}
            {i === 2 && <span className="text-white/25"> · em breve</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Os três passos são uma sequência real da consulta, por isso vão numerados. */
const PASSOS = [
  {
    titulo: 'Informe o CNPJ',
    texto: 'A consulta puxa da Receita Federal a razão social, a situação cadastral e todos os CNAEs registrados no seu negócio.',
  },
  {
    titulo: 'Responda o que for perguntado',
    texto: 'Algumas atividades só se definem pelo caso concreto: área do imóvel, lotação, uso de gás. Você responde e a classificação se ajusta na hora.',
  },
  {
    titulo: 'Veja o que falta para abrir',
    texto: 'O veredito sai por órgão, com a base legal de cada exigência — e você decide se quer consultar também o Corpo de Bombeiros.',
  },
];

function ComoFunciona() {
  return (
    <div className="px-4 space-y-10">
      <div className="max-w-2xl space-y-4">
        <p className="eyebrow text-sinal">Como funciona</p>
        <h2 className="font-display text-3xl md:text-[2.75rem] text-foreground leading-[1.05]">
          Três passos, nenhum cadastro
        </h2>
      </div>

      <div className="grid gap-px bg-border md:grid-cols-3 rounded-md overflow-hidden border border-border">
        {PASSOS.map((passo, i) => (
          <div key={passo.titulo} className="bg-card p-8 space-y-4">
            <span className="font-mono text-sm font-semibold text-sinal">
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="font-display text-xl text-foreground leading-tight">{passo.titulo}</p>
            <p className="text-sm text-foreground/70 leading-relaxed">{passo.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * As frentes de licenciamento cobertas pelo portal. O alvará de localização ainda
 * não está implementado e aparece marcado como "em breve" — nunca como consulta ativa.
 */
const LICENSING_TRACKS = [
  {
    icon: ShieldCheck,
    accentText: 'text-primary',
    accentBorder: 'border-t-primary',
    accentTint: 'bg-primary/10',
    eyebrow: 'Vigilância Sanitária',
    title: 'A empresa precisa de licença sanitária?',
    description:
      'Classificação de risco de cada CNAE, porte de fiscalização do município e exigência de projeto, pela Resolução SESA nº 1.034/2020 e pelo Decreto Estadual nº 10.590/2025.',
    status: null as string | null,
  },
  {
    icon: Flame,
    accentText: 'text-risk-alto',
    accentBorder: 'border-t-risk-alto',
    accentTint: 'bg-risk-alto/10',
    eyebrow: 'Corpo de Bombeiros',
    title: 'A empresa precisa de licença do CBMPR?',
    description:
      'Enquadramento nos anexos da Portaria do Comando-Geral nº 476/2025 e as perguntas que definem se o estabelecimento é dispensado ou obrigado ao licenciamento.',
    status: null as string | null,
  },
  {
    icon: Building2,
    accentText: 'text-muted-foreground',
    accentBorder: 'border-t-border',
    accentTint: 'bg-muted',
    eyebrow: 'Prefeitura',
    title: 'Alvará de localização e funcionamento',
    description:
      'A verificação da exigência de alvará municipal está em desenvolvimento e passará a sair na mesma consulta, junto das demais licenças.',
    status: 'Em breve',
  },
];

function LicensingScope() {
  return (
    <div className="px-4 space-y-10">
      <div className="max-w-2xl space-y-4">
        <p className="eyebrow text-sinal">O que você descobre</p>
        <h2 className="font-display text-3xl md:text-[2.75rem] text-foreground leading-[1.05]">
          Um CNPJ, todas as licenças
        </h2>
        <p className="text-foreground/70 leading-relaxed">
          Cada órgão decide por conta própria, e a dispensa de um não vale para o outro. É por isso
          que tanta gente abre a empresa achando que está tudo certo e descobre a pendência na fiscalização.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LICENSING_TRACKS.map((track) => {
          const TrackIcon = track.icon;
          return (
            <div
              key={track.eyebrow}
              className={`bg-card p-8 rounded-md border border-border border-t-2 ${track.accentBorder} flex flex-col gap-5`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={`p-2.5 rounded-full ${track.accentTint} border border-border shrink-0`}>
                  <TrackIcon className={`w-4 h-4 ${track.accentText}`} strokeWidth={1.75} />
                </div>
                {track.status && (
                  <span className="px-3 py-1 rounded-sm border border-border bg-secondary text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {track.status}
                  </span>
                )}
              </div>
              <div className="space-y-2.5 flex-1">
                <p className={`eyebrow ${track.accentText}`}>{track.eyebrow}</p>
                <p className="font-display text-lg text-foreground leading-tight">{track.title}</p>
                <p className="text-[13px] text-foreground/65 leading-relaxed">{track.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskClassificationMatrix() {
  return (
    <div className="mt-14 mb-20 px-4 space-y-10">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <p className="eyebrow text-primary">Vigilância Sanitária</p>
        <h2 className="font-display text-3xl md:text-4xl text-foreground tracking-tight">
          Como funciona a classificação de risco
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Na frente sanitária, o nível de exigência para funcionar sai da classificação de risco da atividade,
          conforme a Resolução SESA nº 1.034/2020 e o Decreto Estadual nº 10.590/2025, do Paraná.
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

      <div className="pt-6 space-y-4">
        <div className="flex items-center gap-4">
          <p className="eyebrow whitespace-nowrap text-muted-foreground">De onde vêm as regras</p>
          <div className="rule-hairline flex-1" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="https://www.saude.pr.gov.br/Pagina/Licenciamento-Sanitario"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card p-7 rounded-md border border-border hover:border-primary/40 hover:shadow-refined transition-all flex items-start justify-between gap-5 group"
          >
            <span className="space-y-1.5">
              <span className="eyebrow block text-primary">SESA · Paraná</span>
              <span className="block text-sm text-foreground/75 leading-relaxed">
                Legislação sanitária do Estado, na fonte oficial da Secretaria de Saúde.
              </span>
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
          </a>

          <a
            href="https://www.bombeiros.pr.gov.br/PrevFogo/Pagina/Legislacao-de-Prevencao-e-Combate-Incendios-e-Desastres"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card p-7 rounded-md border border-border hover:border-risk-alto/40 hover:shadow-refined transition-all flex items-start justify-between gap-5 group"
          >
            <span className="space-y-1.5">
              <span className="eyebrow block text-risk-alto">CBMPR</span>
              <span className="block text-sm text-foreground/75 leading-relaxed">
                Normas de prevenção e combate a incêndio, no site do Corpo de Bombeiros.
              </span>
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-risk-alto transition-colors shrink-0 mt-1" />
          </a>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="bg-card px-7 py-6 rounded-md border border-border hover:border-primary/40 hover:no-underline transition-colors">
              <span className="flex items-center gap-3 text-sm text-foreground/80">
                <FileText className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                Manuais e orientações para download
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
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
    <div className="hero-ink rounded-lg overflow-hidden">
      <div className="px-8 py-14 md:px-16 md:py-20 grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div className="space-y-4">
          <p className="eyebrow text-sinal">Atendimento</p>
          <h2 className="font-display text-3xl md:text-[2.75rem] text-white leading-[1.05]">
            Travou em alguma exigência?
          </h2>
          <p className="text-white/70 leading-relaxed max-w-md">
            A consulta mostra o que a lei pede. Se o seu caso tiver uma particularidade — atividade
            que não aparece, dúvida sobre a estrutura do ponto, exigência que você não entendeu —
            chame no WhatsApp.
          </p>
        </div>
        <a
          href="https://wa.me/5542991038314"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 p-5 rounded-md bg-white/[0.06] border border-white/15 hover:bg-white/10 hover:border-sinal/50 transition-colors"
        >
          <div className="w-11 h-11 rounded-full bg-sinal/15 border border-sinal/30 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-sinal" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em] mb-1">WhatsApp</p>
            <p className="font-display text-lg text-white whitespace-nowrap">(42) 99103-8314</p>
          </div>
        </a>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "O que o portal consulta a partir do CNPJ?",
    a: "Duas frentes de licenciamento, hoje: a da Vigilância Sanitária, com a classificação de risco de cada CNAE da empresa, o porte de fiscalização e as exigências de projeto; e a do Corpo de Bombeiros Militar do Paraná, com o enquadramento nos anexos da Portaria do Comando-Geral nº 476/2025. A consulta ao alvará de localização e funcionamento do município está em desenvolvimento e será incorporada à mesma tela."
  },
  {
    q: "A dispensa da Vigilância Sanitária vale para o Corpo de Bombeiros?",
    a: "Não. São licenciamentos independentes, com bases legais e critérios diferentes. Uma atividade pode ser dispensada pela Vigilância Sanitária e ainda assim exigir licença do Corpo de Bombeiros, ou o contrário. Por isso o resultado de cada órgão aparece em sua própria coluna. Vale lembrar que, mesmo dispensado do licenciamento, o estabelecimento continua obrigado a manter as medidas de prevenção e combate a incêndio."
  },
  {
    q: "Quando o alvará de localização entra na consulta?",
    a: "A funcionalidade está em desenvolvimento e ainda não tem data de publicação. Até lá, o alvará de localização e funcionamento deve ser tratado diretamente com a prefeitura do município onde a empresa está estabelecida."
  },
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
    q: "Esta consulta substitui as licenças ou é um documento oficial?",
    a: "Não. O Agiliza é uma ferramenta informativa e gratuita, que orienta o empreendedor sobre as exigências previstas em lei. A licença sanitária, quando exigida, deve ser solicitada à Vigilância Sanitária do município onde a empresa está estabelecida; a licença de prevenção a incêndio, ao Corpo de Bombeiros Militar do Paraná."
  },
  {
    q: "Como solicito ou renovo a licença sanitária do meu estabelecimento?",
    a: "A licença sanitária é solicitada à Vigilância Sanitária do município onde a empresa está estabelecida; a de prevenção a incêndio, ao Corpo de Bombeiros Militar do Paraná. Cada município tem seu próprio canal de protocolo — procure o da sua cidade."
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
  // As perguntas do CBMPR são sobre o estabelecimento como um todo, não por CNAE,
  // por isso ficam em um estado próprio, com chaves globais.
  const [bombeirosAnswers, setBombeirosAnswers] = useState<Record<string, string>>({});
  // Os dois licenciamentos se alternam: só um fica aberto por vez. A consulta começa
  // pela Vigilância Sanitária, e a do CBMPR só aparece quando acionada.
  const [orgaoAtivo, setOrgaoAtivo] = useState<'VISA' | 'CBMPR'>('VISA');
  // A consulta ao CBMPR só acontece com o aceite explícito do usuário; quem recusa
  // recolhe o convite, que fica reduzido a uma linha reabrível.
  const [bombeirosDispensado, setBombeirosDispensado] = useState(false);
  const painelRef = useRef<HTMLDivElement | null>(null);
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

  /** Troca o órgão em exibição: um encerra e o outro executa, nunca os dois juntos. */
  const alternarOrgao = (destino: 'VISA' | 'CBMPR') => {
    setOrgaoAtivo(destino);
    // Sem isso, quem aciona no rodapé de um painel longo cai no meio do painel seguinte.
    requestAnimationFrame(() => {
      painelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleNewQuery = () => {
    setData(null);
    setAnswers({});
    setBombeirosAnswers({});
    setOrgaoAtivo('VISA');
    setBombeirosDispensado(false);
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
    setBombeirosAnswers({});
    setOrgaoAtivo('VISA');
    setBombeirosDispensado(false);

    startTransition(async () => {
      try {
        const res = await fetchCnpjData(values.cnpj);
        if (res && res.success) {
          setData(res.data);
          if (db) {
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
          <header className="full-bleed hero-ink -mt-14 md:-mt-24 mb-4">
            <div className="max-w-5xl mx-auto px-5 pt-12 pb-16 md:pt-16 md:pb-24">
              <div className="flex items-center gap-3 rise-in" style={{ animationDelay: '40ms' }}>
                <div className="relative w-8 h-10 bulb-flicker shrink-0">
                  <AgilizaMark className="w-full h-full" />
                </div>
                <span className="font-display text-xl text-white tracking-tight">
                  Agiliza<span className="text-sinal">.</span>
                </span>
                <span className="hidden sm:block ml-auto text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
                  Licenciamento de empresas · Paraná
                </span>
              </div>

              <div className="mt-14 md:mt-20 max-w-3xl space-y-6">
                <h1 className="headline-hero text-white rise-in" style={{ animationDelay: '120ms' }}>
                  Quais licenças o seu estabelecimento precisa para funcionar no{' '}
                  <span className="text-sinal">Paraná?</span>
                </h1>
                <p className="text-fluid-subtitle text-white/65 leading-relaxed max-w-xl rise-in" style={{ animationDelay: '200ms' }}>
                  Descubra aqui, em segundos. Informe o CNPJ e veja o que cada órgão exige do seu
                  negócio — e o que não exige. Sem ir a repartição, sem decifrar lei.
                </p>
              </div>

              <div className="mt-10 rise-in" style={{ animationDelay: '280ms' }}>
                <Card className="p-6 md:p-8 bg-card border-0 rounded-lg shadow-lifted">
                  {apiError && (
                    <div className="mb-7 p-5 rounded-md border border-destructive/40 border-l-2 border-l-destructive bg-destructive/[0.06] flex items-start gap-4">
                      <div className="p-2 border border-destructive/40 rounded-full shrink-0">
                        <AlertTriangle className="w-4 h-4 text-destructive" strokeWidth={1.75} />
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <p className="eyebrow text-destructive">Não foi possível consultar</p>
                        <span className="error-text-technical">{apiError}</span>
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="cnpj" className="eyebrow block text-muted-foreground">
                          CNPJ do negócio
                        </Label>
                        <Input
                          id="cnpj"
                          {...register('cnpj')}
                          inputMode="numeric"
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            e.target.value = val;
                            register('cnpj').onChange(e);
                          }}
                          placeholder="00.000.000/0000-00"
                          className="h-16 text-xl md:text-2xl border border-input bg-background rounded-md font-mono font-medium text-foreground tracking-wider placeholder:text-muted-foreground/35 placeholder:font-normal"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="h-16 md:mt-[1.6rem] px-8 bg-sinal text-ink rounded-md font-display text-base flex items-center justify-center gap-2.5 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50 shrink-0"
                      >
                        {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-4 h-4" strokeWidth={2.5} />}
                        {isPending ? 'Consultando' : 'Consultar'}
                      </button>
                    </div>
                    {errors.cnpj && <p className="text-destructive text-xs font-medium">{String(errors.cnpj.message)}</p>}
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      Gratuito e sem cadastro. Os dados da empresa vêm da base pública da Receita Federal.
                    </p>
                  </form>
                </Card>
              </div>

              <LampPanel acesa={isPending} className="mt-10 rise-in" />
            </div>
          </header>
        )}

        <main className={data ? 'max-w-3xl mx-auto w-full' : 'w-full'}>
          {!data ? (
            <div>
              <div className="px-4 pt-12 pb-16">
                <div className="p-8 md:p-10 rounded-md bg-card border border-border border-l-2 border-l-sinal flex flex-col md:flex-row md:items-center gap-7">
                  <div className="p-3 rounded-full bg-sinal/10 border border-sinal/25 shrink-0 w-fit">
                    <Megaphone className="w-5 h-5 text-sinal" strokeWidth={1.75} />
                  </div>
                  <p className="text-base md:text-lg text-foreground/85 leading-relaxed">
                    Mais de <span className="font-display text-foreground">900 atividades</span> estão
                    dispensadas do licenciamento sanitário no Paraná. Talvez a sua seja uma delas — e
                    talvez ainda assim o Corpo de Bombeiros exija a dele, porque a regra é outra.
                  </p>
                </div>
              </div>

              {/* Tópico 1 — quem ainda não abriu a empresa não tem CNPJ para consultar,
                  e é justamente quem mais precisa saber antes de assinar contrato. */}
              <section className="full-bleed bg-secondary/60 border-y border-border py-16 md:py-24">
                <div className="max-w-6xl mx-auto px-4 space-y-8">
                  <div className="max-w-2xl space-y-4">
                    <p className="eyebrow text-sinal">Ainda não abriu a empresa</p>
                    <h2 className="font-display text-3xl md:text-[2.75rem] text-foreground leading-[1.05]">
                      Consulte antes pelo código da atividade
                    </h2>
                    <p className="text-foreground/70 leading-relaxed">
                      Sem CNPJ ainda? Informe o CNAE que você pretende registrar e veja o grau de risco
                      da atividade antes de escolher o ponto, assinar o aluguel ou abrir a empresa.
                    </p>
                  </div>
                  <SimpleCnaeQuery />
                </div>
              </section>

              {/* Tópico 2 */}
              <section className="py-16 md:py-24">
                <LicensingScope />
              </section>

              {/* Tópico 3 */}
              <section className="full-bleed bg-secondary/60 border-y border-border py-16 md:py-24">
                <div className="max-w-6xl mx-auto px-4">
                  <ComoFunciona />
                </div>
              </section>

              {/* Tópico 4 */}
              <section className="py-16 md:py-24">
                <RiskClassificationMatrix />
              </section>

              <section className="pb-6">
                <ContactSection />
              </section>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Cabeçalho comum: identifica a empresa e abre o relatório dos dois licenciamentos. */}
              <Card className="overflow-hidden border border-border bg-card rounded-md shadow-refined-lg">
                <div className="py-10 px-6 md:px-10 text-center space-y-4">
                  <p className="eyebrow text-muted-foreground">Relatório de Licenciamento</p>
                  <h2 className="font-display text-2xl md:text-3xl text-foreground tracking-tight">{data.razao_social}</h2>
                  <div className="inline-block px-4 py-1.5 border border-border rounded-sm">
                    <p className="text-primary font-mono text-sm md:text-lg font-medium tracking-widest">{data.cnpj}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto pt-2">
                    Os dois licenciamentos exigidos no Paraná são avaliados de forma independente:
                    uma atividade pode ser dispensada por um órgão e exigida pelo outro.
                  </p>

                  {data.situacaoCadastral && data.situacaoCadastral !== 'ATIVA' && (
                    <div className="p-7 bg-destructive/10 border border-destructive/30 rounded-md space-y-2 text-left !mt-7">
                      <div className="flex items-start gap-4">
                        <div className="p-2 border border-destructive/40 rounded-full shrink-0">
                          <AlertTriangle className="w-4 h-4 text-destructive" strokeWidth={1.75} />
                        </div>
                        <div className="space-y-1 flex-1">
                          <p className="eyebrow text-destructive">CNPJ com situação cadastral: {data.situacaoCadastral}</p>
                          <p className="text-sm text-foreground/90 leading-snug">
                            Este CNPJ não consta como ATIVO na Receita Federal{data.motivoSituacaoCadastral && data.motivoSituacaoCadastral !== 'SEM MOTIVO' ? ` (motivo: ${data.motivoSituacaoCadastral})` : ''}. As classificações abaixo são apenas referenciais — este estabelecimento pode não estar apto a operar.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Um órgão de cada vez: o painel ativo ocupa a tela inteira e a troca
                  se dá pelos botões de acionamento abaixo de cada resultado. */}
              <div ref={painelRef} className="scroll-mt-6 space-y-8">
                {orgaoAtivo === 'VISA' ? (
                <Card className={`overflow-hidden border border-border border-t-2 ${currentTheme.borderClass} bg-card rounded-md shadow-refined-lg animate-in fade-in duration-300`}>
                  <div className={`${currentTheme.bgTintClass} py-10 px-6 text-center border-b border-border`}>
                    <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 mb-5 rounded-full bg-card border ${currentTheme.borderSoftClass} shadow-refined`}>
                      <ShieldCheck className={`w-[18px] h-[18px] ${currentTheme.textClass}`} strokeWidth={2} />
                      <span className={`text-[13px] md:text-sm font-bold uppercase tracking-[0.16em] ${currentTheme.textClass}`}>
                        Vigilância Sanitária
                      </span>
                    </div>
                    <h3 className={`font-display text-3xl md:text-4xl ${currentTheme.textClass} tracking-tight`}>
                      {result?.level === 'CONDICIONADO' ? 'Risco Condicionado' :
                       result?.level === 'NÃO ENCONTRADO' ? 'Atividade Não Localizada' :
                       currentTheme.label}
                    </h3>

                    {/* Veredito objetivo, em paridade com o painel do Corpo de Bombeiros. */}
                    {result && (() => {
                      const v = getVisaVeredito(result.level);
                      if (!v) return null;
                      const VIcon = v.icon;
                      return (
                        <div className="mt-4 space-y-1.5">
                          <div className="flex items-center justify-center gap-2.5">
                            <VIcon className={`w-[18px] h-[18px] ${currentTheme.textClass} shrink-0`} strokeWidth={2} />
                            <p className={`text-base md:text-lg font-semibold ${currentTheme.textClass} leading-snug`}>
                              {v.headline}
                            </p>
                          </div>
                          <p className="text-[13px] text-foreground/70 leading-snug max-w-sm mx-auto">{v.detail}</p>
                        </div>
                      );
                    })()}

                    {result?.porte && (
                      <div className={`mt-6 inline-flex p-3 px-4 rounded-sm border items-center justify-center gap-2.5 ${getPorteTheme(result.porte).bg} ${getPorteTheme(result.porte).border}`}>
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
                  <div className="p-6 md:p-8 space-y-10">

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

                  {result?.baixoRiscoNotes && result.baixoRiscoNotes.length > 0 && (
                    <div className="p-7 bg-secondary/60 border border-border rounded-md space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 border border-border rounded-full shrink-0">
                          <HelpCircle className="w-4 h-4 text-primary" strokeWidth={1.75} />
                        </div>
                        <div className="space-y-2 flex-1">
                          <p className="eyebrow text-muted-foreground">Nota sobre Baixo Risco (Decreto Estadual nº 10.590/2025)</p>
                          <ul className="space-y-1.5">
                            {result.baixoRiscoNotes.map((note, i) => (
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
                          <div key={`${c.code}-${idx}`} className="numbered-item py-7 flex gap-4">
                            <div className="flex-1 min-w-0 space-y-5">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                                <div className="space-y-2 flex-1 min-w-0">
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
                                <div className="flex md:justify-end shrink-0">
                                  <RiskBadge level={cnaeRes.risk} />
                                </div>
                              </div>

                              {cnaeRes.risk === 'CONDICIONADO' && cnaeRes.path && (
                                <div className="p-6 bg-secondary/60 rounded-sm space-y-5 border border-border border-l-2 border-l-risk-condicionado">
                                  <div className="space-y-1.5">
                                    <p className="eyebrow text-risk-condicionado">Responda para definir o risco</p>
                                    <p className="text-sm text-foreground/90 leading-snug">{cnaeRes.question}</p>
                                  </div>
                                  <RadioGroup value={answers[cnaeRes.path] || ""} onValueChange={(v) => setAnswers(prev => ({ ...prev, [cnaeRes.path!]: v }))} className="flex flex-wrap gap-3">
                                    <div className="flex items-center space-x-3 bg-card px-6 py-3 rounded-md border border-border hover:border-primary transition-colors">
                                      <RadioGroupItem value="Sim" id={`${cnaeRes.path}-sim`} className="h-4 w-4 border-primary" />
                                      <Label htmlFor={`${cnaeRes.path}-sim`} className="text-foreground text-sm cursor-pointer">Sim</Label>
                                    </div>
                                    <div className="flex items-center space-x-3 bg-card px-6 py-3 rounded-md border border-border hover:border-primary transition-colors">
                                      <RadioGroupItem value="Não" id={`${cnaeRes.path}-nao`} className="h-4 w-4 border-primary" />
                                      <Label htmlFor={`${cnaeRes.path}-nao`} className="text-foreground text-sm cursor-pointer">Não</Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                              )}
                            </div>
                          </div>
                      );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
                ) : (
                  <div className="animate-in fade-in duration-300">
                    <BombeirosPanel
                      cnaes={data.cnaes || []}
                      answers={bombeirosAnswers}
                      onAnswer={(id, value) => setBombeirosAnswers(prev => ({ ...prev, [id]: value }))}
                    />
                  </div>
                )}

                {/* Acionamento do outro licenciamento: encerra o painel atual e abre o outro. */}
                {orgaoAtivo === 'VISA' ? (
                  !bombeirosDispensado ? (
                    <div className="p-7 md:p-8 bg-card border border-border border-l-2 border-l-risk-alto rounded-md space-y-6">
                      <div className="flex flex-col md:flex-row md:items-start gap-5">
                        <div className="p-2.5 bg-risk-alto/10 border border-border rounded-full shrink-0 w-fit">
                          <Flame className="w-4 h-4 text-risk-alto" strokeWidth={1.75} />
                        </div>
                        <div className="space-y-2 flex-1">
                          <p className="eyebrow text-risk-alto">Corpo de Bombeiros</p>
                          <p className="text-base md:text-lg font-medium text-foreground/90 leading-snug">
                            Deseja consultar a licença do Corpo de Bombeiros?
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            É um licenciamento independente do sanitário, com regra própria: a dispensa da
                            Vigilância Sanitária não vale para o Corpo de Bombeiros. A consulta abre no lugar
                            deste resultado, e você volta a ele quando quiser.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 md:pl-16">
                        <button
                          type="button"
                          onClick={() => alternarOrgao('CBMPR')}
                          className="h-12 px-7 rounded-md bg-risk-alto text-primary-foreground text-[11px] font-semibold uppercase tracking-[0.15em] flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-[0.99]"
                        >
                          <Flame className="w-3.5 h-3.5" strokeWidth={2} />
                          Sim, consultar
                        </button>
                        <button
                          type="button"
                          onClick={() => setBombeirosDispensado(true)}
                          className="h-12 px-7 rounded-md border border-border text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.15em] flex items-center justify-center transition-colors hover:border-primary hover:text-primary"
                        >
                          Agora não
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-secondary/40 border border-border rounded-md flex flex-col sm:flex-row sm:items-center gap-4">
                      <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
                        A consulta ao Corpo de Bombeiros não foi realizada.
                      </p>
                      <button
                        type="button"
                        onClick={() => setBombeirosDispensado(false)}
                        className="h-11 px-6 rounded-md border border-border text-risk-alto text-[11px] font-semibold uppercase tracking-[0.15em] flex items-center justify-center gap-2.5 transition-colors hover:border-risk-alto shrink-0"
                      >
                        <Flame className="w-3.5 h-3.5" strokeWidth={2} />
                        Consultar agora
                      </button>
                    </div>
                  )
                ) : (
                  <div className="p-7 md:p-8 bg-card border border-border border-l-2 border-l-primary rounded-md flex flex-col md:flex-row md:items-center gap-6">
                    <div className="p-2.5 bg-primary/10 border border-border rounded-full shrink-0 w-fit">
                      <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={1.75} />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <p className="eyebrow text-primary">Vigilância Sanitária</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        O resultado sanitário continua guardado, com as respostas que você já deu.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alternarOrgao('VISA')}
                      className="h-12 px-7 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold uppercase tracking-[0.15em] flex items-center justify-center gap-2.5 transition-all hover:bg-primary/90 active:scale-[0.99] shrink-0"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
                      Voltar à Vigilância
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-7 pt-4">
                <p className="text-[11px] text-muted-foreground tracking-wide">Relatório emitido em {currentDate}</p>
                <button onClick={handleNewQuery} className="h-12 px-8 rounded-sm border border-border text-muted-foreground text-[11px] uppercase tracking-[0.15em] hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5" /> Efetuar Nova Pesquisa
                </button>
              </div>
            </div>
          )}
        </main>
        <FaqSection />
        <footer className="mt-20 pt-10 border-t border-border pb-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="relative w-6 h-7 shrink-0">
              <AgilizaMark className="w-full h-full" />
            </div>
            <span className="font-display text-base text-foreground tracking-tight">
              Agiliza<span className="text-sinal">.</span>
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed md:max-w-xl md:ml-auto md:text-right">
            Ferramenta informativa de orientação ao empreendedor. Não emite licença nem substitui
            documento oficial: as licenças são solicitadas aos órgãos competentes.
          </p>
        </footer>
      </div>
    </div>
  );
}
