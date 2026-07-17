'use client';

import { CircleCheck, TriangleAlert, CircleX, Info, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const RiskIcon = ({ level, className }: { level: string; className?: string }) => {
  switch (level) {
    case 'BAIXO': return <CircleCheck className={cn("text-emerald-400", className)} />;
    case 'MEDIO': return <TriangleAlert className={cn("text-amber-400", className)} />;
    case 'ALTO': return <CircleX className={cn("text-rose-400", className)} />;
    case 'CONDICIONADO': return <Info className={cn("text-sky-400", className)} />;
    default: return <ShieldCheck className={cn("text-slate-500", className)} />;
  }
};

export const RiskBadge = ({ level }: { level: string }) => {
  const styles: any = {
    BAIXO: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    MEDIO: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    ALTO: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    CONDICIONADO: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    "NÃO ENCONTRADO": "bg-slate-800 text-slate-400 border-slate-700"
  };
  return (
    <div className={cn("px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-3 backdrop-blur-md", styles[level] || styles["NÃO ENCONTRADO"])}>
      <RiskIcon level={level} className="h-4 w-4" />
      {level}
    </div>
  );
};
