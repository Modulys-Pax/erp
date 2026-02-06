import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(
    createCustomerDto: CreateCustomerDto,
    userId?: string,
    user?: any,
  ): Promise<CustomerResponseDto> {
    if (user) {
      validateBranchAccess(user.branchId, user.role, createCustomerDto.branchId, undefined);
    }

    const company = await this.prisma.company.findFirst({
      where: { id: createCustomerDto.companyId, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: createCustomerDto.branchId,
        companyId: createCustomerDto.companyId,
        deletedAt: null,
      },
    });
    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    try {
      const customer = await this.prisma.customer.create({
        data: {
          ...createCustomerDto,
          createdBy: userId,
        },
      });
      return this.mapToResponse(customer);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Cliente já cadastrado para esta filial');
      }
      throw error;
    }
  }

  async findAll(
    branchId?: string,
    includeDeleted = false,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    const skip = (page - 1) * limit;
    const companyId = DEFAULT_COMPANY_ID;

    const where: Prisma.CustomerWhereInput = {
      companyId,
      ...(branchId ? { branchId } : {}),
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map((c) => this.mapToResponse(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return this.mapToResponse(customer);
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    user?: any,
  ): Promise<CustomerResponseDto> {
    const existing = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Cliente não encontrado');
    }
    if (user) {
      validateBranchAccess(user.branchId, user.role, existing.branchId, undefined);
    }

    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: updateCustomerDto,
      });
      return this.mapToResponse(customer);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Dados já cadastrados para esta filial');
      }
      throw error;
    }
  }

  async remove(id: string, user?: any): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }
    if (user) {
      validateBranchAccess(user.branchId, user.role, customer.branchId, undefined);
    }
    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private mapToResponse(customer: any): CustomerResponseDto {
    return {
      id: customer.id,
      name: customer.name,
      document: customer.document ?? undefined,
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
      address: customer.address ?? undefined,
      city: customer.city ?? undefined,
      state: customer.state ?? undefined,
      zipCode: customer.zipCode ?? undefined,
      companyId: customer.companyId,
      branchId: customer.branchId,
      active: customer.active,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      createdBy: customer.createdBy ?? undefined,
      deletedAt: customer.deletedAt ?? undefined,
    };
  }
}
