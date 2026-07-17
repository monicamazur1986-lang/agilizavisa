
'use client';

/**
 * @fileOverview Emissor de eventos simplificado para ambiente de navegador.
 * Evita dependência do módulo 'events' do Node.js que causa falhas no build client-side.
 */

type Listener = (data: any) => void;

class SimpleEventEmitter {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, callback: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== callback);
  }

  emit(event: string, data: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(l => l(data));
  }
}

export const errorEmitter = new SimpleEventEmitter();
