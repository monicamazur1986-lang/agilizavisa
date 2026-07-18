'use client';

import React from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { FileText, ArrowRight } from 'lucide-react';

type Material = { title: string; url: string };

const MANUAIS_E_CARTILHAS: Material[] = [
  {
    title: "Ebook SESA-PR — Segurança do Paciente",
    url: "https://www.documentador.pr.gov.br/documentador/pub.do?action=d&uuid=@gtf-escriba-sesa@69fbedf6-5489-4809-9dbb-f1303af0f020&emPg=true",
  },
  {
    title: "Cartilha SESA-PR — Boas Práticas para Serviços de Alimentação (Resolução RDC nº 216/2004)",
    url: "https://www.documentador.pr.gov.br/documentador/pub.do?action=d&uuid=@gtf-escriba-sesa@3c702ca0-6883-4d7f-b729-dab652499ad8&emPg=true",
  },
  {
    title: "Orientações sobre a Resolução SESA nº 748/2014",
    url: "https://www.documentador.pr.gov.br/documentador/pub.do?action=d&uuid=@gtf-escriba-sesa@85b491b5-6d6a-4fc3-8a86-f52a79e8d361&emPg=true",
  },
  {
    title: "Resíduos de Agrotóxicos em Alimentos",
    url: "https://www.documentador.pr.gov.br/documentador/pub.do?action=d&uuid=@gtf-escriba-sesa@17ab381a-0260-42ef-99a2-28843b0d7210&emPg=true",
  },
  {
    title: "Resolução SESA nº 004/2017 — Manual de Boas Práticas de Fabricação de Alimentos Processados pelo Empreendimento Familiar Rural",
    url: "https://www.documentador.pr.gov.br/documentador/pub.do?action=d&uuid=@gtf-escriba-sesa@60a2b915-c331-4cc2-8903-bebe3332ee0b&emPg=true",
  },
  {
    title: "Manual de Orientação aos Consumidores — Educação para o Consumo Saudável (Anvisa)",
    url: "https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/alimentos/manuais-guias-e-orientacoes/manual_consumidor.pdf/@@download/file",
  },
  {
    title: "Guia de Boas Práticas Nutricionais para Restaurantes Coletivos (Anvisa)",
    url: "https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/alimentos/manuais-guias-e-orientacoes/guia-de-boas-praticas-nutricionais-para-restaurantes-coletivos.pdf/@@download/file",
  },
  {
    title: "Cartilha de Orientações — Salões de Beleza",
    url: "https://drive.google.com/file/d/1jWHDCk6wkDPyLfxC3XMJJCjfCGP57TrH/view?usp=sharing",
  },
  {
    title: "Guia Prático para Manipuladores de Alimentos",
    url: "https://canva.link/n0m6eopzmngwz3w",
  },
];

const MATERIAIS_DE_CAMPANHA: Material[] = [
  {
    title: "Dia Nacional do Combate ao Fumo",
    url: "https://canva.link/q0rqg2zeapndhcx",
  },
  {
    title: "Aedes Aegypti — Dengue",
    url: "https://canva.link/dsk2g3f25n8crd4",
  },
  {
    title: "Vigiágua",
    url: "https://canva.link/gnommm3tc4vr1kx",
  },
  {
    title: "Dengue — Mutirão",
    url: "https://canva.link/gnommm3tc4vr1kx",
  },
];

function MaterialGroup({ title, items }: { title: string; items: Material[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2.5">
      <p className="eyebrow text-muted-foreground px-1">{title}</p>
      <div className="border border-border rounded-md divide-y divide-border overflow-hidden bg-card">
        {items.map((material, i) => (
          <a
            key={i}
            href={material.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 px-5 py-4 hover:bg-secondary/60 transition-colors group"
          >
            <FileText className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
            <span className="text-sm text-foreground/90 flex-1 leading-snug">{material.title}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

export function MaterialsList() {
  const db = useFirestore();
  const materialsQuery = db ? query(collection(db, 'materials')) : null;
  const { data, loading } = useCollection(materialsQuery);

  if (loading) return <div className="text-center p-4 text-sm text-muted-foreground">Carregando materiais...</div>;

  const dynamicMaterials: Material[] = (data || []).map((m: any) => ({ title: m.title, url: m.url }));

  return (
    <div className="space-y-6 mt-4">
      <MaterialGroup title="Manuais e Cartilhas" items={[...dynamicMaterials, ...MANUAIS_E_CARTILHAS]} />
      <MaterialGroup title="Materiais de Campanha" items={MATERIAIS_DE_CAMPANHA} />
    </div>
  );
}
