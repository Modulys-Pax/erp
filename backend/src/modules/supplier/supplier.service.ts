import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  async create(
    createSupplierDto: CreateSupplierDto,
    userId?: string,
    user?: any,
  ): Promise<SupplierResponseDto> {
    if (user) {
      validateBranchAccess(user.branchId, user.role, createSupplierDto.branchId, undefined);
    }

    const company = await this.prisma.company.findFirst({
      where: { id: createSupplierDto.companyId, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: createSupplierDto.branchId,
        companyId: createSupplierDto.companyId,
        deletedAt: null,
      },
    });
    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    try {
      const supplier = await this.prisma.supplier.create({
        data: {
          ...createSupplierDto,
          createdBy: userId,
        },
      });
      return this.mapToResponse(supplier);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Fornecedor já cadastrado para esta filial');
      }
      throw error;
    }
  }

  async findAll(
    branchId?: string,
    includeDeleted = false,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponseDto<SupplierResponseDto>> {
    const skip = (page - 1) * limit;
    const companyId = DEFAULT_COMPANY_ID;

    const where: Prisma.SupplierWhereInput = {
      companyId,
      ...(branchId ? { branchId } : {}),
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers.map((s) => this.mapToResponse(s)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }
    return this.mapToResponse(supplier);
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    user?: any,
  ): Promise<SupplierResponseDto> {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Fornecedor não encontrado');
    }
    if (user) {
      validateBranchAccess(user.branchId, user.role, existing.branchId, undefined);
    }

    try {
      const supplier = await this.prisma.supplier.update({
        where: { id },
        data: updateSupplierDto,
      });
      return this.mapToResponse(supplier);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Dados já cadastrados para esta filial');
      }
      throw error;
    }
  }

  async remove(id: string, user?: any): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });
    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }
    if (user) {
      validateBranchAccess(user.branchId, user.role, supplier.branchId, undefined);
    }
    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private mapToResponse(supplier: any): SupplierResponseDto {
    return {
      id: supplier.id,
      name: supplier.name,
      document: supplier.document ?? undefined,
      email: supplier.email ?? undefined,
      phone: supplier.phone ?? undefined,
      address: supplier.address ?? undefined,
      city: supplier.city ?? undefined,
      state: supplier.state ?? undefined,
      zipCode: supplier.zipCode ?? undefined,
      companyId: supplier.companyId,
      branchId: supplier.branchId,
      active: supplier.active,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      createdBy: supplier.createdBy ?? undefined,
      deletedAt: supplier.deletedAt ?? undefined,
    };
  }
}
