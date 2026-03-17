import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  requireId,
  requireCompanyId,
  requireBranchId,
  requireRecord,
  requireNotDeleted,
  getEffectiveCompanyId,
  isValidUUID,
  validateNonDecreasingKm,
  validateNonDecreasingKmForVehicles,
  ERROR_MESSAGES,
  DEFAULT_COMPANY_ID,
} from './validation.util';

describe('validation.util', () => {
  describe('ERROR_MESSAGES', () => {
    it('deve ter todas as mensagens de erro', () => {
      expect(ERROR_MESSAGES.COMPANY_NOT_FOUND).toBe('Empresa não encontrada');
      expect(ERROR_MESSAGES.BRANCH_NOT_FOUND).toBe('Filial não encontrada');
      expect(ERROR_MESSAGES.COMPANY_REQUIRED).toBe('ID da empresa é obrigatório');
      expect(ERROR_MESSAGES.BRANCH_REQUIRED).toBe('ID da filial é obrigatório');
      expect(ERROR_MESSAGES.INVALID_ID).toBe('ID inválido');
      expect(ERROR_MESSAGES.RECORD_NOT_FOUND).toBe('Registro não encontrado');
      expect(ERROR_MESSAGES.ALREADY_EXISTS).toBe('Registro já existe');
      expect(ERROR_MESSAGES.ALREADY_DELETED).toBe('Registro já foi excluído');
    });
  });

  describe('requireId', () => {
    it('não deve lançar erro quando ID é válido', () => {
      expect(() => requireId('valid-id')).not.toThrow();
    });

    it('deve lançar erro quando ID é null', () => {
      expect(() => requireId(null)).toThrow(BadRequestException);
      expect(() => requireId(null)).toThrow('ID é obrigatório');
    });

    it('deve lançar erro quando ID é undefined', () => {
      expect(() => requireId(undefined)).toThrow(BadRequestException);
    });

    it('deve lançar erro quando ID é string vazia', () => {
      expect(() => requireId('')).toThrow(BadRequestException);
    });

    it('deve usar fieldName personalizado na mensagem', () => {
      expect(() => requireId(null, 'userId')).toThrow('userId é obrigatório');
    });
  });

  describe('requireCompanyId', () => {
    it('não deve lançar erro quando companyId é válido', () => {
      expect(() => requireCompanyId('company-123')).not.toThrow();
    });

    it('deve lançar erro quando companyId é null', () => {
      expect(() => requireCompanyId(null)).toThrow(BadRequestException);
      expect(() => requireCompanyId(null)).toThrow(ERROR_MESSAGES.COMPANY_REQUIRED);
    });

    it('deve lançar erro quando companyId é undefined', () => {
      expect(() => requireCompanyId(undefined)).toThrow(BadRequestException);
    });
  });

  describe('requireBranchId', () => {
    it('não deve lançar erro quando branchId é válido', () => {
      expect(() => requireBranchId('branch-123')).not.toThrow();
    });

    it('deve lançar erro quando branchId é null', () => {
      expect(() => requireBranchId(null)).toThrow(BadRequestException);
      expect(() => requireBranchId(null)).toThrow(ERROR_MESSAGES.BRANCH_REQUIRED);
    });

    it('deve lançar erro quando branchId é undefined', () => {
      expect(() => requireBranchId(undefined)).toThrow(BadRequestException);
    });
  });

  describe('requireRecord', () => {
    it('não deve lançar erro quando registro existe', () => {
      expect(() => requireRecord({ id: '1' })).not.toThrow();
    });

    it('deve lançar erro quando registro é null', () => {
      expect(() => requireRecord(null)).toThrow(NotFoundException);
      expect(() => requireRecord(null)).toThrow('Registro não encontrado(a)');
    });

    it('deve lançar erro quando registro é undefined', () => {
      expect(() => requireRecord(undefined)).toThrow(NotFoundException);
    });

    it('deve usar entityName personalizado na mensagem', () => {
      expect(() => requireRecord(null, 'Usuário')).toThrow('Usuário não encontrado(a)');
    });
  });

  describe('requireNotDeleted', () => {
    it('não deve lançar erro quando registro existe e não foi deletado', () => {
      expect(() => requireNotDeleted({ id: '1', deletedAt: null })).not.toThrow();
    });

    it('não deve lançar erro quando deletedAt é undefined', () => {
      expect(() => requireNotDeleted({ deletedAt: undefined })).not.toThrow();
    });

    it('deve lançar erro quando registro é null', () => {
      expect(() => requireNotDeleted(null)).toThrow(NotFoundException);
      expect(() => requireNotDeleted(null)).toThrow('Registro não encontrado(a)');
    });

    it('deve lançar erro quando registro foi deletado', () => {
      expect(() => requireNotDeleted({ id: '1', deletedAt: new Date() })).toThrow(
        NotFoundException,
      );
      expect(() => requireNotDeleted({ id: '1', deletedAt: new Date() })).toThrow(
        'Registro já foi excluído(a)',
      );
    });

    it('deve usar entityName personalizado na mensagem', () => {
      expect(() => requireNotDeleted(null, 'Empresa')).toThrow('Empresa não encontrado(a)');
      expect(() => requireNotDeleted({ deletedAt: new Date() }, 'Empresa')).toThrow(
        'Empresa já foi excluído(a)',
      );
    });
  });

  describe('getEffectiveCompanyId', () => {
    it('deve retornar companyId do usuário quando fornecido', () => {
      expect(getEffectiveCompanyId('user-company')).toBe('user-company');
    });

    it('deve retornar DEFAULT_COMPANY_ID quando null', () => {
      expect(getEffectiveCompanyId(null)).toBe(DEFAULT_COMPANY_ID);
    });

    it('deve retornar DEFAULT_COMPANY_ID quando undefined', () => {
      expect(getEffectiveCompanyId(undefined)).toBe(DEFAULT_COMPANY_ID);
    });

    it('deve retornar DEFAULT_COMPANY_ID quando não fornecido', () => {
      expect(getEffectiveCompanyId()).toBe(DEFAULT_COMPANY_ID);
    });
  });

  describe('isValidUUID', () => {
    it('deve validar UUID v4 válido', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('deve validar CUID válido', () => {
      expect(isValidUUID('cjld2cyuq0000t3rmniod1foy')).toBe(true);
      expect(isValidUUID('cm123456789012345678901234')).toBe(true);
    });

    it('deve rejeitar strings inválidas', () => {
      expect(isValidUUID('invalid')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });

    it('deve rejeitar UUID malformado', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
    });
  });

  describe('validateNonDecreasingKm', () => {
    it('nao deve lancar erro quando km aumenta', () => {
      expect(() => validateNonDecreasingKm(60000, 50000)).not.toThrow();
    });

    it('nao deve lancar erro quando km permanece igual', () => {
      expect(() => validateNonDecreasingKm(50000, 50000)).not.toThrow();
    });

    it('nao deve lancar erro quando km atual e nulo', () => {
      expect(() => validateNonDecreasingKm(100, null)).not.toThrow();
    });

    it('deve lancar BadRequestException quando nova km retrocede', () => {
      expect(() => validateNonDecreasingKm(49999, 50000)).toThrow(BadRequestException);
      expect(() => validateNonDecreasingKm(49999, 50000)).toThrow(
        'não pode ser menor que a quilometragem atual',
      );
    });
  });

  describe('validateNonDecreasingKmForVehicles', () => {
    it('nao deve lancar erro quando nova km e maior que todas as atuais', () => {
      expect(() => validateNonDecreasingKmForVehicles(51000, [50000, 50500, 50900])).not.toThrow();
    });

    it('deve lancar BadRequestException quando nova km e menor que a maior atual', () => {
      expect(() => validateNonDecreasingKmForVehicles(50999, [50000, 51000, 49000])).toThrow(
        BadRequestException,
      );
      expect(() => validateNonDecreasingKmForVehicles(50999, [50000, 51000, 49000])).toThrow(
        'não pode ser menor que a maior quilometragem atual dos veículos',
      );
    });
  });
});
