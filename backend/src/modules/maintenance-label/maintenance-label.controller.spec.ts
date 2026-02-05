import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceLabelController } from './maintenance-label.controller';
import { MaintenanceLabelService } from './maintenance-label.service';

describe('MaintenanceLabelController', () => {
  let controller: MaintenanceLabelController;
  let service: MaintenanceLabelService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
    getMaintenanceDueByVehicle: jest.fn(),
    registerProductChange: jest.fn(),
  };

  const mockLabel = { id: 'label-1', vehicleId: 'vehicle-1', productId: 'product-1' };
  const mockCurrentUser = { sub: 'user-1', branchId: 'branch-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceLabelController],
      providers: [{ provide: MaintenanceLabelService, useValue: mockService }],
    }).compile();

    controller = module.get<MaintenanceLabelController>(MaintenanceLabelController);
    service = module.get<MaintenanceLabelService>(MaintenanceLabelService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('deve criar uma etiqueta', async () => {
      const createDto = {
        vehicleId: 'vehicle-1',
        productId: 'product-1',
        currentKm: 100000,
        branchId: 'branch-1',
        companyId: 'company-1',
      };
      mockService.create.mockResolvedValue(mockLabel);

      const result = await controller.create(createDto, mockCurrentUser);

      expect(result).toEqual(mockLabel);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const response = { data: [mockLabel], meta: { page: 1, total: 1 } };
      mockService.findAll.mockResolvedValue(response);

      const result = await controller.findAll();

      expect(result).toEqual(response);
    });
  });

  describe('findOne', () => {
    it('deve retornar uma etiqueta', async () => {
      mockService.findById.mockResolvedValue(mockLabel);

      const result = await controller.findOne('label-1');

      expect(result).toEqual(mockLabel);
    });
  });

  describe('getDueByVehicle', () => {
    it('deve retornar próximas trocas do veículo', async () => {
      const dueData = { vehicleId: 'vehicle-1', items: [] };
      mockService.getMaintenanceDueByVehicle.mockResolvedValue(dueData);

      const result = await controller.getDueByVehicle('vehicle-1');

      expect(result).toEqual(dueData);
    });
  });

  describe('remove', () => {
    it('deve remover uma etiqueta', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.remove('label-1');

      expect(service.delete).toHaveBeenCalledWith('label-1');
    });
  });

  describe('registerProductChange', () => {
    it('deve registrar troca de produto', async () => {
      const registerDto = {
        vehicleIds: ['vehicle-1'],
        changeKm: 105000,
        branchId: 'branch-1',
        companyId: 'company-1',
        items: [{ productId: 'product-1', vehicleReplacementItemId: 'item-1' }],
      };
      mockService.registerProductChange.mockResolvedValue({ orderId: 'order-1' });

      const result = await controller.registerProductChange(registerDto, mockCurrentUser);

      expect(result.orderId).toBe('order-1');
    });
  });
});
