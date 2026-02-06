import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateFiscalDocumentDto } from './dto/create-fiscal-document.dto';
import { UpdateFiscalDocumentDto } from './dto/update-fiscal-document.dto';
import { FiscalDocumentResponseDto } from './dto/fiscal-document-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';
import { FiscalDocumentType, FiscalDocumentStatus } from '@prisma/client';

@Injectable()
export class FiscalDocumentService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreateFiscalDocumentDto,
    userId?: string,
    user?: any,
  ): Promise<FiscalDocumentResponseDto> {
    if (user) {
      validateBranchAccess(user.branchId, user.role, createDto.branchId, undefined);
    }

    const company = await this.prisma.company.findFirst({
      where: { id: createDto.companyId ?? DEFAULT_COMPANY_ID, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: createDto.branchId,
        companyId: createDto.companyId ?? DEFAULT_COMPANY_ID,
        deletedAt: null,
      },
    });
    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    const fiscalDocument = await this.prisma.fiscalDocument.create({
      data: {
        type: createDto.type as FiscalDocumentType,
        number: createDto.number.trim(),
        series: createDto.series?.trim() || null,
        issueDate: new Date(createDto.issueDate),
        totalAmount: createDto.totalAmount,
        status: (createDto.status as FiscalDocumentStatus) ?? FiscalDocumentStatus.REGISTERED,
        companyId: createDto.companyId ?? DEFAULT_COMPANY_ID,
        branchId: createDto.branchId,
        supplierId: createDto.supplierId || null,
        customerId: createDto.customerId || null,
        accountPayableId: createDto.accountPayableId || null,
        accountReceivableId: createDto.accountReceivableId || null,
        financialTransactionId: createDto.financialTransactionId || null,
        notes: createDto.notes?.trim() || null,
        createdBy: userId,
      },
      include: {
        supplier: { select: { name: true } },
        customer: { select: { name: true } },
      },
    });

    return this.mapToResponse(fiscalDocument);
  }

  async findAll(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    type?: FiscalDocumentType,
    status?: FiscalDocumentStatus,
    includeDeleted = false,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponseDto<FiscalDocumentResponseDto>> {
    const skip = (page - 1) * limit;
    const companyId = DEFAULT_COMPANY_ID;

    const where: Prisma.FiscalDocumentWhereInput = {
      companyId,
      ...(branchId ? { branchId } : {}),
      ...(startDate || endDate
        ? {
            issueDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    const [documents, total] = await Promise.all([
      this.prisma.fiscalDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ issueDate: 'desc' }, { number: 'desc' }],
        include: {
          supplier: { select: { name: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.fiscalDocument.count({ where }),
    ]);

    return {
      data: documents.map((d) => this.mapToResponse(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<FiscalDocumentResponseDto> {
    const doc = await this.prisma.fiscalDocument.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        accountPayable: { select: { id: true, description: true, amount: true } },
        accountReceivable: { select: { id: true, description: true, amount: true } },
        financialTransaction: { select: { id: true, description: true, amount: true } },
      },
    });
    if (!doc) {
      throw new NotFoundException('Documento fiscal não encontrado');
    }
    return this.mapToResponse(doc);
  }

  async update(
    id: string,
    updateDto: UpdateFiscalDocumentDto,
    user?: any,
  ): Promise<FiscalDocumentResponseDto> {
    const existing = await this.prisma.fiscalDocument.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Documento fiscal não encontrado');
    }
    if (user) {
      validateBranchAccess(user.branchId, user.role, existing.branchId, undefined);
    }

    const fiscalDocument = await this.prisma.fiscalDocument.update({
      where: { id },
      data: {
        ...(updateDto.type !== undefined && { type: updateDto.type as FiscalDocumentType }),
        ...(updateDto.number !== undefined && { number: updateDto.number.trim() }),
        ...(updateDto.series !== undefined && { series: updateDto.series?.trim() || null }),
        ...(updateDto.issueDate !== undefined && { issueDate: new Date(updateDto.issueDate) }),
        ...(updateDto.totalAmount !== undefined && { totalAmount: updateDto.totalAmount }),
        ...(updateDto.status !== undefined && { status: updateDto.status as FiscalDocumentStatus }),
        ...(updateDto.supplierId !== undefined && { supplierId: updateDto.supplierId || null }),
        ...(updateDto.customerId !== undefined && { customerId: updateDto.customerId || null }),
        ...(updateDto.accountPayableId !== undefined && {
          accountPayableId: updateDto.accountPayableId || null,
        }),
        ...(updateDto.accountReceivableId !== undefined && {
          accountReceivableId: updateDto.accountReceivableId || null,
        }),
        ...(updateDto.financialTransactionId !== undefined && {
          financialTransactionId: updateDto.financialTransactionId || null,
        }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes?.trim() || null }),
      },
      include: {
        supplier: { select: { name: true } },
        customer: { select: { name: true } },
      },
    });

    return this.mapToResponse(fiscalDocument);
  }

  async remove(id: string, user?: any): Promise<void> {
    const existing = await this.prisma.fiscalDocument.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Documento fiscal não encontrado');
    }
    if (user) {
      validateBranchAccess(user.branchId, user.role, existing.branchId, undefined);
    }
    await this.prisma.fiscalDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private mapToResponse(d: any): FiscalDocumentResponseDto {
    return {
      id: d.id,
      type: d.type,
      number: d.number,
      series: d.series ?? undefined,
      issueDate: d.issueDate,
      totalAmount: Number(d.totalAmount),
      status: d.status,
      companyId: d.companyId,
      branchId: d.branchId,
      supplierId: d.supplierId ?? undefined,
      supplierName: d.supplier?.name ?? undefined,
      customerId: d.customerId ?? undefined,
      customerName: d.customer?.name ?? undefined,
      accountPayableId: d.accountPayableId ?? undefined,
      accountReceivableId: d.accountReceivableId ?? undefined,
      financialTransactionId: d.financialTransactionId ?? undefined,
      notes: d.notes ?? undefined,
      externalKey: d.externalKey ?? undefined,
      issuedAt: d.issuedAt ?? undefined,
      xmlPath: d.xmlPath ?? undefined,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      createdBy: d.createdBy ?? undefined,
    };
  }
}
