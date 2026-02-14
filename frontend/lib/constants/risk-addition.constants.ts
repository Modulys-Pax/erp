/**
 * Constantes para adicionais de risco (Insalubridade e Periculosidade).
 * CLT: não é permitido acumular os dois; o trabalhador recebe um ou outro (o mais vantajoso).
 *
 * Insalubridade: percentuais sobre o salário mínimo (NR-15). Valores 2025/2026 (SM R$ 1.518,00).
 * Periculosidade: 30% sobre o salário base do trabalhador (Art. 193 CLT).
 */

export const RISK_ADDITION_TYPES = ['INSALUBRIDADE', 'PERICULOSIDADE'] as const;
export type RiskAdditionType = (typeof RISK_ADDITION_TYPES)[number];

export const INSALUBRITY_DEGREES = ['MINIMO', 'MEDIO', 'MAXIMO'] as const;
export type InsalubrityDegree = (typeof INSALUBRITY_DEGREES)[number];

/** Salário mínimo nacional 2025 (reajuste jan/2025) */
export const MINIMUM_WAGE_2025 = 1518.0;

/** Percentual do adicional de periculosidade (Art. 193 CLT) */
export const PERICULOSITY_PERCENT = 0.3; // 30%

/** Labels e valores de insalubridade (2025/2026) */
export const INSALUBRITY_OPTIONS: Record<
  InsalubrityDegree,
  { label: string; percent: number; valueMonthly: number; example: string }
> = {
  MINIMO: {
    label: 'Mínimo (10%)',
    percent: 10,
    valueMonthly: 151.8,
    example: 'Ruído moderado, umidade excessiva',
  },
  MEDIO: {
    label: 'Médio (20%)',
    percent: 20,
    valueMonthly: 303.6,
    example: 'Agentes químicos, poeiras, agentes biológicos',
  },
  MAXIMO: {
    label: 'Máximo (40%)',
    percent: 40,
    valueMonthly: 607.2,
    example: 'Contato permanente com esgotos, lixo, agentes infectocontagiosos',
  },
};

export const RISK_ADDITION_LABELS: Record<RiskAdditionType, string> = {
  INSALUBRIDADE: 'Insalubridade',
  PERICULOSIDADE: 'Periculosidade (30% sobre o salário base)',
};
