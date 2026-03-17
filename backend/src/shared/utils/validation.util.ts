/**
 * Utilitários de validação comuns para todos os módulos
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DEFAULT_COMPANY_ID } from '../constants/company.constants';

// Re-exportar constante de company para conveniência
export { DEFAULT_COMPANY_ID };

/**
 * Mensagens de erro padronizadas
 */
export const ERROR_MESSAGES = {
  COMPANY_NOT_FOUND: 'Empresa não encontrada',
  BRANCH_NOT_FOUND: 'Filial não encontrada',
  COMPANY_REQUIRED: 'ID da empresa é obrigatório',
  BRANCH_REQUIRED: 'ID da filial é obrigatório',
  INVALID_ID: 'ID inválido',
  RECORD_NOT_FOUND: 'Registro não encontrado',
  ALREADY_EXISTS: 'Registro já existe',
  ALREADY_DELETED: 'Registro já foi excluído',
} as const;

/**
 * Valida se um ID obrigatório foi fornecido
 *
 * @param id - ID a ser validado
 * @param fieldName - Nome do campo para mensagem de erro
 * @throws BadRequestException se o ID não for fornecido
 */
export function requireId(
  id: string | null | undefined,
  fieldName: string = 'ID',
): asserts id is string {
  if (!id) {
    throw new BadRequestException(`${fieldName} é obrigatório`);
  }
}

/**
 * Valida se o companyId é válido
 *
 * @param companyId - ID da empresa
 * @throws BadRequestException se o companyId não for fornecido
 */
export function requireCompanyId(
  companyId: string | null | undefined,
): asserts companyId is string {
  if (!companyId) {
    throw new BadRequestException(ERROR_MESSAGES.COMPANY_REQUIRED);
  }
}

/**
 * Valida se o branchId é válido
 *
 * @param branchId - ID da filial
 * @throws BadRequestException se o branchId não for fornecido
 */
export function requireBranchId(branchId: string | null | undefined): asserts branchId is string {
  if (!branchId) {
    throw new BadRequestException(ERROR_MESSAGES.BRANCH_REQUIRED);
  }
}

/**
 * Valida se um registro existe
 *
 * @param record - Registro a ser validado
 * @param entityName - Nome da entidade para mensagem de erro
 * @throws NotFoundException se o registro não existir
 */
export function requireRecord<T>(
  record: T | null | undefined,
  entityName: string = 'Registro',
): asserts record is T {
  if (!record) {
    throw new NotFoundException(`${entityName} não encontrado(a)`);
  }
}

/**
 * Valida se um registro não foi excluído (soft delete)
 *
 * @param record - Registro com campo deletedAt
 * @param entityName - Nome da entidade para mensagem de erro
 * @throws NotFoundException se o registro já foi excluído
 */
export function requireNotDeleted<T extends { deletedAt?: Date | null }>(
  record: T | null | undefined,
  entityName: string = 'Registro',
): asserts record is T {
  if (!record) {
    throw new NotFoundException(`${entityName} não encontrado(a)`);
  }
  if (record.deletedAt) {
    throw new NotFoundException(`${entityName} já foi excluído(a)`);
  }
}

/**
 * Obtém o companyId efetivo (do usuário ou DEFAULT)
 *
 * @param userCompanyId - CompanyId do usuário
 * @returns CompanyId efetivo
 */
export function getEffectiveCompanyId(userCompanyId?: string | null): string {
  return userCompanyId || DEFAULT_COMPANY_ID;
}

/**
 * Valida UUID
 *
 * @param id - ID a ser validado
 * @returns true se for um UUID válido
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Também aceita cuid (formato do Prisma)
  const cuidRegex = /^c[a-z0-9]{24,}$/i;
  return uuidRegex.test(id) || cuidRegex.test(id);
}

/**
 * Garante que a nova quilometragem nunca retroceda em relação ao valor atual.
 * Regra de domínio: só o cadastro inicial do veículo pode partir de qualquer KM >= 0.
 */
export function validateNonDecreasingKm(
  newKm: number,
  currentKm: number | null | undefined,
  context: string = 'neste fluxo',
): void {
  if (currentKm == null) {
    return;
  }

  const previousKm = Number(currentKm);
  if (newKm < previousKm) {
    throw new BadRequestException(
      `A quilometragem informada (${newKm}) não pode ser menor que a quilometragem atual (${previousKm}) ${context}.`,
    );
  }
}

/**
 * Variante para operações em combo de veículos (1..N): bloqueia se a nova KM
 * for menor que a maior KM atual entre os veículos envolvidos.
 */
export function validateNonDecreasingKmForVehicles(
  newKm: number,
  currentKms: Array<number | null | undefined>,
  context: string = 'neste fluxo',
): void {
  const validKms = currentKms.filter((km): km is number => km != null).map((km) => Number(km));

  if (validKms.length === 0) {
    return;
  }

  const highestCurrentKm = Math.max(...validKms);
  if (newKm < highestCurrentKm) {
    throw new BadRequestException(
      `A quilometragem informada (${newKm}) não pode ser menor que a maior quilometragem atual dos veículos (${highestCurrentKm}) ${context}.`,
    );
  }
}
