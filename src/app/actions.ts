'use server';

/**
 * @fileOverview AÇÃO DE SERVIDOR ULTRA-RESILIENTE COM DIAGNÓSTICO DE API.
 * PREVINE ERRO 500 ATRAVÉS DE CAPTURA ABSOLUTA DE EXCEÇÕES E ESCUDO DE REDE.
 */

import type { CompanyData, Cnae } from '@/lib/types';

export type FetchResult = 
  | { success: true; data: CompanyData } 
  | { success: false; error: string };

export async function fetchCnpjData(cnpj: string): Promise<FetchResult> {
  try {
    const cleaned = cnpj ? String(cnpj).replace(/\D/g, '') : '';
    if (cleaned.length !== 14) return { success: false, error: "CNPJ INVÁLIDO. REQUER 14 NÚMEROS." };

    // ESCUDO DE PERFORMANCE: TIMEOUT DE 7 SEGUNDOS PARA NÃO TRAVAR O SERVIDOR
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json', 
        'User-Agent': 'AgilizaVISA-HighPerformance/2.0' 
      },
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (res.status === 404) return { success: false, error: "CNPJ NÃO ENCONTRADO NA BASE FEDERAL." };
    if (res.status === 429) return { success: false, error: "LIMITE DE REQUISIÇÕES EXCEDIDO NA API FEDERAL. TENTE NOVAMENTE EM ALGUNS MINUTOS." };
    if (res.status >= 500) return { success: false, error: "SISTEMA FEDERAL EM MANUTENÇÃO." };
    
    if (!res.ok) return { success: false, error: "BASE EXTERNA INDISPONÍVEL." };

    const data = await res.json();
    if (!data || typeof data !== 'object') return { success: false, error: "DADOS INVÁLIDOS NA RESPOSTA." };

    const normalize = (c: any) => String(c || '').replace(/\D/g, '').padStart(7, '0');

    const cnaes: Cnae[] = [];
    if (data.cnae_fiscal) {
      cnaes.push({ 
        code: normalize(data.cnae_fiscal), 
        description: String(data.cnae_fiscal_descricao || "ATIVIDADE PRINCIPAL").toUpperCase()
      });
    }
    
    if (Array.isArray(data.cnaes_secundarios)) {
      data.cnaes_secundarios.forEach((c: any) => {
        const code = c.codigo || c.code;
        if (code) {
          cnaes.push({ 
            code: normalize(code), 
            description: String(c.descricao || c.description || "ATIVIDADE SECUNDÁRIA").toUpperCase()
          });
        }
      });
    }

    return {
      success: true,
      data: {
        razao_social: String(data.razao_social || data.nome_fantasia || "NÃO INFORMADO").toUpperCase(),
        nome_fantasia: String(data.nome_fantasia || "").toUpperCase(),
        cnpj: String(data.cnpj || cleaned),
        cnaes: cnaes
      }
    };
  } catch (error: any) {
    console.error(error);
    if (error.name === 'AbortError') return { success: false, error: "A CONSULTA DEMOROU MUITO (TIMEOUT). TENTE NOVAMENTE." };
    return { success: false, error: "FALHA TÉCNICA NA COMUNICAÇÃO EXTERNA." };
  }
}
