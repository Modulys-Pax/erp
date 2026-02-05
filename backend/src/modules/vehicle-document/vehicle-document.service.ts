import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateVehicleDocumentDto, VehicleDocumentType } from './dto/create-vehicle-document.dto';
import { VehicleDocumentResponseDto } from './dto/vehicle-document-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { getPrimaryPlate } from '../../shared/utils/vehicle-plate.util';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VehicleDocumentService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'vehicles');

  constructor(private prisma: PrismaService) {
    // Garantir que o diretório de uploads existe
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Normaliza a placa para usar como nome de pasta
   */
  private normalizePlate(plate: string): string {
    return plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Cria o caminho do arquivo baseado na placa do veículo
   */
  private getVehicleFolderPath(plate: string): string {
    const normalizedPlate = this.normalizePlate(plate);
    return path.join(this.uploadsDir, normalizedPlate);
  }

  /**
   * Gera um nome único para o arquivo
   */
  private generateFileName(originalName: string, type: VehicleDocumentType): string {
    const timestamp = Date.now();
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${type.toLowerCase()}_${sanitizedBaseName}_${timestamp}${ext}`;
  }

  /**
   * Upload de documento do veículo
   */
  async uploadDocument(
    vehicleId: string,
    file: any,
    createDto: CreateVehicleDocumentDto,
    userId?: string,
  ): Promise<VehicleDocumentResponseDto> {
    // Verificar se o veículo existe e carregar placas para pasta de documentos
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        deletedAt: null,
      },
      include: { plate: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    const primaryPlate = getPrimaryPlate(vehicle);
    if (!primaryPlate) {
      throw new BadRequestException(
        'Veículo sem placa cadastrada. Cadastre ao menos uma placa antes de anexar documentos.',
      );
    }

    // Validar acesso por filial
    // TODO: Implementar validação de acesso por filial se necessário

    // Criar pasta do veículo se não existir (usa placa principal)
    const vehicleFolderPath = this.getVehicleFolderPath(primaryPlate);
    if (!fs.existsSync(vehicleFolderPath)) {
      fs.mkdirSync(vehicleFolderPath, { recursive: true });
    }

    // Gerar nome único para o arquivo
    const fileName = this.generateFileName(file.originalname, createDto.type);
    const filePath = path.join(vehicleFolderPath, fileName);

    // Salvar arquivo
    fs.writeFileSync(filePath, file.buffer);

    // Salvar no banco de dados
    const document = await this.prisma.vehicleDocument.create({
      data: {
        vehicleId,
        type: createDto.type,
        fileName: file.originalname,
        filePath: path.join('uploads', 'vehicles', this.normalizePlate(primaryPlate), fileName),
        fileSize: file.size,
        mimeType: file.mimetype,
        description: createDto.description,
        expiryDate: createDto.expiryDate ? new Date(createDto.expiryDate) : null,
        companyId: vehicle.companyId,
        branchId: vehicle.branchId,
        createdBy: userId,
      },
    });

    return this.mapToResponse(document);
  }

  /**
   * Listar documentos de um veículo
   */
  async findByVehicle(vehicleId: string): Promise<VehicleDocumentResponseDto[]> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    const documents = await this.prisma.vehicleDocument.findMany({
      where: {
        vehicleId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return documents.map((doc) => this.mapToResponse(doc));
  }

  /**
   * Buscar documento por ID
   */
  async findOne(id: string): Promise<VehicleDocumentResponseDto> {
    const document = await this.prisma.vehicleDocument.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    return this.mapToResponse(document);
  }

  /**
   * Download de documento
   */
  async downloadDocument(
    id: string,
  ): Promise<{ file: Buffer; fileName: string; mimeType: string }> {
    const document = await this.prisma.vehicleDocument.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    const fullPath = path.join(process.cwd(), document.filePath);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Arquivo não encontrado no sistema de arquivos');
    }

    const fileBuffer = fs.readFileSync(fullPath);

    return {
      file: fileBuffer,
      fileName: document.fileName,
      mimeType: document.mimeType || 'application/octet-stream',
    };
  }

  /**
   * Atualizar documento
   */
  async update(
    id: string,
    updateDto: { description?: string; expiryDate?: string },
  ): Promise<VehicleDocumentResponseDto> {
    const document = await this.prisma.vehicleDocument.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    const updated = await this.prisma.vehicleDocument.update({
      where: { id },
      data: {
        description: updateDto.description,
        expiryDate: updateDto.expiryDate ? new Date(updateDto.expiryDate) : null,
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Excluir documento
   */
  async delete(id: string): Promise<void> {
    const document = await this.prisma.vehicleDocument.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Soft delete no banco
    await this.prisma.vehicleDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Remover arquivo físico (opcional - pode manter para auditoria)
    const fullPath = path.join(process.cwd(), document.filePath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (error) {
        // Log error but don't fail
        console.error(`Erro ao remover arquivo ${fullPath}:`, error);
      }
    }
  }

  /**
   * Mapear para DTO de resposta
   */
  private mapToResponse(document: any): VehicleDocumentResponseDto {
    return {
      id: document.id,
      vehicleId: document.vehicleId,
      type: document.type,
      fileName: document.fileName,
      filePath: document.filePath,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      description: document.description,
      expiryDate: document.expiryDate,
      companyId: document.companyId,
      branchId: document.branchId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
