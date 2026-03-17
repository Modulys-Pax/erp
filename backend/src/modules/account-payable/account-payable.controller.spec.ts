import { Test, TestingModule } from '@nestjs/testing';
import { AccountPayableController } from './account-payable.controller';
import { AccountPayableService } from './account-payable.service';

describe('AccountPayableController', () => {
  let controller: AccountPayableController;
  let service: AccountPayableService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    pay: jest.fn(),
    cancel: jest.fn(),
    remove: jest.fn(),
    getAccountPayableSummary: jest.fn(),
    getFinancialAccountsSummary: jest.fn(),
    processPayroll: jest.fn(),
    getPayrollPreview: jest.fn(),
  };

  const mockAccount = { id: 'ap-1', description: 'Fornecedor', amount: 1000, status: 'PENDING' };
  const mockCurrentUser = { sub: 'user-1', branchId: 'branch-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountPayableController],
      providers: [{ provide: AccountPayableService, useValue: mockService }],
    }).compile();

    controller = module.get<AccountPayableController>(AccountPayableController);
    service = module.get<AccountPayableService>(AccountPayableService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('deve criar uma conta a pagar', async () => {
      const createDto = {
        description: 'Fornecedor',
        amount: 1000,
        dueDate: '2024-01-30',
        branchId: 'branch-1',
        companyId: 'company-1',
        documentNumber: 'NF-001',
        notes: 'Pagamento de fornecedor',
        costCenterId: 'cc-1',
      };
      mockService.create.mockResolvedValue(mockAccount);

      const result = await controller.create(createDto, mockCurrentUser);

      expect(result).toEqual(mockAccount);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista de contas', async () => {
      mockService.findAll.mockResolvedValue([mockAccount]);

      const result = await controller.findAll();

      expect(result).toEqual([mockAccount]);
    });
  });

  describe('findOne', () => {
    it('deve retornar uma conta', async () => {
      mockService.findOne.mockResolvedValue(mockAccount);

      const result = await controller.findOne('ap-1', mockCurrentUser);

      expect(result).toEqual(mockAccount);
    });
  });

  describe('update', () => {
    it('deve atualizar uma conta', async () => {
      const updateDto = { amount: 1500 };
      mockService.update.mockResolvedValue({ ...mockAccount, ...updateDto });

      const result = await controller.update('ap-1', updateDto, mockCurrentUser);

      expect(result.amount).toBe(1500);
    });
  });

  describe('pay', () => {
    it('deve pagar uma conta', async () => {
      const payDto = {};
      const paidAccount = { ...mockAccount, status: 'PAID' };
      mockService.pay.mockResolvedValue(paidAccount);

      const result = await controller.pay('ap-1', payDto, mockCurrentUser);

      expect(result.status).toBe('PAID');
    });
  });

  describe('cancel', () => {
    it('deve cancelar uma conta', async () => {
      const cancelledAccount = { ...mockAccount, status: 'CANCELLED' };
      mockService.cancel.mockResolvedValue(cancelledAccount);

      const result = await controller.cancel('ap-1');

      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('remove', () => {
    it('deve remover uma conta', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('ap-1', mockCurrentUser);

      expect(service.remove).toHaveBeenCalledWith('ap-1', mockCurrentUser);
    });
  });

  describe('getPayableSummary', () => {
    it('deve retornar resumo de contas a pagar', async () => {
      const summary = { total: 5000, pending: 3000 };
      mockService.getAccountPayableSummary.mockResolvedValue(summary);

      const result = await controller.getPayableSummary();

      expect(result).toEqual(summary);
    });
  });

  describe('processPayroll', () => {
    it('deve processar folha de pagamento', async () => {
      const processDto = {
        referenceMonth: 1,
        referenceYear: 2024,
        branchId: 'branch-1',
        companyId: 'company-1',
      };
      const resultData = { created: 10, total: 50000 };
      mockService.processPayroll.mockResolvedValue(resultData);

      const result = await controller.processPayroll(processDto, mockCurrentUser);

      expect(result).toEqual(resultData);
    });
  });
});
