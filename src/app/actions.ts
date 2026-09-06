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
    if (cleaned.length !== 14) return { success: false, error: "CNPJ inválido: são necessários 14 números. Confira o número digitado." };

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

    if (res.status === 404) return { success: false, error: "CNPJ não encontrado na base da Receita Federal. Confira o número digitado." };
    if (res.status === 400) return { success: false, error: "A base federal recusou este CNPJ por formato inválido. Confira o número digitado. (HTTP 400)" };
    if (res.status === 429) return { success: false, error: "A base federal atingiu o limite de consultas no momento. Aguarde alguns minutos e tente novamente. (HTTP 429)" };
    if (res.status >= 500) return { success: false, error: `A base federal está fora do ar no momento. Tente novamente em alguns minutos. (HTTP ${res.status})` };

    // O corpo da resposta é diagnóstico: vai para o console, nunca para a tela — despejar
    // o JSON cru da API ao usuário não diz nada a quem só quer saber se pode abrir a empresa.
    // O status fica na mensagem para tornar o relato do usuário diagnosticável.
    if (!res.ok) {
      let corpo = '';
      try {
        corpo = (await res.text()).slice(0, 200);
      } catch {
        /* corpo ilegível não impede o diagnóstico pelo status */
      }
      console.error('[AgilizaVISA] BrasilAPI respondeu', res.status, corpo);
      return { success: false, error: `A base federal não respondeu à consulta agora. Tente novamente em alguns instantes. (HTTP ${res.status})` };
    }

    const data = await res.json();
    if (!data || typeof data !== 'object') return { success: false, error: "A base federal devolveu uma resposta inesperada. Tente novamente em alguns instantes." };

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
    if (error?.name === 'AbortError') return { success: false, error: "A consulta à base federal demorou demais para responder. Tente novamente." };
    return { success: false, error: "Falha de comunicação com a base federal. Verifique sua conexão e tente novamente em alguns instantes." };
  }
}
