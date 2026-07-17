'use client';

/**
 * @fileOverview ESCUDO DE HIDRATAÇÃO ABSOLUTA - PROTEÇÃO CONTRA ERRO 500.
 * GARANTE QUE O FIREBASE SEJA INICIALIZADO APENAS NO NAVEGADOR E NUNCA NO SERVIDOR.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { initializeFirebase } from './core';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// ESCUDO CONTRA CONSOLE WARN/ERROR COM ESTRUTURAS CIRCULARES (AI STUDIO LOG SERIALIZATION CRASH)
if (typeof window !== 'undefined') {
  const wrapConsole = (method: 'warn' | 'error') => {
    try {
      const original = console[method];
      if (original && !(original as any).__isWrapped) {
        const wrapped = function (...args: any[]) {
          const safeArgs = args.map(arg => {
            if (arg && typeof arg === 'object') {
              try {
                JSON.stringify(arg);
                return arg;
              } catch (e) {
                return `[Circular or Unserializable Object: ${Object.prototype.toString.call(arg)}]`;
              }
            }
            return arg;
          });
          original.apply(console, safeArgs);
        };
        (wrapped as any).__isWrapped = true;
        console[method] = wrapped;
      }
    } catch (err) {
      // Ignore errors on console wrapping
    }
  };
  wrapConsole('warn');
  wrapConsole('error');
}

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const instances = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      return initializeFirebase();
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  // DURANTE SSR (SERVER-SIDE RENDERING), RENDEMOS UM PLACEHOLDER DE CARREGAMENTO.
  // ISSO EVITA A COLISÃO DE ESTADO QUE GERA O ERRO 500.
  if (!mounted || !instances) {
    return (
      <div className="min-h-screen bg-[#ECEFF1]" data-hydration="pending">
      </div>
    );
  }

  return (
    <FirebaseProvider app={instances.app} db={instances.db} auth={instances.auth}>
      <FirebaseErrorListener />
      <div className="min-h-screen bg-[#ECEFF1]" data-hydration="complete">
        {children}
      </div>
    </FirebaseProvider>
  );
};
