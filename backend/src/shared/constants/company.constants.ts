/**
 * Constante da Empresa Padrão do Sistema
 * 
 * Esta constante armazena o ID da empresa única do sistema.
 * O sistema funciona como single-tenant, mas está preparado
 * para se tornar SaaS no futuro.
 * 
 * IMPORTANTE: Este ID é fixo e deve ser usado em todos os
 * services e repositories que precisam de empresa_id.
 * 
 * Este arquivo é gerado automaticamente pelo setup-admin.
 * NÃO edite manualmente.
 */

export const DEFAULT_COMPANY_ID = 'e4fab3fc-3c59-4ba5-97e8-9dadf00614a5';

/**
 * Valida se o DEFAULT_COMPANY_ID está configurado
 */
export function validateDefaultCompanyId(): void {
  if (!DEFAULT_COMPANY_ID) {
    throw new Error(
      'DEFAULT_COMPANY_ID não está configurado. Execute o setup-admin primeiro.',
    );
  }
}
