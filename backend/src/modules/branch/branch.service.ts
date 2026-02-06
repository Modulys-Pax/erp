import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchResponseDto } from './dto/branch-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto, userId?: string): Promise<BranchResponseDto> {
    // Usar companyId do request
    const companyId = createBranchDto.companyId;

    // Verificar se empresa existe
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Normalizar código (trim). Só verificar duplicidade quando código é preenchido.
    // Código vazio/null é permitido para múltiplas filiais (PostgreSQL permite múltiplos NULL em UNIQUE).
    const codeNormalized = createBranchDto.code?.trim() || null;
    if (codeNormalized !== null) {
      const existingBranch = await this.prisma.branch.findFirst({
        where: {
          companyId: companyId,
          code: codeNormalized,
          deletedAt: null,
        },
      });

      if (existingBranch) {
        throw new ConflictException('Código já cadastrado para esta empresa');
      }
    }

    try {
      const branch = await this.prisma.branch.create({
        data: {
          ...createBranchDto,
          code: codeNormalized ?? undefined,
          companyId: companyId,
          createdBy: userId,
        },
      });
      return this.mapToResponse(branch);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Código já cadastrado para esta empresa');
      }
      throw error;
    }
  }

  async findAll(
    includeDeleted = false,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponseDto<BranchResponseDto>> {
    const skip = (page - 1) * limit;
    // Usar companyId efetivo: fallback para primeira empresa do DB se constante não existir
    // (evita listagem vazia quando DEFAULT_COMPANY_ID não bate com empresa cadastrada em produção)
    let companyId = DEFAULT_COMPANY_ID;
    const companyExists = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
    });
    if (!companyExists) {
      const firstCompany = await this.prisma.company.findFirst({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
      if (firstCompany) companyId = firstCompany.id;
    }

    const where: Prisma.BranchWhereInput = {
      companyId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return {
      data: branches.map((branch) => this.mapToResponse(branch)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<BranchResponseDto> {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    return this.mapToResponse(branch);
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<BranchResponseDto> {
    const existingBranch = await this.prisma.branch.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingBranch) {
      throw new NotFoundException('Filial não encontrada');
    }

    // Verificar se empresa existe (se estiver sendo atualizada)
    if (updateBranchDto.companyId) {
      const company = await this.prisma.company.findFirst({
        where: {
          id: updateBranchDto.companyId,
          deletedAt: null,
        },
      });

      if (!company) {
        throw new NotFoundException('Empresa não encontrada');
      }
    }

    // Normalizar código e verificar duplicidade apenas quando código preenchido está sendo alterado
    const codeNormalized = updateBranchDto.code?.trim();
    const codeChanged =
      codeNormalized !== undefined && codeNormalized !== (existingBranch.code?.trim() ?? null);
    const codeToCheck = codeNormalized !== undefined ? (codeNormalized || null) : null;
    if (codeChanged && codeToCheck !== null) {
      const companyId = updateBranchDto.companyId || existingBranch.companyId;
      const branchWithCode = await this.prisma.branch.findFirst({
        where: {
          companyId,
          code: codeToCheck,
          deletedAt: null,
        },
      });

      if (branchWithCode && branchWithCode.id !== id) {
        throw new ConflictException('Código já cadastrado para esta empresa');
      }
    }

    try {
      const branch = await this.prisma.branch.update({
        where: { id },
        data: {
          ...updateBranchDto,
          ...(codeNormalized !== undefined && { code: codeNormalized || null }),
        },
      });
      return this.mapToResponse(branch);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Código já cadastrado para esta empresa');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    // Soft delete
    await this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private mapToResponse(branch: any): BranchResponseDto {
    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      companyId: branch.companyId,
      email: branch.email,
      phone: branch.phone,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      zipCode: branch.zipCode,
      active: branch.active,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      createdBy: branch.createdBy,
      deletedAt: branch.deletedAt,
    };
  }
}
