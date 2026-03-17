/**
 * Validações de ambiente executadas antes de subir o HTTP server.
 * Em produção, falha rápido se secrets estiverem inaceitáveis.
 */
const WEAK_JWT_SECRETS = new Set([
  '',
  'change-me-in-production',
  'your-very-secure-secret-key-minimum-32-characters',
]);

const MIN_JWT_SECRET_LENGTH = 32;

export function validateBootstrapEnv(): void {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  if (nodeEnv !== 'production') {
    return;
  }

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || WEAK_JWT_SECRETS.has(secret)) {
    throw new Error(
      '[SECURITY] Em produção, JWT_SECRET é obrigatório e não pode ser o valor padrão de desenvolvimento. ' +
        'Defina uma chave forte (mín. 32 caracteres) via variável de ambiente.',
    );
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `[SECURITY] Em produção, JWT_SECRET deve ter pelo menos ${MIN_JWT_SECRET_LENGTH} caracteres.`,
    );
  }
}
