'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

/**
 * Monta uma vez no layout raiz. Não renderiza nada — só liga o Analytics
 * (visitas, sessão, novo x recorrente) assim que a página carrega no navegador.
 */
export function AnalyticsInit() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return null;
}
