/**
 * Constantes para adicionais de risco (Insalubridade e Periculosidade).
 * CLT: não é permitido acumular os dois; o trabalhador recebe um ou outro (o mais vantajoso).
 *
 * Insalubridade: percentuais sobre o salário mínimo (NR-15).
 * Periculosidade: 30% sobre o salário base do trabalhador (Art. 193 CLT).
 */

export const RISK_ADDITION_TYPES = ['INSALUBRIDADE', 'PERICULOSIDADE'] as const;
export type RiskAdditionType = (typeof RISK_ADDITION_TYPES)[number];

export const INSALUBRITY_DEGREES = ['MINIMO', 'MEDIO', 'MAXIMO'] as const;
export type InsalubrityDegree = (typeof INSALUBRITY_DEGREES)[number];

/** Salário mínimo nacional 2025 (reajuste jan/2025) - base para insalubridade */
export const MINIMUM_WAGE_2025 = 1518.0;

/** Percentuais de insalubridade por grau (sobre o salário mínimo) */
export const INSALUBRITY_PERCENT_BY_DEGREE: Record<InsalubrityDegree, number> = {
  MINIMO: 0.1,  // 10%  -> R$ 151,80
  MEDIO: 0.2,   // 20%  -> R$ 303,60
  MAXIMO: 0.4,  // 40%  -> R$ 607,20
};

/** Valores mensais aproximados do adicional de insalubridade (2025) */
export const INSALUBRITY_MONTHLY_VALUE_2025: Record<InsalubrityDegree, number> = {
  MINIMO: 151.8,
  MEDIO: 303.6,
  MAXIMO: 607.2,
};

/** Percentual do adicional de periculosidade (Art. 193 CLT) - sobre o salário base */
export const PERICULOSITY_PERCENT = 0.3; // 30%

/**
 * Calcula o valor mensal do adicional de risco (insalubridade ou periculosidade).
 * Integra base de cálculo para INSS e FGTS (remuneração).
 *
 * @param riskAdditionType - INSALUBRIDADE | PERICULOSIDADE
 * @param insalubrityDegree - obrigatório quando riskAdditionType = INSALUBRIDADE
 * @param monthlySalary - salário base (usado para periculosidade: 30% sobre este valor)
 * @returns valor mensal do adicional ou 0
 */
export function calculateRiskAdditionAmount(
  riskAdditionType: string | null | undefined,
  insalubrityDegree: string | null | undefined,
  monthlySalary: number,
): number {
  if (!riskAdditionType) return 0;
  if (riskAdditionType === 'PERICULOSIDADE') {
    return monthlySalary * PERICULOSITY_PERCENT;
  }
  if (riskAdditionType === 'INSALUBRIDADE' && insalubrityDegree && insalubrityDegree in INSALUBRITY_MONTHLY_VALUE_2025) {
    return INSALUBRITY_MONTHLY_VALUE_2025[insalubrityDegree as InsalubrityDegree];
  }
  return 0;
}

/** Labels de grau para exibição (folha, custos, etc.) */
const INSALUBRITY_DEGREE_LABELS: Record<InsalubrityDegree, string> = {
  MINIMO: 'Mínimo',
  MEDIO: 'Médio',
  MAXIMO: 'Máximo',
};

/**
 * Retorna o nome de exibição do adicional de risco para uso em folha, custos e relatórios.
 * Ex: "Periculosidade" ou "Insalubridade (Médio)"
 */
export function getRiskAdditionDisplayName(
  riskAdditionType: string | null | undefined,
  insalubrityDegree: string | null | undefined,
): string {
  if (!riskAdditionType) return '';
  if (riskAdditionType === 'PERICULOSIDADE') return 'Periculosidade';
  if (riskAdditionType === 'INSALUBRIDADE' && insalubrityDegree && insalubrityDegree in INSALUBRITY_DEGREE_LABELS) {
    return `Insalubridade (${INSALUBRITY_DEGREE_LABELS[insalubrityDegree as InsalubrityDegree]})`;
  }
  return 'Insalubridade';
}
