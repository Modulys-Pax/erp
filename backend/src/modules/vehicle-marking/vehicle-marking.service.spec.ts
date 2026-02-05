import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VehicleMarkingService } from './vehicle-marking.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { createMockPrismaService, PrismaMock } from '../../shared/testing/prisma.mock';

jest.mock('../../shared/constants/company.constants', () => ({
  DEFAULT_COMPANY_ID: 'company-123',
}));

jest.mock('../../shared/utils/branch-access.util', () => ({
  validateBranchAccess: jest.fn(),
}));

jest.mock('../../shared/utils/vehicle-plate.util', () => ({
  getPrimaryPlate: jest.fn((vehicle: any) => vehicle?.plate?.plate || 'ABC-1234'),
}));

describe('VehicleMarkingService', () => {
  let service: VehicleMarkingService;
  let prisma: PrismaMock;

  const mockVehicle = {
    id: 'vehicle-123',
    companyId: 'company-123',
    branchId: 'branch-123',
    status: 'AVAILABLE',
    currentKm: 50000,
    plate: { id: 'plate-1', plate: 'ABC-1234', type: 'CAVALO' },
    deletedAt: null,
  };

  const mockBranch = {
    id: 'branch-123',
    companyId: 'company-123',
    name: 'Filial Teste',
    deletedAt: null,
  };

  const mockMarking = {
    id: 'marking-123',
    vehicleId: 'vehicle-123',
    km: 55000,
    companyId: 'company-123',
    branchId: 'branch-123',
    createdAt: new Date(),
    createdBy: 'user-123',
    vehicle: mockVehicle,
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleMarkingService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<VehicleMarkingService>(VehicleMarkingService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      vehicleIds: ['vehicle-123'],
      branchId: 'branch-123',
      companyId: 'company-123',
      km: 55000,
    };

    it('deve criar marcação com sucesso', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        return await fn({
          vehicleMarking: {
            create: jest.fn().mockResolvedValue(mockMarking),
          },
          vehicle: {
            update: jest.fn().mockResolvedValue(mockVehicle),
          },
          vehicleStatusHistory: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await service.create(createDto);

      expect(result.id).toBe(mockMarking.id);
      expect(result.km).toBe(55000);
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Um ou mais veículos não foram encontrados.');
    });

    it('deve lançar NotFoundException quando filial não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Filial não encontrada');
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de marcações', async () => {
      prisma.vehicleMarking.findMany.mockResolvedValue([mockMarking]);
      prisma.vehicleMarking.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('deve filtrar por filial', async () => {
      prisma.vehicleMarking.findMany.mockResolvedValue([mockMarking]);
      prisma.vehicleMarking.count.mockResolvedValue(1);

      await service.findAll('branch-123');

      expect(prisma.vehicleMarking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branchId: 'branch-123',
          }),
        }),
      );
    });

    it('deve filtrar por período', async () => {
      prisma.vehicleMarking.findMany.mockResolvedValue([mockMarking]);
      prisma.vehicleMarking.count.mockResolvedValue(1);

      await service.findAll(undefined, '2024-01-01', '2024-12-31');

      expect(prisma.vehicleMarking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });

    it('deve paginar corretamente', async () => {
      prisma.vehicleMarking.findMany.mockResolvedValue([mockMarking]);
      prisma.vehicleMarking.count.mockResolvedValue(30);

      const result = await service.findAll(undefined, undefined, undefined, 2, 10);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });
  });

  describe('findById', () => {
    it('deve retornar marcação por ID', async () => {
      prisma.vehicleMarking.findFirst.mockResolvedValue(mockMarking);

      const result = await service.findById('marking-123');

      expect(result.id).toBe(mockMarking.id);
    });

    it('deve lançar NotFoundException quando marcação não existe', async () => {
      prisma.vehicleMarking.findFirst.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('invalid-id')).rejects.toThrow('Marcação não encontrada');
    });
  });

  describe('delete', () => {
    it('deve remover marcação com sucesso', async () => {
      prisma.vehicleMarking.findFirst.mockResolvedValue(mockMarking);
      prisma.vehicleMarking.delete.mockResolvedValue(mockMarking);

      await service.delete('marking-123');

      expect(prisma.vehicleMarking.delete).toHaveBeenCalledWith({
        where: { id: 'marking-123' },
      });
    });

    it('deve lançar NotFoundException quando marcação não existe', async () => {
      prisma.vehicleMarking.findFirst.mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
