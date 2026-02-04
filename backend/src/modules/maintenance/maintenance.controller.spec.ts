import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceController', () => {
  let controller: MaintenanceController;
  let maintenanceService: MaintenanceService;

  const mockMaintenanceService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    start: jest.fn(),
    pause: jest.fn(),
    complete: jest.fn(),
    cancel: jest.fn(),
    uploadAttachment: jest.fn(),
    getAttachmentStream: jest.fn(),
  };

  const mockOrder = {
    id: 'order-1',
    vehicleId: 'vehicle-1',
    status: 'OPEN',
    branchId: 'branch-1',
  };

  const mockCurrentUser = { sub: 'user-1', branchId: 'branch-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [{ provide: MaintenanceService, useValue: mockMaintenanceService }],
    }).compile();

    controller = module.get<MaintenanceController>(MaintenanceController);
    maintenanceService = module.get<MaintenanceService>(MaintenanceService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('deve criar uma ordem de manutenção', async () => {
      const createDto = {
        vehicleId: 'vehicle-1',
        branchId: 'branch-1',
        companyId: 'company-1',
        description: 'Troca de óleo',
        type: 'CORRECTIVE' as const,
      };
      mockMaintenanceService.create.mockResolvedValue(mockOrder);

      const result = await controller.create(createDto, mockCurrentUser);

      expect(result).toEqual(mockOrder);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const response = { data: [mockOrder], meta: { page: 1, total: 1 } };
      mockMaintenanceService.findAll.mockResolvedValue(response);

      const result = await controller.findAll('branch-1');

      expect(result).toEqual(response);
    });

    it('deve filtrar por status', async () => {
      mockMaintenanceService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(undefined, undefined, 'OPEN');

      expect(maintenanceService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        'OPEN',
        undefined,
        undefined,
        false,
        1,
        50,
      );
    });
  });

  describe('getByVehicle', () => {
    it('deve retornar histórico do veículo', async () => {
      mockMaintenanceService.findAll.mockResolvedValue({ data: [mockOrder] });

      const result = await controller.getByVehicle('vehicle-1');

      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('deve retornar uma ordem', async () => {
      mockMaintenanceService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne('order-1', mockCurrentUser);

      expect(result).toEqual(mockOrder);
    });
  });

  describe('update', () => {
    it('deve atualizar uma ordem', async () => {
      const updateDto = { description: 'Atualizado' };
      mockMaintenanceService.update.mockResolvedValue({ ...mockOrder, ...updateDto });

      const result = await controller.update('order-1', updateDto, mockCurrentUser);

      expect(result.description).toBe('Atualizado');
    });
  });

  describe('start', () => {
    it('deve iniciar uma ordem', async () => {
      const startedOrder = { ...mockOrder, status: 'IN_PROGRESS' };
      mockMaintenanceService.start.mockResolvedValue(startedOrder);

      const result = await controller.start('order-1', {}, mockCurrentUser);

      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('pause', () => {
    it('deve pausar uma ordem', async () => {
      const pausedOrder = { ...mockOrder, status: 'PAUSED' };
      mockMaintenanceService.pause.mockResolvedValue(pausedOrder);

      const result = await controller.pause('order-1', {}, mockCurrentUser);

      expect(result.status).toBe('PAUSED');
    });
  });

  describe('complete', () => {
    it('deve concluir uma ordem', async () => {
      const completedOrder = { ...mockOrder, status: 'COMPLETED' };
      mockMaintenanceService.complete.mockResolvedValue(completedOrder);

      const result = await controller.complete('order-1', {}, mockCurrentUser);

      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('cancel', () => {
    it('deve cancelar uma ordem', async () => {
      const cancelledOrder = { ...mockOrder, status: 'CANCELLED' };
      mockMaintenanceService.cancel.mockResolvedValue(cancelledOrder);

      const result = await controller.cancel('order-1', { notes: 'Teste' }, mockCurrentUser);

      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('remove', () => {
    it('deve remover uma ordem', async () => {
      mockMaintenanceService.remove.mockResolvedValue(undefined);

      await controller.remove('order-1', mockCurrentUser);

      expect(maintenanceService.remove).toHaveBeenCalledWith('order-1', mockCurrentUser);
    });
  });
});
