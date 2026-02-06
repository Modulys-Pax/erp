import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { CostCenterResponseDto } from './dto/cost-center-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';

@Injectable()
export class CostCenterService {
  constructor(private prisma: PrismaService) {}

  async create(
    createCostCenterDto: CreateCostCenterDto,
    userId?: string,
    user?: any,
  ): Promise<CostCenterResponseDto> {
    if (user) {
      validateBranchAccess(user.branchId, user.role, createCostCenterDto.branchId, undefined);
    }

    const company = await this.prisma.company.findFirst({
      where: { id: createCostCenterDto.companyId, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: createCostCenterDto.branchId,
        companyId: createCostCenterDto.companyId,
        deletedAt: null,
      },
    });
    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    const codeTrimmed = createCostCenterDto.code.trim();
    const existing = await this.prisma.costCenter.findFirst({
      where: {
        companyId: createCostCenterDto.companyId,
        branchId: createCostCenterDto.branchId,
        code: codeTrimmed,
      },
    });
    if (existing) {
      throw new ConflictException('Código já cadastrado para esta filial');
    }

    try {
      const costCenter = await this.prisma.costCenter.create({
        data: {
          ...createCostCenterDto,
          code: codeTrimmed,
          createdBy: userId,
        },
      });
      return this.mapToResponse(costCenter);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Código já cadastrado para esta filial');
      }
      throw error;
    }
  }

  async findAll(
    branchId?: string,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponseDto<CostCenterResponseDto>> {
    const skip = (page - 1) * limit;
    const companyId = DEFAULT_COMPANY_ID;

    const where: Prisma.CostCenterWhereInput = {
      companyId,
      ...(branchId ? { branchId } : {}),
    };

    const [costCenters, total] = await Promise.all([
      this.prisma.costCenter.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ branchId: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.costCenter.count({ where }),
    ]);

    return {
      data: costCenters.map((c) => this.mapToResponse(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CostCenterResponseDto> {
    const costCenter = await this.prisma.costCenter.findFirst({
      where: { id },
    });
    if (!costCenter) {
      throw new NotFoundException('Centro de custo não encontrado');
    }
    return this.mapToResponse(costCenter);
  }

  async update(
    id: string,
    updateCostCenterDto: UpdateCostCenterDto,
    user?: any,
  ): Promise<CostCenterResponseDto> {
    const existing = await this.prisma.costCenter.findFirst({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Centro de custo não encontrado');
    }
    if (user) {
      validateBranchAccess(user.branchId, user.role, existing.branchId, undefined);
    }

    const codeTrimmed = updateCostCenterDto.code?.trim();
    if (codeTrimmed !== undefined && codeTrimmed !== existing.code) {
      const duplicate = await this.prisma.costCenter.findFirst({
        where: {
          companyId: existing.companyId,
          branchId: existing.branchId,
          code: codeTrimmed,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException('Código já cadastrado para esta filial');
      }
    }

    try {
      const costCenter = await this.prisma.costCenter.update({
        where: { id },
        data: {
          ...updateCostCenterDto,
          ...(codeTrimmed !== undefined && { code: codeTrimmed }),
        },
      });
      return this.mapToResponse(costCenter);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Código já cadastrado para esta filial');
      }
      throw error;
    }
  }

  async remove(id: string, user?: any): Promise<void> {
    const costCenter = await this.prisma.costCenter.findFirst({
      where: { id },
    });
    if (!costCenter) {
      throw new NotFoundException('Centro de custo não encontrado');
    }
    if (user) {
      validateBranchAccess(user.branchId, user.role, costCenter.branchId, undefined);
    }
    await this.prisma.costCenter.delete({
      where: { id },
    });
  }

  private mapToResponse(cc: any): CostCenterResponseDto {
    return {
      id: cc.id,
      code: cc.code,
      name: cc.name,
      companyId: cc.companyId,
      branchId: cc.branchId,
      active: cc.active,
      createdAt: cc.createdAt,
      updatedAt: cc.updatedAt,
      createdBy: cc.createdBy ?? undefined,
    };
  }
}
