
import { analyzeCnaes } from './risk-analysis';
import type { Cnae } from '../app/actions';

// Mock do cnae-risk.json para isolar os testes
jest.mock('./cnae-risk.json', () => ({
  "risks": {
    "ALTO": {
      "message": "ALTO RISCO",
      "cnaes": [{ "code": "1011-2/01", "description": "Frigorífico - abate de bovinos" }]
    },
    "MEDIO": {
      "message": "MÉDIO RISCO",
      "cnaes": []
    },
    "BAIXO": {
      "message": "BAIXO RISCO",
      "cnaes": [{ "code": "0111-3/01", "description": "Cultivo de arroz" }]
    },
    "CONDICIONADO": {
      "cnaes": [
        {
          "code": "4711-3/01",
          "description": "Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - hipermercados",
          "question": "A edificação possui área construída acima de 900m²?",
          "outcomes": {
            "Sim": "ALTO",
            "Não": "MEDIO"
          }
        }
      ]
    }
  }
}), { virtual: true });

describe('analyzeCnaes', () => {
  it('should return "NÃO ENCONTRADO" for an empty CNAE list', () => {
    const result = analyzeCnaes([]);
    expect(result.overallRisk).toBe('NÃO ENCONTRADO');
    expect(result.message).toBe('Análise concluída.');
  });

  it('should return "BAIXO" for a single CNAE with low risk', () => {
    const cnaes: Cnae[] = [{ code: '0111-3/01', description: 'Cultivo de arroz' }];
    const result = analyzeCnaes(cnaes);
    expect(result.overallRisk).toBe('BAIXO');
  });

  it('should return "ALTO" when at least one CNAE has high risk', () => {
    const cnaes: Cnae[] = [
      { code: '0111-3/01', description: 'Cultivo de arroz' }, // BAIXO
      { code: '1011-2/01', description: 'Frigorífico - abate de bovinos' }, // ALTO
    ];
    const result = analyzeCnaes(cnaes);
    expect(result.overallRisk).toBe('ALTO');
  });

  it('should return "CONDICIONADO" for a conditional CNAE without answers', () => {
    const cnaes: Cnae[] = [{ code: '4711-3/01', description: 'Hipermercado' }];
    const result = analyzeCnaes(cnaes);
    expect(result.overallRisk).toBe('CONDICIONADO');
    expect(result.unresolvedCnaes).toHaveLength(1);
    expect(result.unresolvedCnaes[0].question).toBe('A edificação possui área construída acima de 900m²?');
  });

  it('should resolve a conditional CNAE to "MEDIO" with the correct answer', () => {
    const cnaes: Cnae[] = [{ code: '4711-3/01', description: 'Hipermercado' }];
    const answers = { '4711-3/01': 'Não' };
    const result = analyzeCnaes(cnaes, answers);
    expect(result.overallRisk).toBe('MEDIO');
    expect(result.unresolvedCnaes).toHaveLength(0);
  });

    it('should resolve a conditional CNAE to "ALTO" with the correct answer', () => {
    const cnaes: Cnae[] = [{ code: '4711-3/01', description: 'Hipermercado' }];
    const answers = { '4711-3/01': 'Sim' };
    const result = analyzeCnaes(cnaes, answers);
    expect(result.overallRisk).toBe('ALTO');
    expect(result.unresolvedCnaes).toHaveLength(0);
  });
});
