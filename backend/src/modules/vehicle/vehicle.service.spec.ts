import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { createMockPrismaService, PrismaMock } from '../../shared/testing/prisma.mock';

// Mock da constante DEFAULT_COMPANY_ID
jest.mock('../../shared/constants/company.constants', () => ({
  DEFAULT_COMPANY_ID: 'company-123',
}));

describe('VehicleService', () => {
  let service: VehicleService;
  let prisma: PrismaMock;

  const mockCompany = {
    id: 'company-123',
    name: 'Test Company',
    deletedAt: null,
  };

  const mockBranch = {
    id: 'branch-123',
    name: 'Test Branch',
    companyId: 'company-123',
    deletedAt: null,
  };

  const mockVehicle = {
    id: 'vehicle-123',
    brandId: 'brand-123',
    modelId: 'model-123',
    year: 2022,
    color: 'Branco',
    currentKm: 50000,
    status: 'ACTIVE',
    companyId: 'company-123',
    branchId: 'branch-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    deletedAt: null,
    brand: { id: 'brand-123', name: 'Volvo' },
    model: { id: 'model-123', name: 'FH 540' },
    plates: [{ id: 'plate-123', type: 'TRACTOR', plate: 'ABC-1234' }],
    replacementItems: [],
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      brandId: 'brand-123',
      modelId: 'model-123',
      branchId: 'branch-123',
      year: 2022,
      plates: [{ type: 'TRACTOR', plate: 'DEF-5678' }],
    };

    it('deve criar veículo com sucesso', async () => {
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.vehiclePlate.findFirst.mockResolvedValue(null); // Placa não existe
      prisma.vehicle.create.mockResolvedValue(mockVehicle);
      prisma.vehicleStatusHistory.create.mockResolvedValue({});

      const result = await service.create(createDto as any);

      expect(result).toHaveProperty('id');
      expect(prisma.vehicle.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando empresa não existe', async () => {
      prisma.company.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto as any)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto as any)).rejects.toThrow('Empresa não encontrada');
    });

    it('deve lançar NotFoundException quando filial não existe', async () => {
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto as any)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto as any)).rejects.toThrow('Filial não encontrada');
    });

    it('deve lançar BadRequestException para placas duplicadas no mesmo tipo', async () => {
      const dtoPlacasDuplicadas = {
        ...createDto,
        plates: [
          { type: 'TRACTOR', plate: 'ABC-1234' },
          { type: 'TRACTOR', plate: 'DEF-5678' }, // Mesmo tipo
        ],
      };

      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);

      await expect(service.create(dtoPlacasDuplicadas as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoPlacasDuplicadas as any)).rejects.toThrow(
        /mais de uma placa do mesmo tipo/,
      );
    });

    it('deve lançar ConflictException quando placa já existe', async () => {
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.vehiclePlate.findFirst.mockResolvedValue({ plate: 'DEF-5678' });

      await expect(service.create(createDto as any)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto as any)).rejects.toThrow(/Placa.*já cadastrada/);
    });

    it('deve criar veículo com itens de troca', async () => {
      const dtoComItens = {
        ...createDto,
        replacementItems: [{ name: 'Óleo Motor', replaceEveryKm: 15000 }],
      };

      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.vehiclePlate.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({
        ...mockVehicle,
        replacementItems: [{ name: 'Óleo Motor', replaceEveryKm: 15000 }],
      });
      prisma.vehicleStatusHistory.create.mockResolvedValue({});

      const result = await service.create(dtoComItens as any);

      expect(result.replacementItems).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de veículos', async () => {
      prisma.vehicle.findMany.mockResolvedValue([mockVehicle]);
      prisma.vehicle.count.mockResolvedValue(1);

      const result = await service.findAll('branch-123');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('deve filtrar por filial', async () => {
      prisma.vehicle.findMany.mockResolvedValue([mockVehicle]);
      prisma.vehicle.count.mockResolvedValue(1);

      await service.findAll('branch-123');

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branchId: 'branch-123',
          }),
        }),
      );
    });

    it('deve aplicar paginação corretamente', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);
      prisma.vehicle.count.mockResolvedValue(50);

      const result = await service.findAll(undefined, false, 3, 10);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('deve incluir deletados quando solicitado', async () => {
      prisma.vehicle.findMany.mockResolvedValue([{ ...mockVehicle, deletedAt: new Date() }]);
      prisma.vehicle.count.mockResolvedValue(1);

      await service.findAll(undefined, true);

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar veículo por ID', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);

      const result = await service.findOne('vehicle-123');

      expect(result.id).toBe(mockVehicle.id);
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow('Veículo não encontrado');
    });
  });

  describe('update', () => {
    it('deve atualizar veículo com sucesso', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicle.update.mockResolvedValue({
        ...mockVehicle,
        color: 'Vermelho',
      });

      const result = await service.update('vehicle-123', { color: 'Vermelho' });

      expect(result.color).toBe('Vermelho');
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(NotFoundException);
    });

    it('deve validar empresa ao atualizar companyId', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.company.findFirst.mockResolvedValue(null);

      await expect(service.update('vehicle-123', { companyId: 'invalid-company' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('vehicle-123', { companyId: 'invalid-company' })).rejects.toThrow(
        'Empresa não encontrada',
      );
    });

    it('deve validar filial ao atualizar branchId', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.update('vehicle-123', { branchId: 'invalid-branch' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('vehicle-123', { branchId: 'invalid-branch' })).rejects.toThrow(
        'Filial não encontrada',
      );
    });

    it('deve lançar BadRequestException quando currentKm retrocede no update', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);

      await expect(service.update('vehicle-123', { currentKm: 40000 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete do veículo', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicle.update.mockResolvedValue({ ...mockVehicle, deletedAt: new Date() });

      await service.remove('vehicle-123');

      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 'vehicle-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.remove('invalid-id')).rejects.toThrow('Veículo não encontrado');
    });
  });

  describe('updateKm', () => {
    it('deve atualizar quilometragem com sucesso', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicle.update.mockResolvedValue({ ...mockVehicle, currentKm: 60000 });
      prisma.vehicleStatusHistory.create.mockResolvedValue({});

      const result = await service.updateKm('vehicle-123', { currentKm: 60000 });

      expect(result.currentKm).toBe(60000);
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.updateKm('invalid-id', { currentKm: 60000 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando nova KM é menor', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);

      await expect(service.updateKm('vehicle-123', { currentKm: 40000 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status com sucesso', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicle.update.mockResolvedValue({ ...mockVehicle, status: 'MAINTENANCE' });
      prisma.vehicleStatusHistory.create.mockResolvedValue({});

      const result = await service.updateStatus('vehicle-123', { status: 'MAINTENANCE' });

      expect(result.status).toBe('MAINTENANCE');
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.updateStatus('invalid-id', { status: 'ACTIVE' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException para status inválido', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);

      await expect(
        service.updateStatus('vehicle-123', { status: 'INVALID' as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando km do status retrocede', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);

      await expect(
        service.updateStatus('vehicle-123', { status: 'MAINTENANCE', km: 40000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStatusHistory', () => {
    it('deve retornar histórico de status', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleStatusHistory.findMany.mockResolvedValue([
        {
          id: 'history-1',
          vehicleId: 'vehicle-123',
          status: 'ACTIVE',
          km: 50000,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getStatusHistory('vehicle-123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ACTIVE');
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getStatusHistory('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVehicleCosts', () => {
    it('deve retornar custos dos veículos', async () => {
      prisma.vehicle.findMany.mockResolvedValue([mockVehicle]);
      prisma.vehicle.count.mockResolvedValue(1);
      prisma.maintenanceOrder.findMany.mockResolvedValue([]);
      prisma.maintenanceOrder.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

      const result = await service.getVehicleCosts();

      expect(result).toBeDefined();
      expect(result.vehicles).toBeDefined();
    });

    it('deve filtrar por filial', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);
      prisma.vehicle.count.mockResolvedValue(0);
      prisma.maintenanceOrder.findMany.mockResolvedValue([]);
      prisma.maintenanceOrder.aggregate.mockResolvedValue({ _sum: { totalCost: 0 } });

      await service.getVehicleCosts('branch-123');

      expect(prisma.vehicle.findMany).toHaveBeenCalled();
    });
  });
});
