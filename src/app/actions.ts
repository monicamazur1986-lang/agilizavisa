'use client';

/**
 * @fileOverview CONSULTA DE CNPJ ULTRA-RESILIENTE COM DIAGNÓSTICO DE API.
 * CAPTURA ABSOLUTA DE EXCEÇÕES E ESCUDO DE REDE.
 *
 * Executa no navegador. A BrasilAPI é pública, não exige chave e responde com
 * `access-control-allow-origin: *`, então a consulta dispensa servidor — o que
 * permite publicar o portal como site estático.
 */

import type { CompanyData, Cnae } from '@/lib/types';

export type FetchResult = 
  | { success: true; data: CompanyData } 
  | { success: false; error: string };

export async function fetchCnpjData(cnpj: string): Promise<FetchResult> {
  try {
    const cleaned = cnpj ? String(cnpj).replace(/\D/g, '') : '';
    if (cleaned.length !== 14) return { success: false, error: "CNPJ INVÁLIDO. REQUER 14 NÚMEROS." };

    // ESCUDO DE PERFORMANCE: TIMEOUT DE 7 SEGUNDOS PARA NÃO TRAVAR A INTERFACE
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    // Sem cabeçalhos personalizados: o navegador ignora User-Agent (cabeçalho proibido)
    // e qualquer cabeçalho fora da lista segura dispararia uma requisição de verificação
    // prévia (preflight) desnecessária.
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (res.status === 404) return { success: false, error: "CNPJ NÃO ENCONTRADO NA BASE FEDERAL." };
    if (res.status === 429) return { success: false, error: "LIMITE DE REQUISIÇÕES EXCEDIDO NA API FEDERAL. TENTE NOVAMENTE EM ALGUNS MINUTOS." };
    if (res.status >= 500) return { success: false, error: `SISTEMA FEDERAL EM MANUTENÇÃO. (HTTP ${res.status})` };

    // O status entra na mensagem porque, sem ele, qualquer falha fora dos casos acima
    // vira um texto genérico impossível de diagnosticar a partir do relato do usuário.
    if (!res.ok) {
      let detalhe = '';
      try {
        const corpo = await res.text();
        if (corpo) detalhe = ` ${corpo.slice(0, 120)}`;
      } catch {
        /* corpo ilegível não impede o diagnóstico pelo status */
      }
      console.error('[AgilizaVISA] BrasilAPI respondeu', res.status, detalhe);
      return { success: false, error: `BASE EXTERNA INDISPONÍVEL. (HTTP ${res.status})${detalhe}` };
    }

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
        cnaes: cnaes,
        situacaoCadastral: data.descricao_situacao_cadastral ? String(data.descricao_situacao_cadastral).toUpperCase() : undefined,
        motivoSituacaoCadastral: data.descricao_motivo_situacao_cadastral ? String(data.descricao_motivo_situacao_cadastral).toUpperCase() : undefined
      }
    };
  } catch (error: any) {
    console.error('[AgilizaVISA] Falha na consulta:', error);
    if (error?.name === 'AbortError') return { success: false, error: "A CONSULTA DEMOROU MUITO (TIMEOUT). TENTE NOVAMENTE." };
    const causa = error?.message ? ` (${String(error.message).slice(0, 120)})` : '';
    return { success: false, error: `FALHA TÉCNICA NA COMUNICAÇÃO EXTERNA.${causa}` };
  }
}
