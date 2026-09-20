'use client';

/**
 * @fileOverview AgilizaVISA – PARANÁ – VERSÃO CONSOLIDADA PARA PUBLICAÇÃO DEFINITIVA.
 * RESOLUÇÃO SESA Nº 1034/2020 | DECRETO ESTADUAL Nº 10.590/2025.
 */

import { useState, useTransition, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, RotateCcw, Loader2, ArrowRight, MessageCircle, FileText, AlertTriangle, ShieldCheck, Flame, Building2, Leaf, BadgeCheck } from 'lucide-react';
import { fetchCnpjData } from './actions';
import { analyzeRisk } from '@/lib/risk-analysis';
import { analyzeBombeiros } from '@/lib/bombeiros-analysis';
import { analyzeAlvara } from '@/lib/alvara-analysis';
import { analyzeAmbiental } from '@/lib/ambiental-analysis';
import { analyzePcpr } from '@/lib/pcpr-analysis';
import { RiskIcon } from '@/components/risk-components';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MaterialsList } from '@/components/MaterialsList';
import { SimpleCnaeQuery } from '@/components/SimpleCnaeQuery';
import { VisaPanel } from '@/components/VisaPanel';
import { BombeirosPanel } from '@/components/BombeirosPanel';
import { AlvaraPanel } from '@/components/AlvaraPanel';
import { AmbientalPanel } from '@/components/AmbientalPanel';
import { PcprPanel } from '@/components/PcprPanel';
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
        {/* A luz acende no alto (dourado) e assenta num traço azul embaixo — o
            mesmo par de cores do resto da marca, na própria lâmpada. */}
        <linearGradient id="agilizaMarkGrad" x1="50" y1="8" x2="50" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(var(--sinal))" />
          <stop offset="0.55" stopColor="hsl(var(--accent))" />
          <stop offset="1" stopColor="hsl(var(--primary))" />
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

/**
 * A assinatura da página. A marca do portal é uma lâmpada, então cada licença é uma
 * luz: apagadas, dizem o que ainda não se sabe sobre o negócio; a consulta acende.
 */
