import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateFinancialTransactionDto } from './dto/create-financial-transaction.dto';
import { UpdateFinancialTransactionDto } from './dto/update-financial-transaction.dto';
import { FinancialTransactionResponseDto } from './dto/financial-transaction-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';

@Injectable()
export class FinancialTransactionService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreateFinancialTransactionDto,
    userId?: string,
  ): Promise<FinancialTransactionResponseDto> {
    // Usar DEFAULT_COMPANY_ID (single-tenant)
    const companyId = DEFAULT_COMPANY_ID;

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

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: createDto.branchId,
        companyId: companyId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    // Validar origem se informada
    if (createDto.originType && createDto.originId) {
      if (createDto.originType === 'MAINTENANCE') {
        const maintenanceOrder = await this.prisma.maintenanceOrder.findFirst({
          where: {
            id: createDto.originId,
            companyId: companyId,
            branchId: createDto.branchId,
            deletedAt: null,
          },
        });

        if (!maintenanceOrder) {
          throw new NotFoundException('Ordem de manutenção não encontrada');
        }
      }
    }

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        type: createDto.type,
        amount: createDto.amount,
        description: createDto.description,
        transactionDate: new Date(createDto.transactionDate),
        originType: createDto.originType,
        originId: createDto.originId,
        documentNumber: createDto.documentNumber,
        notes: createDto.notes,
        costCenterId: createDto.costCenterId ?? undefined,
        companyId: companyId,
        branchId: createDto.branchId,
        createdBy: userId,
      },
    });

    return this.mapToResponse(transaction);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
    type?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<FinancialTransactionResponseDto[]> {
    const where: Prisma.FinancialTransactionWhereInput = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (type) {
      where.type = type as any;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate);
      }
    }

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      include: {},
      orderBy: { transactionDate: 'desc' },
    });

    return transactions.map((transaction) => this.mapToResponse(transaction));
  }

  async findOne(id: string): Promise<FinancialTransactionResponseDto> {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transação financeira não encontrada');
    }

    return this.mapToResponse(transaction);
  }

  async update(
    id: string,
    updateDto: UpdateFinancialTransactionDto,
  ): Promise<FinancialTransactionResponseDto> {
    const existingTransaction = await this.prisma.financialTransaction.findFirst({
      where: { id },
    });

    if (!existingTransaction) {
      throw new NotFoundException('Transação financeira não encontrada');
    }

    const transaction = await this.prisma.financialTransaction.update({
      where: { id },
      data: {
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.amount !== undefined && { amount: updateDto.amount }),
        ...(updateDto.description !== undefined && {
          description: updateDto.description,
        }),
        ...(updateDto.transactionDate && {
          transactionDate: new Date(updateDto.transactionDate),
        }),
        ...(updateDto.originType !== undefined && {
          originType: updateDto.originType,
        }),
        ...(updateDto.originId !== undefined && { originId: updateDto.originId }),
        ...(updateDto.documentNumber !== undefined && {
          documentNumber: updateDto.documentNumber,
        }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(updateDto.costCenterId !== undefined && {
          costCenterId: updateDto.costCenterId ?? null,
        }),
      },
      include: {},
    });

    return this.mapToResponse(transaction);
  }

  async remove(id: string): Promise<void> {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transação financeira não encontrada');
    }

    // Verificar se está vinculada a uma conta a pagar ou receber
    const accountPayable = await this.prisma.accountPayable.findFirst({
      where: { financialTransactionId: id },
    });

    const accountReceivable = await this.prisma.accountReceivable.findFirst({
      where: { financialTransactionId: id },
    });

    if (accountPayable || accountReceivable) {
      throw new BadRequestException(
        'Não é possível excluir transação vinculada a conta a pagar ou receber',
      );
    }

    await this.prisma.financialTransaction.delete({
      where: { id },
    });
  }

  private mapToResponse(transaction: any): FinancialTransactionResponseDto {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      transactionDate: transaction.transactionDate,
      originType: transaction.originType,
      originId: transaction.originId,
      documentNumber: transaction.documentNumber,
      notes: transaction.notes,
      costCenterId: transaction.costCenterId ?? undefined,
      companyId: transaction.companyId,
      branchId: transaction.branchId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      createdBy: transaction.createdBy,
    };
  }
}
