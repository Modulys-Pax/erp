import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MaintenanceLabelService } from './maintenance-label.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AccountPayableService } from '../account-payable/account-payable.service';
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

jest.mock('../../shared/utils/decimal.util', () => ({
  roundCurrency: jest.fn((val: number) => Math.round(val * 100) / 100),
}));

describe('MaintenanceLabelService', () => {
  let service: MaintenanceLabelService;
  let prisma: PrismaMock;

  const mockReplacementItem = {
    id: 'replacement-item-1',
    vehicleId: 'vehicle-123',
    name: 'Óleo Motor',
    replaceEveryKm: 10000,
  };

  const mockVehicle = {
    id: 'vehicle-123',
    companyId: 'company-123',
    branchId: 'branch-123',
    status: 'AVAILABLE',
    currentKm: 50000,
    plate: { id: 'plate-1', plate: 'ABC-1234', type: 'CAVALO' },
    replacementItems: [mockReplacementItem],
    deletedAt: null,
  };

  const mockBranch = {
    id: 'branch-123',
    companyId: 'company-123',
    name: 'Filial Teste',
    deletedAt: null,
  };

  const mockLabel = {
    id: 'label-123',
    vehicleId: 'vehicle-123',
    companyId: 'company-123',
    branchId: 'branch-123',
    createdAt: new Date(),
    createdBy: 'user-123',
    vehicle: mockVehicle,
    replacementItems: [
      {
        id: 'lr-1',
        maintenanceLabelId: 'label-123',
        vehicleReplacementItemId: 'replacement-item-1',
        lastChangeKm: 50000,
        vehicleReplacementItem: mockReplacementItem,
      },
    ],
  };

  const mockAccountPayableService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceLabelService,
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

    service = module.get<MaintenanceLabelService>(MaintenanceLabelService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      vehicleId: 'vehicle-123',
      branchId: 'branch-123',
      companyId: 'company-123',
    };

    it('deve criar etiqueta com sucesso', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);
      prisma.vehicleMarking.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        return await fn({
          maintenanceLabel: {
            create: jest.fn().mockResolvedValue({ id: 'label-123' }),
          },
          maintenanceLabelReplacementItem: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });
      prisma.maintenanceLabel.findFirst.mockResolvedValue(mockLabel);

      const result = await service.create(createDto);

      expect(result.id).toBe(mockLabel.id);
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Veículo não encontrado');
    });

    it('deve lançar NotFoundException quando filial não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow('Filial não encontrada');
    });

    it('deve lançar BadRequestException quando veículo não tem itens de troca', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ ...mockVehicle, replacementItems: [] });
      prisma.branch.findFirst.mockResolvedValue(mockBranch);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(/não possui itens de troca por KM/);
    });

    it('deve lançar BadRequestException quando productIds inválidos', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.branch.findFirst.mockResolvedValue(mockBranch);

      await expect(service.create({ ...createDto, productIds: ['invalid-item'] })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de etiquetas', async () => {
      prisma.maintenanceLabel.findMany.mockResolvedValue([mockLabel]);
      prisma.maintenanceLabel.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('deve filtrar por filial', async () => {
      prisma.maintenanceLabel.findMany.mockResolvedValue([mockLabel]);
      prisma.maintenanceLabel.count.mockResolvedValue(1);

      await service.findAll('branch-123');

      expect(prisma.maintenanceLabel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branchId: 'branch-123',
          }),
        }),
      );
    });

    it('deve filtrar por veículo', async () => {
      prisma.maintenanceLabel.findMany.mockResolvedValue([mockLabel]);
      prisma.maintenanceLabel.count.mockResolvedValue(1);

      await service.findAll(undefined, 'vehicle-123');

      expect(prisma.maintenanceLabel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: 'vehicle-123',
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar etiqueta por ID', async () => {
      prisma.maintenanceLabel.findFirst.mockResolvedValue(mockLabel);

      const result = await service.findById('label-123');

      expect(result.id).toBe(mockLabel.id);
    });

    it('deve lançar NotFoundException quando etiqueta não existe', async () => {
      prisma.maintenanceLabel.findFirst.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('invalid-id')).rejects.toThrow('Etiqueta não encontrada');
    });
  });

  describe('getMaintenanceDueByVehicle', () => {
    it('deve retornar status de manutenção do veículo', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleMarking.findFirst.mockResolvedValue({ km: 50000 });
      prisma.maintenanceLabelReplacementItem.findFirst.mockResolvedValue({
        lastChangeKm: 45000,
      });

      const result = await service.getMaintenanceDueByVehicle('vehicle-123');

      expect(result.referenceKm).toBe(50000);
      expect(result.items).toHaveLength(1);
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getMaintenanceDueByVehicle('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve calcular status ok quando km está dentro do limite', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleMarking.findFirst.mockResolvedValue({ km: 50000 });
      prisma.maintenanceLabelReplacementItem.findFirst.mockResolvedValue({
        lastChangeKm: 45000,
      });

      const result = await service.getMaintenanceDueByVehicle('vehicle-123');

      expect(result.items[0]?.status).toBe('ok');
    });

    it('deve calcular status due quando km ultrapassa próxima troca', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleMarking.findFirst.mockResolvedValue({ km: 60000 });
      prisma.maintenanceLabelReplacementItem.findFirst.mockResolvedValue({
        lastChangeKm: 45000,
      });

      const result = await service.getMaintenanceDueByVehicle('vehicle-123');

      expect(result.items[0]?.status).toBe('due');
    });
  });

  describe('delete', () => {
    it('deve remover etiqueta com sucesso', async () => {
      prisma.maintenanceLabel.findFirst.mockResolvedValue(mockLabel);
      prisma.maintenanceLabel.delete.mockResolvedValue(mockLabel);

      await service.delete('label-123');

      expect(prisma.maintenanceLabel.delete).toHaveBeenCalledWith({
        where: { id: 'label-123' },
      });
    });

    it('deve lançar NotFoundException quando etiqueta não existe', async () => {
      prisma.maintenanceLabel.findFirst.mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('registerProductChange', () => {
    const registerDto = {
      vehicleIds: ['vehicle-123'],
      branchId: 'branch-123',
      companyId: 'company-123',
      changeKm: 55000,
      items: [{ vehicleReplacementItemId: 'replacement-item-1', cost: 150 }],
    };

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.registerProductChange(registerDto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando item não está configurado', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleReplacementItem.findMany.mockResolvedValue([]);

      await expect(service.registerProductChange(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando filial não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleReplacementItem.findMany.mockResolvedValue([mockReplacementItem]);
      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(service.registerProductChange(registerDto)).rejects.toThrow(NotFoundException);
    });
  });
});
