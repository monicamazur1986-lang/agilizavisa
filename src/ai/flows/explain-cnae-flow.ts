
'use server';

/**
 * @fileOverview Fluxo de IA para explicar riscos sanitários.
 */

import { ai, z } from '@/ai/genkit';

const ExplainCnaeInputSchema = z.object({
  cnaeCode: z.string().describe('O código CNAE da empresa.'),
  description: z.string().describe('A descrição da atividade econômica.'),
  riskLevel: z.string().describe('O nível de risco identificado (BAIXO, MEDIO, ALTO).'),
});

export type ExplainCnaeInput = z.infer<typeof ExplainCnaeInputSchema>;

const ExplainCnaeOutputSchema = z.object({
  explanation: z.string().describe('Uma explicação simples e amigável sobre por que essa atividade tem esse risco.'),
  tips: z.array(z.string()).describe('Dicas de conformidade sanitária para o empreendedor.'),
});

export type ExplainCnaeOutput = z.infer<typeof ExplainCnaeOutputSchema>;

const prompt = ai.definePrompt({
  name: 'explainCnaePrompt',
  input: { schema: ExplainCnaeInputSchema },
  output: { schema: ExplainCnaeOutputSchema },
  prompt: `Você é um consultor técnico da Vigilância Sanitária do Paraná.
  O usuário consultou o CNAE {{{cnaeCode}}} ({{{description}}}), que foi classificado como {{{riskLevel}}}.
  
  Explique de forma pedagógica e profissional:
  1. Por que essa atividade é classificada dessa forma segundo a Resolução SESA 1034/2020.
  2. Quais os principais cuidados que o empreendedor deve ter.
  3. Dê 3 dicas práticas de higiene ou organização documental.
  
  Mantenha um tom encorajador e técnico. Use CAIXA ALTA para termos importantes.`,
});

export const explainCnaeFlow = ai.defineFlow(
  {
    name: 'explainCnaeFlow',
    inputSchema: ExplainCnaeInputSchema,
    outputSchema: ExplainCnaeOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function explainCnae(input: ExplainCnaeInput): Promise<ExplainCnaeOutput> {
  return explainCnaeFlow(input);
}
