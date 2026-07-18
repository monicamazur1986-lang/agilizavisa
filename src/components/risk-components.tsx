'use client';

import { CircleCheck, TriangleAlert, CircleX, Info, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const RiskIcon = ({ level, className }: { level: string; className?: string }) => {
  switch (level) {
    case 'BAIXO': return <CircleCheck className={cn("text-risk-baixo", className)} strokeWidth={1.75} />;
    case 'MEDIO': return <TriangleAlert className={cn("text-risk-medio", className)} strokeWidth={1.75} />;
    case 'ALTO': return <CircleX className={cn("text-risk-alto", className)} strokeWidth={1.75} />;
    case 'CONDICIONADO': return <Info className={cn("text-risk-condicionado", className)} strokeWidth={1.75} />;
    default: return <ShieldCheck className={cn("text-muted-foreground", className)} strokeWidth={1.75} />;
  }
};

export const RiskBadge = ({ level }: { level: string }) => {
  const styles: any = {
    BAIXO: "bg-risk-baixo/10 text-risk-baixo border-risk-baixo/25",
    MEDIO: "bg-risk-medio/10 text-risk-medio border-risk-medio/25",
    ALTO: "bg-risk-alto/10 text-risk-alto border-risk-alto/25",
    CONDICIONADO: "bg-risk-condicionado/10 text-risk-condicionado border-risk-condicionado/25",
    "NÃO ENCONTRADO": "bg-muted text-muted-foreground border-border"
  };
  return (
    <div className={cn("px-3.5 py-1.5 rounded-sm border text-[10px] font-semibold uppercase tracking-[0.18em] flex items-center gap-2.5", styles[level] || styles["NÃO ENCONTRADO"])}>
      <RiskIcon level={level} className="h-3.5 w-3.5" />
      {level}
    </div>
  );
};
