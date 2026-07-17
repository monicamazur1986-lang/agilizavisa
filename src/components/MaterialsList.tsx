'use client';

import React from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { FileText } from 'lucide-react';

export function MaterialsList() {
  const db = useFirestore();
  const materialsQuery = db ? query(collection(db, 'materials')) : null;
  const { data, loading } = useCollection(materialsQuery);

  if (loading) return <div className="text-center p-4">Carregando materiais...</div>;

  const allMaterials = [
    ...(data || []),
    {
      title: "Cartilha de Orientações - Salões de Beleza",
      url: "https://drive.google.com/file/d/1jWHDCk6wkDPyLfxC3XMJJCjfCGP57TrH/view?usp=sharing",
      type: "documento drive"
    },
    {
      title: "Guia Prático Para Manipuladores de Alimentos",
      url: "https://canva.link/n0m6eopzmngwz3w",
      type: "canva"
    },
    {
      title: "Dia Nacional do Combate ao Fumo",
      url: "https://canva.link/q0rqg2zeapndhcx",
      type: "canva"
    },
    {
      title: "AEDES AEGYPTI - DENGUE",
      url: "https://canva.link/dsk2g3f25n8crd4",
      type: "canva"
    },
    {
      title: "VIGIAGUA",
      url: "https://canva.link/gnommm3tc4vr1kx",
      type: "canva"
    },
    {
      title: "DENGUE MUTIRAO",
      url: "https://canva.link/gnommm3tc4vr1kx",
      type: "canva"
    }
  ];

  return (
    <div className="grid gap-4 mt-6">
      {allMaterials.map((material: any, index: number) => (
        <a
          key={index}
          href={material.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 border border-slate-100"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-800 font-bold">{material.title}</span>
            <span className="text-xs text-slate-500 uppercase tracking-wider">{material.type}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
