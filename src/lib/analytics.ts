'use client';

/**
 * @fileOverview ANALYTICS DE USO — sem cadastro, sem login.
 *
 * Usa o Google Analytics (via Firebase Analytics) só para contar acessos e
 * distinguir usuário novo de usuário recorrente — os números aparecem prontos
 * no Console do Firebase (Analytics) ou no Google Analytics, sem precisar de
 * painel próprio. Nenhum dado individualiza quem consulta: não há CPF, CNPJ
 * nem e-mail nos eventos, só o fato de que uma sessão aconteceu.
 *
 * Instância própria e nomeada (não a `[DEFAULT]` usada pelo restante do app em
 * `src/firebase/core.ts`, hoje apontada para outro projeto Firebase) para não
 * colidir com o provider de Firestore/Auth já existente.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';
import { firebaseConfig } from '@/firebase/config';

const ANALYTICS_APP_NAME = 'agiliza-analytics';

let analyticsInstance: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

function getAnalyticsApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === ANALYTICS_APP_NAME);
  return existing ?? initializeApp(firebaseConfig, ANALYTICS_APP_NAME);
}

/** Chama uma vez (ex.: no layout raiz) para começar a contar a sessão. */
export function initAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (initPromise) return initPromise;

  initPromise = isSupported()
    .then((supported) => {
      if (!supported) return null;
      analyticsInstance = getAnalytics(getAnalyticsApp());
      return analyticsInstance;
    })
    .catch(() => null);

  return initPromise;
}

/** Evento sem dado pessoal — ex.: trackEvent('consulta_realizada', { metodo: 'cnpj' }). */
export async function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  const analytics = analyticsInstance ?? (await initAnalytics());
  if (!analytics) return;
  logEvent(analytics, name, params);
}
