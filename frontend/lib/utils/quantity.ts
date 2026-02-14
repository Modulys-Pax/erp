/**
 * Formatação e validação de quantidade conforme unidade de medida.
 * UN/PC/CX etc. → inteiros (0 decimais); L, KG, M, M2, M3 → decimais (2–3 casas).
 */

/** Códigos de unidade que usam quantidade inteira (sem decimais). */
const INTEGER_UNIT_CODES = new Set([
  'UN', 'UNID', 'UNIDADE', 'PC', 'PÇ', 'PECA', 'CX', 'CAIXA', 'FD', 'FARDO',
  'PCT', 'PACOTE', 'SC', 'SACO', 'KIT', 'PAR', 'JR', 'JOGO', 'LT', 'LATA',
]);

/**
 * Retorna o número de casas decimais para exibir/editar quantidade conforme a unidade.
 * UN/PC/CX → 0; L, KG, M, M2, M3 → 2 (ou 3 para precisão maior).
 */
export function getQuantityDecimals(unitCode?: string | null): number {
  if (!unitCode || typeof unitCode !== 'string') return 2; // padrão seguro
  const upper = unitCode.trim().toUpperCase();
  if (INTEGER_UNIT_CODES.has(upper)) return 0;
  // L, KG, M, M2, M3, etc.
  if (['L', 'LITRO', 'KG', 'QUILO', 'G', 'M', 'M2', 'M3', 'ML'].some((u) => upper.startsWith(u) || upper === u))
    return 2;
  return 2;
}

/**
 * Indica se a unidade usa apenas valores inteiros (sem vírgula/decimais).
 */
export function isIntegerUnit(unitCode?: string | null): boolean {
  return getQuantityDecimals(unitCode) === 0;
}

/**
 * Step recomendado para input type="number" conforme a unidade.
 * UN → "1" (só inteiros); L/KG → "0.01" (permite vírgula/decimais).
 */
export function getQuantityInputStep(unitCode?: string | null): string {
  const decimals = getQuantityDecimals(unitCode);
  if (decimals === 0) return '1';
  if (decimals === 1) return '0.1';
  return '0.01';
}

/**
 * Valor mínimo para input de quantidade: UN → "1"; L/KG → "0.01".
 */
export function getQuantityInputMin(unitCode?: string | null): string {
  return isIntegerUnit(unitCode) ? '1' : '0.01';
}

/**
 * inputMode para o input: "numeric" (inteiros) ou "decimal" (permite vírgula no teclado).
 */
export function getQuantityInputMode(unitCode?: string | null): 'numeric' | 'decimal' {
  return isIntegerUnit(unitCode) ? 'numeric' : 'decimal';
}

/**
 * Formata valor para exibição na máscara do input (inteiro: "1.000"; decimal: "1.234,56").
 */
export function formatQuantityMaskDisplay(
  value: number,
  unitCode?: string | null,
): string {
  if (Number.isNaN(value) || value < 0) return '';
  const decimals = getQuantityDecimals(unitCode);
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Remove caracteres não numéricos e retorna o valor numérico a partir do texto da máscara.
 * Inteiro: só dígitos; decimal: dígitos / 100 (como moeda).
 */
export function parseQuantityMaskInput(
  raw: string,
  unitCode?: string | null,
): number | undefined {
  const numbers = raw.replace(/\D/g, '');
  if (!numbers) return undefined;
  if (isIntegerUnit(unitCode)) {
    const n = parseInt(numbers, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  const n = parseInt(numbers, 10) / 100;
  return Number.isNaN(n) ? undefined : Math.round(n * 100) / 100;
}

/**
 * Normaliza a quantidade conforme a unidade: em UN/PC/CX arredonda para inteiro;
 * em L/KG etc. mantém até 2 decimais. Use ao salvar/atualizar o valor do input.
 */
export function normalizeQuantityByUnit(
  value: number | string | null | undefined,
  unitCode?: string | null,
): number {
  const num = value === null || value === undefined ? 0 : Number(value);
  if (Number.isNaN(num) || num < 0) return 0;
  const decimals = getQuantityDecimals(unitCode);
  if (decimals === 0) return Math.round(num);
  if (decimals === 1) return Math.round(num * 10) / 10;
  return Math.round(num * 100) / 100;
}

/**
 * Formata quantidade para exibição conforme a unidade de medida.
 * @param value - Valor numérico
 * @param unitCode - Código da unidade (ex: UN, L, KG)
 * @param options - showUnit: se true, append " L" / " UN" etc.
 */
export function formatQuantity(
  value: number | string | null | undefined,
  unitCode?: string | null,
  options?: { showUnit?: boolean },
): string {
  const num = value === null || value === undefined ? 0 : Number(value);
  if (Number.isNaN(num)) return '0';
  const decimals = getQuantityDecimals(unitCode);
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
  if (options?.showUnit !== false && unitCode) {
    const u = String(unitCode).trim();
    return u ? `${formatted} ${u}` : formatted;
  }
  return formatted;
}

/**
 * Nome amigável da unidade para exibição (ex: L → Litro, UN → Unidade).
 * Útil quando não se quer mostrar o código.
 */
export function getUnitDisplayName(unitCode?: string | null): string {
  if (!unitCode || typeof unitCode !== 'string') return 'Unidade';
  const upper = unitCode.trim().toUpperCase();
  const map: Record<string, string> = {
    UN: 'Unidade',
    UNID: 'Unidade',
    L: 'Litro',
    LITRO: 'Litros',
    KG: 'Quilograma',
    QUILO: 'Quilogramas',
    G: 'Grama',
    M: 'Metro',
    M2: 'm²',
    M3: 'm³',
    ML: 'Mililitro',
    PC: 'Peça',
    PÇ: 'Peça',
    CX: 'Caixa',
    FD: 'Fardo',
    PCT: 'Pacote',
  };
  return map[upper] ?? unitCode;
}
