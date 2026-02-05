import { Test, TestingModule } from '@nestjs/testing';
import { VehicleMarkingController } from './vehicle-marking.controller';
import { VehicleMarkingService } from './vehicle-marking.service';

describe('VehicleMarkingController', () => {
  let controller: VehicleMarkingController;
  let service: VehicleMarkingService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
  };

  const mockMarking = { id: 'marking-1', vehicleId: 'vehicle-1', km: 150000 };
  const mockCurrentUser = { sub: 'user-1', branchId: 'branch-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleMarkingController],
      providers: [{ provide: VehicleMarkingService, useValue: mockService }],
    }).compile();

    controller = module.get<VehicleMarkingController>(VehicleMarkingController);
    service = module.get<VehicleMarkingService>(VehicleMarkingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('deve criar uma marcação', async () => {
      const createDto = {
        vehicleIds: ['vehicle-1'],
        km: 150000,
        branchId: 'branch-1',
        companyId: 'company-1',
      };
      mockService.create.mockResolvedValue(mockMarking);

      const result = await controller.create(createDto, mockCurrentUser);

      expect(result).toEqual(mockMarking);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const response = { data: [mockMarking], meta: { page: 1, total: 1 } };
      mockService.findAll.mockResolvedValue(response);

      const result = await controller.findAll();

      expect(result).toEqual(response);
    });
  });

  describe('findOne', () => {
    it('deve retornar uma marcação', async () => {
      mockService.findById.mockResolvedValue(mockMarking);

      const result = await controller.findOne('marking-1');

      expect(result).toEqual(mockMarking);
    });
  });

  describe('remove', () => {
    it('deve remover uma marcação', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.remove('marking-1', mockCurrentUser);

      expect(service.delete).toHaveBeenCalledWith('marking-1', 'user-1');
    });
  });
});
