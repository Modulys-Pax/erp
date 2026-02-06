/**
 * Máscaras para campos de formulário (CNPJ/CPF, telefone).
 * Retorna apenas dígitos para o valor bruto; formata para exibição.
 */

const DIGITS_ONLY = /\D/g;

export function formatCnpjCpf(value: string): string {
  const digits = value.replace(DIGITS_ONLY, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
      [a, b, c].filter(Boolean).join('.') + (d ? `-${d}` : '')
    );
  }
  return digits.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,
    (_, a, b, c, d, e) =>
      `${a}.${b}.${c}/${d}` + (e ? `-${e}` : '')
  );
}

export function formatPhone(value: string): string {
  const digits = value.replace(DIGITS_ONLY, '').slice(0, 11);
  if (digits.length <= 2) {
    return digits ? `(${digits}` : '';
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function getUnmaskedDocument(value: string): string {
  return value.replace(DIGITS_ONLY, '');
}

export function getUnmaskedPhone(value: string): string {
  return value.replace(DIGITS_ONLY, '');
}
