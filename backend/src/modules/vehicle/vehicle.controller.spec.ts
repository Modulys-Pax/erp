import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

describe('VehicleController', () => {
  let controller: VehicleController;
  let vehicleService: VehicleService;

  const mockVehicleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getVehicleCosts: jest.fn(),
    updateKm: jest.fn(),
  };

  const mockVehicle = {
    id: 'vehicle-1',
    licensePlate: 'ABC1234',
    brandId: 'brand-1',
    modelId: 'model-1',
    year: 2023,
    mileage: 50000,
    branchId: 'branch-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    sub: 'user-1',
    email: 'admin@test.com',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleController],
      providers: [
        {
          provide: VehicleService,
          useValue: mockVehicleService,
        },
      ],
    }).compile();

    controller = module.get<VehicleController>(VehicleController);
    vehicleService = module.get<VehicleService>(VehicleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um novo veículo', async () => {
      const createDto: CreateVehicleDto = {
        plate: { type: 'CAVALO' as any, plate: 'ABC1234' },
        brandId: 'brand-1',
        modelId: 'model-1',
        year: 2023,
        branchId: 'branch-1',
        companyId: 'company-1',
      };

      mockVehicleService.create.mockResolvedValue(mockVehicle);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(mockVehicle);
      expect(vehicleService.create).toHaveBeenCalledWith(createDto, mockUser.sub, mockUser);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de veículos', async () => {
      const paginatedResult = {
        data: [mockVehicle],
        meta: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
        },
      };

      mockVehicleService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll('branch-1', 'false', '1', '50');

      expect(result).toEqual(paginatedResult);
      expect(vehicleService.findAll).toHaveBeenCalledWith('branch-1', false, 1, 50);
    });

    it('deve incluir veículos excluídos quando solicitado', async () => {
      mockVehicleService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(undefined, 'true', '1', '10');

      expect(vehicleService.findAll).toHaveBeenCalledWith(undefined, true, 1, 10);
    });
  });

  describe('findOne', () => {
    it('deve retornar um veículo por ID', async () => {
      mockVehicleService.findOne.mockResolvedValue(mockVehicle);

      const result = await controller.findOne('vehicle-1', mockUser);

      expect(result).toEqual(mockVehicle);
      expect(vehicleService.findOne).toHaveBeenCalledWith('vehicle-1', mockUser);
    });

    it('deve propagar erro quando veículo não encontrado', async () => {
      mockVehicleService.findOne.mockRejectedValue(new NotFoundException('Veículo não encontrado'));

      await expect(controller.findOne('vehicle-999', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar um veículo', async () => {
      const updateDto: UpdateVehicleDto = {
        currentKm: 60000,
      };

      const updatedVehicle = { ...mockVehicle, ...updateDto };
      mockVehicleService.update.mockResolvedValue(updatedVehicle);

      const result = await controller.update('vehicle-1', updateDto, mockUser);

      expect(result).toEqual(updatedVehicle);
      expect(vehicleService.update).toHaveBeenCalledWith(
        'vehicle-1',
        updateDto,
        mockUser.sub,
        mockUser,
      );
    });
  });

  describe('remove', () => {
    it('deve remover um veículo', async () => {
      mockVehicleService.remove.mockResolvedValue(undefined);

      await controller.remove('vehicle-1', mockUser);

      expect(vehicleService.remove).toHaveBeenCalledWith('vehicle-1', mockUser);
    });
  });

  describe('getCosts', () => {
    it('deve retornar custos de veículos', async () => {
      const costs = {
        total: 10000,
        vehicles: [mockVehicle],
      };

      mockVehicleService.getVehicleCosts.mockResolvedValue(costs);

      const result = await controller.getCosts('branch-1');

      expect(result).toEqual(costs);
    });
  });

  describe('updateKm', () => {
    it('deve atualizar quilometragem do veículo', async () => {
      const updatedVehicle = { ...mockVehicle, currentKm: 55000 };
      mockVehicleService.updateKm.mockResolvedValue(updatedVehicle);

      const result = await controller.updateKm('vehicle-1', { currentKm: 55000 }, mockUser);

      expect(result).toEqual(updatedVehicle);
    });
  });
});
