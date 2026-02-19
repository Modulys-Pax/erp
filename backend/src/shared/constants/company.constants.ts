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
 * Este arquivo é gerado automaticamente pelo seed.
 * NÃO edite manualmente.
 */

export const DEFAULT_COMPANY_ID = 'b38238ce-aa2a-4f48-be64-70e71ddefe0a';

/**
 * Valida se o DEFAULT_COMPANY_ID está configurado
 */
export function validateDefaultCompanyId(): void {
  if (!DEFAULT_COMPANY_ID) {
    throw new Error(
      'DEFAULT_COMPANY_ID não está configurado. Execute o seed primeiro.',
    );
  }
}