function LampPanel({ acesa = false, className = '' }: { acesa?: boolean; className?: string }) {
  const LUZES = ['Vigilância Sanitária', 'Corpo de Bombeiros', 'Alvará de Funcionamento', 'Ambiental', 'Polícia Civil'];
  return (
    <div className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-x-6 sm:gap-y-3 ${className}`}>
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
 * As cinco frentes de licenciamento que incidem sobre uma empresa no Paraná, em três
 * graus de determinação: vigilância, bombeiros e alvará têm anexo legal indexado por
 * CNAE e devolvem veredito; a Polícia Civil tem lista fechada por descrição de atividade,
 * então a ponte pelo CNAE é curadoria, mas a lei fixa documento, taxa e vistoria; a
 * ambiental não tem lista nenhuma por atividade, e só admite orientação.
 */
const LICENCAS = [
  {
    id: 'VISA',
    icon: ShieldCheck,
    eyebrow: 'Vigilância Sanitária',
    resumo: 'Licença sanitária, emitida pelo município',
    accentText: 'text-primary',
    accentBorder: 'border-t-primary',
    accentTint: 'bg-primary/10',
    accentRing: 'border-primary',
    status: null as string | null,
    base: 'Resolução SESA nº 1.034/2020 · Decreto Estadual nº 10.590/2025',
    comoFuncionaTitulo: 'Como funciona a classificação de risco',
    comoFunciona: [
      'Mais de 900 atividades estão dispensadas do licenciamento sanitário no Paraná. Talvez a sua seja uma delas — e talvez ainda assim o Corpo de Bombeiros exija a dele, porque a regra é outra.',
      'Na frente sanitária, o nível de exigência para funcionar sai da classificação de risco da atividade, conforme a Resolução SESA nº 1.034/2020 e o Decreto Estadual nº 10.590/2025, do Paraná.',
      'A consulta também mostra o porte de fiscalização do município (I, II ou III), que indica qual município tem competência para fiscalizar aquela atividade, e se há exigência de Projeto Básico de Arquitetura (PBA) aprovado antes de abrir.',
    ],
    ondePedirTitulo: 'De onde vêm as regras',
    ondePedir: [
      {
        texto: 'Legislação sanitária do Estado, na fonte oficial da Secretaria de Saúde.',
        href: 'https://www.saude.pr.gov.br/Pagina/Licenciamento-Sanitario',
        rotulo: 'SESA · Paraná',
      },
    ],
  },
  {
    id: 'CBMPR',
    icon: Flame,
    eyebrow: 'Corpo de Bombeiros',
    resumo: 'Licenciamento de prevenção a incêndio',
    accentText: 'text-risk-alto',
    accentBorder: 'border-t-risk-alto',
    accentTint: 'bg-risk-alto/10',
    accentRing: 'border-risk-alto',
    status: null as string | null,
    base: 'Portaria do Comando-Geral do CBMPR nº 476/2025',
    comoFunciona: [
      'Aqui o CNAE sozinho quase nunca decide. A atividade pode constar do Anexo A da Portaria — o que a torna passível de baixo risco —, mas a dispensa só vale se forem atendidas, ao mesmo tempo, as oito condições do art. 3º, VII: área e pavimento, saída para a rua, lotação, público atendido, GLP, inflamáveis e produtos perigosos.',
      'Há ainda hipóteses de dispensa que independem do CNAE (art. 3º, I a VI), como atividade exercida na própria residência sem atendimento ao público, endereço apenas fiscal, atividade exclusivamente virtual ou ambulante. E o Anexo B lista as atividades de alto risco, que sempre exigem licenciamento.',
    ],
    ondePedir: [
      {
        texto: 'Solicitação, renovação e acompanhamento do licenciamento pelo sistema oficial do CBMPR.',
        href: 'https://protegefacil.paas.pr.gov.br/',
        rotulo: 'Protege Fácil · solicitar licenciamento',
      },
      {
        texto: 'Normas de prevenção e combate a incêndio, no site do Corpo de Bombeiros.',
        href: 'https://www.bombeiros.pr.gov.br/PrevFogo/Pagina/Legislacao-de-Prevencao-e-Combate-Incendios-e-Desastres',
        rotulo: 'CBMPR · legislação',
      },
    ],
  },
  {
    id: 'ALVARA',
    icon: Building2,
    eyebrow: 'Alvará de Funcionamento',
    resumo: 'Alvará da prefeitura, com rito simplificado',
    accentText: 'text-risk-condicionado',
    accentBorder: 'border-t-risk-condicionado',
    accentTint: 'bg-risk-condicionado/10',
    accentRing: 'border-risk-condicionado',
    status: null as string | null,
    base: 'Decreto Estadual nº 11.063/2025, que atualiza o Anexo Único do Decreto Estadual nº 3.434/2023',
    comoFuncionaTitulo: 'Como funciona o enquadramento simplificado',
    comoFunciona: [
      'O Anexo Único do decreto lista 975 atividades como de baixo risco. Estar nessa lista não dispensa o alvará: libera a emissão simplificada e automática, sem vistoria prévia. O alvará continua sendo solicitado.',
      'Cada atividade da lista carrega suas próprias condições — por exemplo, ser exclusivamente artesanal, não gerar efluentes industriais, ter até dez funcionários ou estar em área com rede pública de esgoto. Se uma única condição não for atendida, a atividade sai do rito simplificado e segue o processo padrão.',
    ],
    ondePedirTitulo: 'De onde vêm as regras',
    ondePedir: [
      {
        texto: 'O alvará é emitido pela prefeitura do município onde a empresa está instalada. A classificação de risco é estadual; a emissão, municipal.',
        href: null,
        rotulo: null,
      },
      {
        texto: 'Abertura de empresa, consulta de viabilidade e licenciamento integrado no portal de empresas do Estado.',
        href: 'https://www.empresafacil.pr.gov.br',
        rotulo: 'Empresa Fácil Paraná',
      },
    ],
  },
  {
    id: 'AMBIENTAL',
    icon: Leaf,
    eyebrow: 'Licenciamento Ambiental',
    resumo: 'IAT ou município, conforme o impacto',
    accentText: 'text-risk-baixo',
    accentBorder: 'border-t-risk-baixo',
    accentTint: 'bg-risk-baixo/10',
    accentRing: 'border-risk-baixo',
    status: 'Orientação',
    base: 'Resolução CEMA nº 110/2021 · normas específicas por tipologia do IAT',
    comoFunciona: [
      'Esta é a única das cinco frentes que não pode ser respondida pelo código da atividade: a norma ambiental não classifica por CNAE, e sim por tipologia descrita em texto e por porte medido em unidades físicas — metros quadrados, litros por dia, número de funcionários, cabeças de gado, megawatts.',
      'A competência também se divide. Atividades de impacto local podem ser licenciadas pelo próprio município, quando habilitado para isso; as demais ficam com o Instituto Água e Terra. E quase toda atividade tem ressalvas de localização: área de preservação permanente, reserva legal, manancial e área cárstica costumam afastar o rito mais simples.',
      'Por isso, aqui o Agiliza orienta em vez de decidir: diz se a atividade costuma exigir licenciamento, monta a lista do que o órgão vai pedir e indica a qual órgão recorrer — mas não afirma enquadramento. Oficina mecânica, lavanderia, lava-rápido, padaria, açougue, restaurante, supermercado, hospedagem e comércio de GLP estão entre as que costumam exigir licença.',
    ],
    ondePedir: [
      {
        texto: 'Tipologias, normas por atividade e formulários do órgão ambiental estadual.',
        href: 'https://www.iat.pr.gov.br/Pagina/Licenciamento-de-atividades-especificas',
        rotulo: 'IAT · licenciamento de atividades',
      },
      {
        texto: 'Se a atividade for de impacto local e o município for habilitado, o pedido vai para o órgão ambiental da própria prefeitura.',
        href: null,
        rotulo: null,
      },
    ],
  },
  {
    id: 'PCPR',
    icon: BadgeCheck,
    eyebrow: 'Licença da Polícia Civil',
    resumo: 'Atividades de interesse da segurança pública',
    accentText: 'text-primary',
    accentBorder: 'border-t-primary',
    accentTint: 'bg-primary/10',
    accentRing: 'border-primary',
    status: null as string | null,
    base: 'Lei Estadual nº 20.936/2021, alterada pela Lei nº 22.754/2025',
    comoFuncionaTitulo: 'Como funciona a licença da Polícia Civil',
    comoFunciona: [
      'É a licença mais esquecida das cinco, e a que mais surpreende quem já abriu o negócio. Ela não trata de higiene, de incêndio nem de meio ambiente: trata de atividades que interessam à segurança pública — produtos controlados de um lado, e de outro um conjunto de negócios comuns que a lei considera sensíveis.',
      'A lista é fechada e numerada no Anexo Único da lei. Nela estão hotel, motel, pensão, oficina mecânica e funilaria, loja e estacionamento de veículos, locadora, chaveiro, joalheria, instalador de alarmes, boate, cinema, academia de artes marciais, extração de madeira e, desde fevereiro de 2026, o comércio de resíduos e sucatas metálicas.',
      'Duas regras pegam o pequeno negócio de surpresa. A primeira: o cadastro na Polícia Civil precisa ser feito ANTES de começar a funcionar, e operar sem a licença custa multa de 100% da taxa. A segunda: o MEI é isento do pagamento, mas não da licença — a isenção derruba o valor, não a obrigação.',
    ],
    ondePedirTitulo: 'De onde vêm as regras',
    ondePedir: [
      {
        texto: 'Produtos controlados, armas, munições e explosivos são tratados pela delegacia especializada, que também orienta sobre o cadastro e a vistoria.',
        href: 'https://www.policiacivil.pr.gov.br/Pagina/Explosivos-Armas-e-Municoes',
        rotulo: 'Polícia Civil · produtos controlados',
      },
      {
        texto: 'As atividades do grupo 3 do Anexo — hospedagem, veículos, joias, chaveiro, diversão — são atendidas pela delegacia de polícia da circunscrição do estabelecimento.',
        href: null,
        rotulo: null,
      },
    ],
  },
];

/**
 * Painel das cinco licenças. Os cartões funcionam como menu: abrem, um por vez, a
 * explicação da frente correspondente — o que substitui as antigas seções separadas de
 * "o que você descobre" e de classificação de risco sanitário, que diziam a mesma coisa
 * em dois lugares distantes da página.
 */
function LicencasPanorama() {
  const [aberta, setAberta] = useState<string | null>(null);
  const licencaAberta = LICENCAS.find((l) => l.id === aberta) || null;

  return (
    <div className="px-4 space-y-10">
      <div className="max-w-2xl space-y-4">
        <p className="eyebrow text-sinal">Licenciamento no Paraná</p>
        <h2 className="font-display text-3xl md:text-[2.75rem] text-foreground leading-[1.05]">
          Cinco licenças, uma consulta
        </h2>
        <p className="text-foreground/70 leading-relaxed">
          Cada órgão decide por conta própria, e a dispensa de um não vale para o outro. É por isso
          que tanta gente abre a empresa achando que está tudo certo e descobre a pendência na
          fiscalização. Toque em cada licença para entender como ela funciona e onde solicitá-la.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {LICENCAS.map((licenca) => {
          const LicencaIcon = licenca.icon;
          const ativa = aberta === licenca.id;
          return (
            <button
              key={licenca.id}
              type="button"
              onClick={() => setAberta(ativa ? null : licenca.id)}
              aria-expanded={ativa}
              className={`text-left bg-card p-7 rounded-md border border-border border-t-2 ${licenca.accentBorder} flex flex-col gap-4 transition-all hover:shadow-refined ${ativa ? `ring-1 ${licenca.accentRing} shadow-refined` : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={`p-2.5 rounded-full ${licenca.accentTint} border border-border shrink-0`}>
                  <LicencaIcon className={`w-4 h-4 ${licenca.accentText}`} strokeWidth={1.75} />
                </div>
                {licenca.status && (
                  <span className="px-3 py-1 rounded-sm border border-border bg-secondary text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {licenca.status}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <p className={`eyebrow ${licenca.accentText}`}>{licenca.eyebrow}</p>
                <p className="text-[13px] text-foreground/65 leading-relaxed">{licenca.resumo}</p>
              </div>
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${ativa ? licenca.accentText : 'text-muted-foreground'}`}>
                {ativa ? 'Fechar' : 'Como funciona'}
              </span>
            </button>
          );
        })}
      </div>

      {licencaAberta && (
        <div
          className={`bg-card rounded-md border border-border border-t-2 ${licencaAberta.accentBorder} p-8 md:p-10 space-y-8 animate-in fade-in duration-300`}
        >
          <div className="space-y-2">
            <p className={`eyebrow ${licencaAberta.accentText}`}>{licencaAberta.eyebrow}</p>
            <h3 className="font-display text-2xl md:text-3xl text-foreground tracking-tight">
              {licencaAberta.comoFuncionaTitulo || 'Como funciona'}
            </h3>
          </div>

          <div className="space-y-4 max-w-3xl">
            {licencaAberta.comoFunciona.map((paragrafo, i) => (
              <p key={i} className="text-sm md:text-base text-foreground/85 leading-relaxed">
                {paragrafo}
              </p>
            ))}
          </div>

          {/* Os quatro graus de risco só existem na frente sanitária. */}
          {licencaAberta.id === 'VISA' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(RISK_THEMES)
                .filter(([key]) => key !== 'NÃO ENCONTRADO')
                .map(([key, theme]) => (
                  <div
                    key={key}
                    className={`${theme.bgTintClass} rounded-md p-6 flex flex-col gap-2.5 border ${theme.borderSoftClass} border-t-2 ${theme.borderClass}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <RiskIcon level={key} className="w-4 h-4" />
                      <span className={`font-display text-base ${theme.textClass}`}>{theme.label}</span>
                    </div>
                    <p className="text-[13px] text-foreground/70 leading-relaxed">
                      {key === 'BAIXO' && 'Atividade econômica dispensada de licenciamento sanitário para funcionamento.'}
                      {key === 'MEDIO' && 'Licença sanitária emitida de forma simplificada, sem inspeção prévia.'}
                      {key === 'ALTO' && 'Exige inspeção sanitária e análise documental prévia à operação.'}
                      {key === 'CONDICIONADO' && 'Definido após respostas a questionário específico sobre a atividade.'}
                    </p>
                  </div>
                ))}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <p className="eyebrow whitespace-nowrap text-muted-foreground">{licencaAberta.ondePedirTitulo || 'Onde solicitar'}</p>
              <div className="rule-hairline flex-1" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {licencaAberta.ondePedir.map((item, i) =>
                item.href ? (
                  <a
                    key={i}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-secondary/50 p-6 rounded-md border border-border hover:border-primary/40 hover:shadow-refined transition-all flex items-start justify-between gap-5 group"
                  >
                    <span className="space-y-1.5">
                      <span className={`eyebrow block ${licencaAberta.accentText}`}>{item.rotulo}</span>
                      <span className="block text-sm text-foreground/75 leading-relaxed">{item.texto}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </a>
                ) : (
                  <div key={i} className="bg-secondary/50 p-6 rounded-md border border-border">
                    <p className="text-sm text-foreground/75 leading-relaxed">{item.texto}</p>
                  </div>
                )
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border">
            Base legal: {licencaAberta.base}.
          </p>
        </div>
      )}

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="materiais" className="border-none">
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
            A consulta mostra o que a lei pede. Isto não é consultoria: não acompanhamos o processo
            de licenciamento nem avaliamos o caso da sua empresa. O WhatsApp é para apontar problema
            na ferramenta — atividade que não aparece, classificação que parece errada, exigência que
            ficou confusa.
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
    a: "Cinco frentes de licenciamento: a da Vigilância Sanitária, com a classificação de risco de cada CNAE da empresa, o porte de fiscalização e as exigências de projeto; a do Corpo de Bombeiros Militar do Paraná, com o enquadramento nos anexos da Portaria do Comando-Geral nº 476/2025; a do Alvará de Funcionamento, com o enquadramento no Anexo Único do Decreto Estadual nº 11.063/2025, que define quando a emissão pode ser simplificada e automática, sem vistoria prévia; a do Licenciamento Ambiental, que orienta sobre a exigência conforme a tipologia da atividade; e a da Polícia Civil, com o enquadramento no Anexo Único da Lei Estadual nº 20.936/2021."
  },
  {
    q: "A dispensa da Vigilância Sanitária vale para o Corpo de Bombeiros?",
    a: "Não. São licenciamentos independentes, com bases legais e critérios diferentes. Uma atividade pode ser dispensada pela Vigilância Sanitária e ainda assim exigir licença do Corpo de Bombeiros, ou o contrário. Por isso o resultado de cada órgão aparece em sua própria coluna. Vale lembrar que, mesmo dispensado do licenciamento, o estabelecimento continua obrigado a manter as medidas de prevenção e combate a incêndio."
  },
  {
    q: "Como funciona a consulta ao Alvará de Funcionamento?",
    a: "A classificação vem de um decreto estadual — o Decreto nº 11.063/2025, que atualiza o Anexo Único do Decreto nº 3.434/2023 —, mas o alvará em si é sempre emitido pela prefeitura do município onde a empresa está estabelecida. Estar no Anexo Único e atender cumulativamente às condições listadas para a atividade libera a emissão sem vistoria prévia, por via simplificada e automática; fora do Anexo, ou com alguma condição não atendida, o alvará segue o processo padrão do município."
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

/**
 * O menu das cinco licenças no relatório por CNPJ — mesmo padrão da busca por CNAE
 * avulso. As cores repetem exatamente as do painel "Cinco licenças, uma consulta" na
 * home (LICENCAS): a mesma frente tem a mesma cor em toda a página, acesa mesmo com o
 * menu fechado — não só no estado selecionado — para o menu não ficar todo cinza.
 */
const ORGAO_MENUS = [
  { id: 'VISA', Icon: ShieldCheck, label: 'Vigilância Sanitária', text: 'text-primary', border: 'border-t-primary', tint: 'bg-primary/10', ring: 'border-primary' },
  { id: 'CBMPR', Icon: Flame, label: 'Corpo de Bombeiros', text: 'text-risk-alto', border: 'border-t-risk-alto', tint: 'bg-risk-alto/10', ring: 'border-risk-alto' },
  { id: 'ALVARA', Icon: Building2, label: 'Alvará de Funcionamento', text: 'text-risk-condicionado', border: 'border-t-risk-condicionado', tint: 'bg-risk-condicionado/10', ring: 'border-risk-condicionado' },
  { id: 'AMBIENTAL', Icon: Leaf, label: 'Licenciamento Ambiental', text: 'text-risk-baixo', border: 'border-t-risk-baixo', tint: 'bg-risk-baixo/10', ring: 'border-risk-baixo' },
  { id: 'PCPR', Icon: BadgeCheck, label: 'Polícia Civil', text: 'text-primary', border: 'border-t-primary', tint: 'bg-primary/10', ring: 'border-primary' },
] as const;

/** Cor do pontinho de status em cada botão do menu — um resumo antes de abrir. */
function dotVisa(level?: string): string {
  if (level === 'BAIXO') return 'bg-risk-baixo';
  if (level === 'MEDIO') return 'bg-risk-medio';
  if (level === 'ALTO') return 'bg-risk-alto';
  if (level === 'CONDICIONADO') return 'bg-risk-condicionado';
  return 'bg-muted-foreground/30';
}
function dotBombeiro(level?: string): string {
  if (level === 'ALTO') return 'bg-risk-alto';
  if (level === 'MEDIO') return 'bg-risk-medio';
  if (level === 'BAIXO') return 'bg-risk-baixo';
  if (level === 'PENDENTE') return 'bg-primary';
  return 'bg-muted-foreground/30';
}
function dotAlvara(level?: string): string {
  if (level === 'BAIXO') return 'bg-risk-baixo';
  if (level === 'PADRAO') return 'bg-risk-medio';
  return 'bg-muted-foreground/30';
}
function dotSinal(sinal?: string): string {
  return sinal === 'PROVAVEL' ? 'bg-risk-baixo' : 'bg-muted-foreground/30';
}

export default function Home() {
  const db = useFirestore();
  const [data, setData] = useState<CompanyData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // As perguntas do CBMPR são sobre o estabelecimento como um todo, não por CNAE,
  // por isso ficam em um estado próprio, com chaves globais.
  const [bombeirosAnswers, setBombeirosAnswers] = useState<Record<string, string>>({});
  // O Alvará autodeclara por CNAE: cada condição do Anexo Único é respondida por
  // atividade, então as chaves combinam o CNAE com o índice da condição.
  const [alvaraAnswers, setAlvaraAnswers] = useState<Record<string, string>>({});
  // A ambiental não autodeclara enquadramento: as três respostas apenas montam o
  // checklist e indicam o órgão provável, então bastam chaves globais.
  const [ambientalAnswers, setAmbientalAnswers] = useState<Record<string, string>>({});
  // A Polícia Civil pergunta sobre produto controlado e sobre MEI — as duas são sobre o
  // estabelecimento como um todo, não por CNAE, então bastam chaves globais.
  const [pcprAnswers, setPcprAnswers] = useState<Record<string, string>>({});
  // As cinco licenças chegam recolhidas: o usuário escolhe qual abrir, e só uma
  // fica aberta por vez — o mesmo menu usado na busca avulsa por CNAE.
  const [orgaoAtivo, setOrgaoAtivo] = useState<'VISA' | 'CBMPR' | 'ALVARA' | 'AMBIENTAL' | 'PCPR' | null>(null);
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
  // Calculados aqui só para o pontinho de status de cada botão do menu — o conteúdo
  // completo de cada frente é computado de novo dentro do próprio painel quando abre.
  const bombeirosResult = data ? analyzeBombeiros(data.cnaes || [], bombeirosAnswers) : null;
  const alvaraResult = data ? analyzeAlvara(data.cnaes || [], alvaraAnswers) : null;
  const ambientalResult = data ? analyzeAmbiental(data.cnaes || [], ambientalAnswers) : null;
  const pcprResult = data ? analyzePcpr(data.cnaes || [], pcprAnswers) : null;

  const ORGAO_DOTS: Record<string, string> = {
    VISA: dotVisa(result?.level),
    CBMPR: dotBombeiro(bombeirosResult?.level),
    ALVARA: dotAlvara(alvaraResult?.level),
    AMBIENTAL: dotSinal(ambientalResult?.sinal),
    PCPR: dotSinal(pcprResult?.sinal),
  };

  /** Abre a licença escolhida; tocar na que já está aberta recolhe de volta ao menu. */
  const alternarOrgao = (destino: 'VISA' | 'CBMPR' | 'ALVARA' | 'AMBIENTAL' | 'PCPR') => {
    setOrgaoAtivo((prev) => (prev === destino ? null : destino));
    // Sem isso, quem aciona no rodapé de um painel longo cai no meio do painel seguinte.
    requestAnimationFrame(() => {
      painelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleNewQuery = () => {
    setData(null);
    setAnswers({});
    setBombeirosAnswers({});
    setAlvaraAnswers({});
    setAmbientalAnswers({});
    setPcprAnswers({});
    setOrgaoAtivo(null);
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
    setAlvaraAnswers({});
    setAmbientalAnswers({});
    setPcprAnswers({});
    setOrgaoAtivo(null);

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
              <div className="flex items-center gap-3.5 rise-in" style={{ animationDelay: '40ms' }}>
                <div className="relative w-9 h-11 bulb-flicker shrink-0">
                  <AgilizaMark className="w-full h-full" />
                </div>
                <div className="leading-none">
                  <span className="font-display text-2xl md:text-[1.75rem] text-white tracking-tight">
                    Agiliza<span className="text-sinal">.</span>
                  </span>
                  <p className="mt-1 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.16em] text-white/55">
                    Portal de licenciamento de empresas · Paraná
                  </p>
                </div>
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
              {/* Tópico 1 — quem ainda não abriu a empresa não tem CNPJ para consultar,
                  e é justamente quem mais precisa saber antes de assinar contrato. Faixa
                  na cor do sinal (a mesma do botão de consulta e da lâmpada), pra não se
                  confundir visualmente com a faixa neutra de "Como funciona" logo abaixo. */}
              <section className="full-bleed bg-sinal/[0.06] border-y border-sinal/25 py-16 md:py-24">
                <div className="max-w-6xl mx-auto px-4 space-y-8">
                  <div className="max-w-2xl space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-card border border-sinal/30 shadow-refined">
                      <Search className="w-3.5 h-3.5 text-sinal" strokeWidth={2} />
                      <p className="eyebrow text-sinal">Ainda não abriu a empresa</p>
                    </div>
                    <h2 className="font-display text-3xl md:text-[2.75rem] text-foreground leading-[1.05]">
                      Consulte antes pelo <span className="text-sinal">código da atividade</span>
                    </h2>
                    <p className="text-foreground/70 leading-relaxed">
                      Sem CNPJ ainda? Informe o CNAE que você pretende registrar e abra, em um único menu
                      por vez, o que a Vigilância Sanitária, o Corpo de Bombeiros, o Alvará de
                      Funcionamento, o licenciamento ambiental e a Polícia Civil exigem da atividade —
                      antes de escolher o ponto, assinar o aluguel ou abrir a empresa.
                    </p>
                  </div>
                  <SimpleCnaeQuery />
                </div>
              </section>

              {/* Tópico 2 — as cinco licenças, cada uma abrindo sua própria explicação. */}
              <section className="py-16 md:py-24">
                <LicencasPanorama />
              </section>

              {/* Tópico 3 */}
              <section className="full-bleed bg-secondary/60 border-y border-border py-16 md:py-24">
                <div className="max-w-6xl mx-auto px-4">
                  <ComoFunciona />
                </div>
              </section>

              <section className="pb-6">
                <ContactSection />
              </section>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Cabeçalho comum: identifica a empresa e abre o relatório das cinco frentes de licenciamento. */}
              <Card className="overflow-hidden border border-border bg-card rounded-md shadow-refined-lg">
                <div className="py-10 px-6 md:px-10 text-center space-y-4">
                  <p className="eyebrow text-muted-foreground">Relatório de Licenciamento</p>
                  <h2 className="font-display text-2xl md:text-3xl text-foreground tracking-tight">{data.razao_social}</h2>
                  <div className="inline-block px-4 py-1.5 border border-border rounded-sm">
                    <p className="text-primary font-mono text-sm md:text-lg font-medium tracking-widest">{data.cnpj}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto pt-2">
                    As cinco frentes de licenciamento exigidas no Paraná são avaliadas de forma independente:
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

              {/* As cinco licenças chegam recolhidas neste menu — a mesma interação da
                  busca avulsa por CNAE — e só uma abre por vez, abaixo dos botões. */}
              <div ref={painelRef} className="scroll-mt-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {ORGAO_MENUS.map(({ id, Icon, label, text, border, tint, ring }) => {
                    const isOpen = orgaoAtivo === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => alternarOrgao(id)}
                        aria-expanded={isOpen}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-md border border-border border-t-2 ${border} bg-card text-center transition-all hover:shadow-refined ${
                          isOpen ? `${tint} ring-1 ${ring} shadow-refined` : ''
                        }`}
                      >
                        <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${ORGAO_DOTS[id]}`} />
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

                {!orgaoAtivo && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Toque em uma licença acima para ver o resultado.
                  </p>
                )}

                {orgaoAtivo === 'VISA' && (
                  <div className="animate-in fade-in duration-300">
                    <VisaPanel
                      cnaes={data.cnaes || []}
                      answers={answers}
                      onAnswer={(id, value) => setAnswers(prev => ({ ...prev, [id]: value }))}
                    />
                  </div>
                )}
                {orgaoAtivo === 'CBMPR' && (
                  <div className="animate-in fade-in duration-300">
                    <BombeirosPanel
                      cnaes={data.cnaes || []}
                      answers={bombeirosAnswers}
                      onAnswer={(id, value) => setBombeirosAnswers(prev => ({ ...prev, [id]: value }))}
                    />
                  </div>
                )}
                {orgaoAtivo === 'ALVARA' && (
                  <div className="animate-in fade-in duration-300">
                    <AlvaraPanel
                      cnaes={data.cnaes || []}
                      answers={alvaraAnswers}
                      onAnswer={(id, value) => setAlvaraAnswers(prev => ({ ...prev, [id]: value }))}
                    />
                  </div>
                )}
                {orgaoAtivo === 'AMBIENTAL' && (
                  <div className="animate-in fade-in duration-300">
                    <AmbientalPanel
                      cnaes={data.cnaes || []}
                      answers={ambientalAnswers}
                      onAnswer={(id, value) => setAmbientalAnswers(prev => ({ ...prev, [id]: value }))}
                    />
                  </div>
                )}
                {orgaoAtivo === 'PCPR' && (
                  <div className="animate-in fade-in duration-300">
                    <PcprPanel
                      cnaes={data.cnaes || []}
                      answers={pcprAnswers}
                      onAnswer={(id, value) => setPcprAnswers(prev => ({ ...prev, [id]: value }))}
                    />
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
