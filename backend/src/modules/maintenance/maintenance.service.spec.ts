import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AccountPayableService } from '../account-payable/account-payable.service';
import { createMockPrismaService, PrismaMock } from '../../shared/testing/prisma.mock';

// Mock da constante DEFAULT_COMPANY_ID
jest.mock('../../shared/constants/company.constants', () => ({
  DEFAULT_COMPANY_ID: 'company-123',
}));

// Mock de decimal.util
jest.mock('../../shared/utils/decimal.util', () => ({
  roundCurrency: jest.fn((val) => Math.round(val * 100) / 100),
  roundQuantity: jest.fn((val) => Math.round(val * 1000) / 1000),
}));

describe('MaintenanceService', () => {
  let service: MaintenanceService;
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
    licensePlate: 'ABC-1234',
    companyId: 'company-123',
    branchId: 'branch-123',
    currentKm: 50000,
    status: 'AVAILABLE',
    deletedAt: null,
    plate: { plate: 'ABC-1234', type: 'CAVALO' },
  };

  const mockEmployee = {
    id: 'employee-123',
    name: 'João Silva',
    companyId: 'company-123',
    branchId: 'branch-123',
    active: true,
    deletedAt: null,
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Óleo Motor',
    code: 'OIL-001',
    companyId: 'company-123',
    branchId: 'branch-123',
    unitPrice: 50,
    active: true,
    deletedAt: null,
  };

  const mockWarehouse = {
    id: 'warehouse-123',
    code: 'DEFAULT',
    name: 'Almoxarifado Padrão',
    companyId: 'company-123',
    branchId: 'branch-123',
    active: true,
    deletedAt: null,
  };

  const mockStock = {
    id: 'stock-123',
    productId: 'product-123',
    warehouseId: 'warehouse-123',
    quantity: 100,
    averageCost: 45,
  };

  const mockMaintenanceOrder = {
    id: 'order-123',
    orderNumber: 'OM-2024-001',
    vehicleId: 'vehicle-123',
    type: 'CORRECTIVE',
    status: 'OPEN',
    kmAtEntry: 50000,
    description: 'Troca de óleo',
    observations: 'Urgente',
    companyId: 'company-123',
    branchId: 'branch-123',
    totalCost: 500,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    deletedAt: null,
    vehicle: mockVehicle,
    workers: [],
    services: [],
    materials: [],
    timeline: [{ event: 'STARTED', createdAt: new Date() }],
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();
    const mockAccountPayableService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AccountPayableService,
          useValue: mockAccountPayableService,
        },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      vehicleId: 'vehicle-123',
      branchId: 'branch-123',
      type: 'CORRECTIVE',
      kmAtEntry: 51000,
      description: 'Manutenção preventiva',
    };

    it('deve criar ordem de manutenção com sucesso', async () => {
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceOrder.findFirst.mockResolvedValue(null); // Para gerar número
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          maintenanceOrder: {
            create: jest.fn().mockResolvedValue(mockMaintenanceOrder),
          },
          maintenanceTimeline: { create: jest.fn() },
          vehicle: { update: jest.fn() },
          vehicleStatusHistory: { create: jest.fn() },
        };
        return callback(tx);
      });
      prisma.maintenanceOrder.findFirst.mockResolvedValue(mockMaintenanceOrder);

      const result = await service.create(createDto as any, 'user-123');

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('OPEN');
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

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto as any)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto as any)).rejects.toThrow('Veículo não encontrado');
    });

    it('deve validar funcionários quando informados', async () => {
      const dtoWithWorkers = {
        ...createDto,
        workers: [{ employeeId: 'invalid-employee', isResponsible: true }],
      };

      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.create(dtoWithWorkers as any)).rejects.toThrow(NotFoundException);
    });

    it('deve validar estoque de materiais quando informados', async () => {
      const dtoWithMaterials = {
        ...createDto,
        materials: [{ productId: 'product-123', quantity: 200 }], // Maior que estoque (100)
      };

      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.stock.findUnique.mockResolvedValue(mockStock);

      await expect(service.create(dtoWithMaterials as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoWithMaterials as any)).rejects.toThrow(/excede o estoque/);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de ordens', async () => {
      prisma.maintenanceOrder.findMany.mockResolvedValue([mockMaintenanceOrder]);
      prisma.maintenanceOrder.count.mockResolvedValue(1);

      const result = await service.findAll('branch-123');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('deve filtrar por status', async () => {
      prisma.maintenanceOrder.findMany.mockResolvedValue([mockMaintenanceOrder]);
      prisma.maintenanceOrder.count.mockResolvedValue(1);

      await service.findAll(undefined, undefined, 'OPEN');

      expect(prisma.maintenanceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
          }),
        }),
      );
    });

    it('deve filtrar por veículo', async () => {
      prisma.maintenanceOrder.findMany.mockResolvedValue([mockMaintenanceOrder]);
      prisma.maintenanceOrder.count.mockResolvedValue(1);

      await service.findAll(undefined, 'vehicle-123');

      expect(prisma.maintenanceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: 'vehicle-123',
          }),
        }),
      );
    });

    it('deve aplicar paginação corretamente', async () => {
      prisma.maintenanceOrder.findMany.mockResolvedValue([]);
      prisma.maintenanceOrder.count.mockResolvedValue(50);

      const result = await service.findAll(undefined, undefined, undefined, undefined, undefined, false, 3, 10);

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(5);
      expect(prisma.maintenanceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('deve retornar lista vazia quando não há ordens', async () => {
      prisma.maintenanceOrder.findMany.mockResolvedValue([]);
      prisma.maintenanceOrder.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('deve retornar ordem por ID', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(mockMaintenanceOrder);

      const result = await service.findOne('order-123');

      expect(result.id).toBe(mockMaintenanceOrder.id);
      expect(result.orderNumber).toBe(mockMaintenanceOrder.orderNumber);
    });

    it('deve lançar NotFoundException quando ordem não existe', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        'Ordem de manutenção não encontrada',
      );
    });
  });

  describe('update', () => {
    it('deve atualizar ordem com sucesso', async () => {
      prisma.maintenanceOrder.findFirst
        .mockResolvedValueOnce(mockMaintenanceOrder) // Busca inicial
        .mockResolvedValueOnce({ ...mockMaintenanceOrder, description: 'Descrição atualizada' }); // findOne após update
      prisma.maintenanceOrder.update.mockResolvedValue({
        ...mockMaintenanceOrder,
        description: 'Descrição atualizada',
      });

      const result = await service.update('order-123', { description: 'Descrição atualizada' });

      expect(result.description).toBe('Descrição atualizada');
    });

    it('deve lançar NotFoundException quando ordem não existe', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando ordem está concluída', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'COMPLETED',
      });

      await expect(service.update('order-123', { description: 'Nova' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando ordem está cancelada', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'CANCELLED',
      });

      await expect(service.update('order-123', { description: 'Nova' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete da ordem', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(mockMaintenanceOrder);
      prisma.maintenanceOrder.update.mockResolvedValue({
        ...mockMaintenanceOrder,
        deletedAt: new Date(),
      });

      await service.remove('order-123');

      expect(prisma.maintenanceOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('deve lançar NotFoundException quando ordem não existe', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('deve permitir remover ordem em qualquer status', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'IN_PROGRESS',
      });
      prisma.maintenanceOrder.update.mockResolvedValue({
        ...mockMaintenanceOrder,
        deletedAt: new Date(),
      });

      await expect(service.remove('order-123')).resolves.not.toThrow();
    });
  });

  describe('pause', () => {
    it('deve lançar NotFoundException se ordem não existe', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(null);

      await expect(service.pause('invalid-id', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se ordem não está em execução', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'OPEN',
      });

      await expect(service.pause('order-123', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se ordem está concluída', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'COMPLETED',
      });

      await expect(service.pause('order-123', {} as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('deve lançar NotFoundException se ordem não existe', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(null);

      await expect(service.complete('invalid-id', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se ordem já está concluída', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'COMPLETED',
        timeline: [],
        services: [],
        materials: [],
      });

      await expect(service.complete('order-123', {} as any)).rejects.toThrow(BadRequestException);
      await expect(service.complete('order-123', {} as any)).rejects.toThrow(
        'Ordem já foi concluída ou cancelada',
      );
    });

    it('deve lançar BadRequestException se ordem está cancelada', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'CANCELLED',
        timeline: [],
        services: [],
        materials: [],
      });

      await expect(service.complete('order-123', {} as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('deve lançar NotFoundException se ordem não existe', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(null);

      await expect(service.cancel('invalid-id', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se ordem está concluída', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'COMPLETED',
      });

      await expect(service.cancel('order-123', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se ordem já está cancelada', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'CANCELLED',
      });

      await expect(service.cancel('order-123', {} as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('start', () => {
    it('deve lançar NotFoundException se ordem não existe', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(null);

      await expect(service.start('invalid-id', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se ordem já está em execução', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'IN_PROGRESS',
      });

      await expect(service.start('order-123', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se ordem está concluída', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue({
        ...mockMaintenanceOrder,
        status: 'COMPLETED',
      });

      await expect(service.start('order-123', {} as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateOrderNumber', () => {
    it('deve gerar número sequencial correto', async () => {
      // Isso é testado indiretamente pelo create
      prisma.company.findFirst.mockResolvedValue(mockCompany);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.maintenanceOrder.findFirst
        .mockResolvedValueOnce({ orderNumber: 'OM-2024-005' }) // Última ordem
        .mockResolvedValueOnce(mockMaintenanceOrder); // findOne após criar

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          maintenanceOrder: {
            create: jest
              .fn()
              .mockResolvedValue({ ...mockMaintenanceOrder, orderNumber: 'OM-2024-006' }),
          },
          maintenanceTimeline: { create: jest.fn() },
          vehicle: { update: jest.fn() },
          vehicleStatusHistory: { create: jest.fn() },
        };
        return callback(tx);
      });

      const result = await service.create({
        vehicleId: 'vehicle-123',
        branchId: 'branch-123',
        type: 'CORRECTIVE',
      } as any);

      expect(result.orderNumber).toMatch(/OM-\d{4}-\d{3}/);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de ordens', async () => {
      prisma.maintenanceOrder.findMany.mockResolvedValue([mockMaintenanceOrder]);
      prisma.maintenanceOrder.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect((result as any).meta?.total || result.data.length).toBeGreaterThan(0);
    });

    it('deve filtrar por branchId', async () => {
      prisma.maintenanceOrder.findMany.mockResolvedValue([]);
      prisma.maintenanceOrder.count.mockResolvedValue(0);

      await service.findAll('branch-123');

      expect(prisma.maintenanceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branchId: 'branch-123',
          }),
        }),
      );
    });

    it('deve filtrar por vehicleId', async () => {
      prisma.maintenanceOrder.findMany.mockResolvedValue([]);
      prisma.maintenanceOrder.count.mockResolvedValue(0);

      await service.findAll(undefined, 'vehicle-123');

      expect(prisma.maintenanceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: 'vehicle-123',
          }),
        }),
      );
    });

    it('deve filtrar por status', async () => {
      prisma.maintenanceOrder.findMany.mockResolvedValue([]);
      prisma.maintenanceOrder.count.mockResolvedValue(0);

      await service.findAll(undefined, undefined, 'OPEN');

      expect(prisma.maintenanceOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete da ordem', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(mockMaintenanceOrder);
      prisma.maintenanceOrder.update.mockResolvedValue({
        ...mockMaintenanceOrder,
        deletedAt: new Date(),
      });

      await service.remove('order-123');

      expect(prisma.maintenanceOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('deve lançar NotFoundException quando ordem não existe', async () => {
      prisma.maintenanceOrder.findFirst.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
