import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VehicleDocumentService } from './vehicle-document.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { createMockPrismaService, PrismaMock } from '../../shared/testing/prisma.mock';
import { VehicleDocumentType } from './dto/create-vehicle-document.dto';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('test')),
  unlinkSync: jest.fn(),
}));

jest.mock('../../shared/utils/vehicle-plate.util', () => ({
  getPrimaryPlate: jest.fn((vehicle: any) => vehicle?.plate?.plate || null),
}));

describe('VehicleDocumentService', () => {
  let service: VehicleDocumentService;
  let prisma: PrismaMock;

  const mockVehicle = {
    id: 'vehicle-123',
    companyId: 'company-123',
    branchId: 'branch-123',
    plate: { id: 'plate-1', plate: 'ABC-1234', type: 'CAVALO' },
    deletedAt: null,
  };

  const mockDocument = {
    id: 'doc-123',
    vehicleId: 'vehicle-123',
    type: 'CRVL',
    fileName: 'documento.pdf',
    filePath: 'uploads/vehicles/ABC1234/crvl_documento_123.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    description: 'CRVL 2024',
    expiryDate: new Date('2025-01-01'),
    companyId: 'company-123',
    branchId: 'branch-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleDocumentService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<VehicleDocumentService>(VehicleDocumentService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    const mockFile = {
      originalname: 'documento.pdf',
      buffer: Buffer.from('test'),
      size: 1024,
      mimetype: 'application/pdf',
    };

    const createDto = {
      type: VehicleDocumentType.CRVL,
      description: 'CRVL 2024',
      expiryDate: '2025-01-01',
    };

    it('deve fazer upload de documento com sucesso', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleDocument.create.mockResolvedValue(mockDocument);

      const result = await service.uploadDocument('vehicle-123', mockFile, createDto);

      expect(result.id).toBe(mockDocument.id);
      expect(result.type).toBe('CRVL');
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.uploadDocument('invalid-id', mockFile, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando veículo não tem placa', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ ...mockVehicle, plates: [] });

      const { getPrimaryPlate } = require('../../shared/utils/vehicle-plate.util');
      getPrimaryPlate.mockReturnValue(null);

      await expect(service.uploadDocument('vehicle-123', mockFile, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByVehicle', () => {
    it('deve retornar documentos do veículo', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(mockVehicle);
      prisma.vehicleDocument.findMany.mockResolvedValue([mockDocument]);

      const result = await service.findByVehicle('vehicle-123');

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('CRVL');
    });

    it('deve lançar NotFoundException quando veículo não existe', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findByVehicle('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('deve retornar documento por ID', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(mockDocument);

      const result = await service.findOne('doc-123');

      expect(result.id).toBe(mockDocument.id);
    });

    it('deve lançar NotFoundException quando documento não existe', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow('Documento não encontrado');
    });
  });

  describe('downloadDocument', () => {
    it('deve retornar buffer do arquivo', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(mockDocument);

      const result = await service.downloadDocument('doc-123');

      expect(result.file).toBeInstanceOf(Buffer);
      expect(result.fileName).toBe('documento.pdf');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('deve lançar NotFoundException quando documento não existe', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(null);

      await expect(service.downloadDocument('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException quando arquivo não existe no sistema', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(mockDocument);
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      await expect(service.downloadDocument('doc-123')).rejects.toThrow(
        /Arquivo não encontrado no sistema de arquivos/,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar documento com sucesso', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(mockDocument);
      prisma.vehicleDocument.update.mockResolvedValue({
        ...mockDocument,
        description: 'Descrição atualizada',
      });

      const result = await service.update('doc-123', { description: 'Descrição atualizada' });

      expect(result.description).toBe('Descrição atualizada');
    });

    it('deve lançar NotFoundException quando documento não existe', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deve fazer soft delete do documento', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(mockDocument);
      prisma.vehicleDocument.update.mockResolvedValue({
        ...mockDocument,
        deletedAt: new Date(),
      });

      await service.delete('doc-123');

      expect(prisma.vehicleDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('deve lançar NotFoundException quando documento não existe', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(null);

      await expect(service.delete('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('deve remover arquivo físico se existir', async () => {
      prisma.vehicleDocument.findFirst.mockResolvedValue(mockDocument);
      prisma.vehicleDocument.update.mockResolvedValue(mockDocument);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await service.delete('doc-123');

      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });
});
