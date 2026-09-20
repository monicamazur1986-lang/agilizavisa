import { analyzeRisk, resolveCnaeRisk } from './risk-analysis';
import type { Cnae } from './types';

// Códigos reais do rol oficial (src/lib/cnae-risk.json), escolhidos por serem
// enquadramentos "limpos" — sem nota condicional nem conflito com outro nível.
const CNAE_BAIXO = '1622-6/01'; // Baixo Risco, sem condição
const CNAE_MEDIO = '1091-1/02'; // Médio Risco
const CNAE_ALTO = '0892-4/03'; // Alto Risco, com PBA
const CNAE_CONDICIONADO = '1031-7/00'; // Sim -> ALTO, Não -> MEDIO

describe('resolveCnaeRisk', () => {
  it('retorna NÃO ENCONTRADO para um código fora do rol', () => {
    const result = resolveCnaeRisk('0000-0/00', {});
    expect(result.risk).toBe('NÃO ENCONTRADO');
  });

  it('classifica um CNAE de Baixo Risco', () => {
    const result = resolveCnaeRisk(CNAE_BAIXO, {});
    expect(result.risk).toBe('BAIXO');
  });

  it('classifica um CNAE de Médio Risco', () => {
    const result = resolveCnaeRisk(CNAE_MEDIO, {});
    expect(result.risk).toBe('MEDIO');
  });

  it('classifica um CNAE de Alto Risco e sinaliza a exigência de PBA', () => {
    const result = resolveCnaeRisk(CNAE_ALTO, {});
    expect(result.risk).toBe('ALTO');
    expect(result.requiresPba).toBe(true);
  });

  it('retorna CONDICIONADO com a pergunta pendente quando não há resposta', () => {
    const result = resolveCnaeRisk(CNAE_CONDICIONADO, {});
    expect(result.risk).toBe('CONDICIONADO');
    expect(result.question).toBeTruthy();
    expect(result.path).toBeTruthy();
  });

  it('resolve um CNAE condicionado para ALTO com a resposta "Sim"', () => {
    const pending = resolveCnaeRisk(CNAE_CONDICIONADO, {});
    const result = resolveCnaeRisk(CNAE_CONDICIONADO, { [pending.path!]: 'Sim' });
    expect(result.risk).toBe('ALTO');
  });

  it('resolve um CNAE condicionado para MEDIO com a resposta "Não"', () => {
    const pending = resolveCnaeRisk(CNAE_CONDICIONADO, {});
    const result = resolveCnaeRisk(CNAE_CONDICIONADO, { [pending.path!]: 'Não' });
    expect(result.risk).toBe('MEDIO');
  });
});

describe('analyzeRisk', () => {
  it('retorna NÃO ENCONTRADO para uma lista vazia de CNAEs', () => {
    const result = analyzeRisk([], {});
    expect(result.level).toBe('NÃO ENCONTRADO');
  });

  it('prevalece o risco mais restritivo entre múltiplos CNAEs', () => {
    const cnaes: Cnae[] = [
      { code: CNAE_BAIXO, description: 'Baixo' },
      { code: CNAE_ALTO, description: 'Alto' },
    ];
    const result = analyzeRisk(cnaes, {});
    expect(result.level).toBe('ALTO');
    expect(result.requiresPba).toBe(true);
  });

  it('classifica como CONDICIONADO quando há CNAE condicionado sem resposta, mesmo com outro de risco menor', () => {
    const cnaes: Cnae[] = [
      { code: CNAE_BAIXO, description: 'Baixo' },
      { code: CNAE_CONDICIONADO, description: 'Condicionado' },
    ];
    const result = analyzeRisk(cnaes, {});
    expect(result.level).toBe('CONDICIONADO');
    expect(result.unresolved).toHaveLength(1);
  });

  it('resolve para o nível final depois de respondida a pergunta condicionada', () => {
    const cnaes: Cnae[] = [{ code: CNAE_CONDICIONADO, description: 'Condicionado' }];
    const pending = resolveCnaeRisk(CNAE_CONDICIONADO, {});
    const result = analyzeRisk(cnaes, { [pending.path!]: 'Não' });
    expect(result.level).toBe('MEDIO');
    expect(result.unresolved).toHaveLength(0);
  });
});
