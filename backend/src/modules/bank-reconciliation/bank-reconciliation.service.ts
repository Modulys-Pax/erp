import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateBankStatementDto } from './dto/create-bank-statement.dto';
import { CreateBankStatementItemDto } from './dto/create-bank-statement-item.dto';
import { ReconcileItemDto } from './dto/reconcile-item.dto';
import {
  BankStatementResponseDto,
  BankStatementItemResponseDto,
} from './dto/bank-reconciliation-response.dto';
import { BankStatementItemType } from '@prisma/client';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';

@Injectable()
export class BankReconciliationService {
  constructor(private prisma: PrismaService) {}

  async createStatement(
    dto: CreateBankStatementDto,
    userId?: string,
    user?: any,
  ): Promise<BankStatementResponseDto> {
    if (user) {
      validateBranchAccess(user.branchId, user.role, dto.branchId, undefined);
    }
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Filial não encontrada');

    const statement = await this.prisma.bankStatement.create({
      data: {
        branchId: dto.branchId,
        description: dto.description?.trim() || null,
        referenceMonth: dto.referenceMonth,
        referenceYear: dto.referenceYear,
        createdBy: userId,
      },
    });
    return this.mapStatementToResponse(statement);
  }

  async findAllStatements(
    branchId: string,
    referenceMonth?: number,
    referenceYear?: number,
    user?: any,
  ): Promise<BankStatementResponseDto[]> {
    if (user) {
      validateBranchAccess(user.branchId, user.role, branchId, undefined);
    }
    const where: any = { branchId };
    if (referenceMonth != null) where.referenceMonth = referenceMonth;
    if (referenceYear != null) where.referenceYear = referenceYear;

    const statements = await this.prisma.bankStatement.findMany({
      where,
      orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { items: true } },
        items: { select: { financialTransactionId: true } },
      },
    });

    return statements.map((s) => ({
      id: s.id,
      branchId: s.branchId,
      description: s.description ?? undefined,
      referenceMonth: s.referenceMonth,
      referenceYear: s.referenceYear,
      uploadedAt: s.uploadedAt ?? undefined,
      createdAt: s.createdAt,
      createdBy: s.createdBy ?? undefined,
      itemCount: s._count.items,
      reconciledCount: s.items.filter((i) => i.financialTransactionId != null).length,
    }));
  }

  async findOneStatement(id: string, user?: any): Promise<BankStatementResponseDto> {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true } },
        items: { select: { financialTransactionId: true } },
      },
    });
    if (!statement) throw new NotFoundException('Extrato não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, statement.branchId, undefined);
    }
    return {
      id: statement.id,
      branchId: statement.branchId,
      description: statement.description ?? undefined,
      referenceMonth: statement.referenceMonth,
      referenceYear: statement.referenceYear,
      uploadedAt: statement.uploadedAt ?? undefined,
      createdAt: statement.createdAt,
      createdBy: statement.createdBy ?? undefined,
      itemCount: statement._count.items,
      reconciledCount: statement.items.filter((i) => i.financialTransactionId != null).length,
    };
  }

  async addItem(
    statementId: string,
    dto: CreateBankStatementItemDto,
    user?: any,
  ): Promise<BankStatementItemResponseDto> {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id: statementId },
    });
    if (!statement) throw new NotFoundException('Extrato não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, statement.branchId, undefined);
    }

    const item = await this.prisma.bankStatementItem.create({
      data: {
        bankStatementId: statementId,
        transactionDate: new Date(dto.transactionDate),
        amount: dto.amount,
        description: dto.description?.trim() || null,
        type: dto.type as BankStatementItemType,
      },
    });
    return this.mapItemToResponse(item);
  }

  async getItems(
    statementId: string,
    reconciledOnly?: boolean,
    user?: any,
  ): Promise<BankStatementItemResponseDto[]> {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id: statementId },
      include: { items: { include: { financialTransaction: { select: { description: true } } } } },
    });
    if (!statement) throw new NotFoundException('Extrato não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, statement.branchId, undefined);
    }

    let items = statement.items;
    if (reconciledOnly === true) {
      items = items.filter((i) => i.financialTransactionId != null);
    } else if (reconciledOnly === false) {
      items = items.filter((i) => i.financialTransactionId == null);
    }

    return items.map((i) => this.mapItemToResponse(i));
  }

  async reconcileItem(
    itemId: string,
    dto: ReconcileItemDto,
    user?: any,
  ): Promise<BankStatementItemResponseDto> {
    const item = await this.prisma.bankStatementItem.findUnique({
      where: { id: itemId },
      include: { bankStatement: true, financialTransaction: true },
    });
    if (!item) throw new NotFoundException('Item do extrato não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, item.bankStatement.branchId, undefined);
    }

    const ft = await this.prisma.financialTransaction.findUnique({
      where: { id: dto.financialTransactionId },
    });
    if (!ft) throw new NotFoundException('Transação financeira não encontrada');
    if (ft.branchId !== item.bankStatement.branchId) {
      throw new BadRequestException('Transação deve ser da mesma filial do extrato');
    }

    const updated = await this.prisma.bankStatementItem.update({
      where: { id: itemId },
      data: { financialTransactionId: dto.financialTransactionId },
      include: { financialTransaction: { select: { description: true } } },
    });
    return this.mapItemToResponse(updated);
  }

  async unreconcileItem(itemId: string, user?: any): Promise<BankStatementItemResponseDto> {
    const item = await this.prisma.bankStatementItem.findUnique({
      where: { id: itemId },
      include: { bankStatement: true },
    });
    if (!item) throw new NotFoundException('Item do extrato não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, item.bankStatement.branchId, undefined);
    }

    const updated = await this.prisma.bankStatementItem.update({
      where: { id: itemId },
      data: { financialTransactionId: null },
    });
    return this.mapItemToResponse(updated);
  }

  private async mapStatementToResponse(s: {
    id: string;
    branchId: string;
    description: string | null;
    referenceMonth: number;
    referenceYear: number;
    uploadedAt: Date | null;
    createdAt: Date;
    createdBy: string | null;
  }): Promise<BankStatementResponseDto> {
    const [itemCount, reconciledCount] = await Promise.all([
      this.prisma.bankStatementItem.count({ where: { bankStatementId: s.id } }),
      this.prisma.bankStatementItem.count({
        where: { bankStatementId: s.id, financialTransactionId: { not: null } },
      }),
    ]);
    return {
      id: s.id,
      branchId: s.branchId,
      description: s.description ?? undefined,
      referenceMonth: s.referenceMonth,
      referenceYear: s.referenceYear,
      uploadedAt: s.uploadedAt ?? undefined,
      createdAt: s.createdAt,
      createdBy: s.createdBy ?? undefined,
      itemCount,
      reconciledCount,
    };
  }

  private mapItemToResponse(i: any): BankStatementItemResponseDto {
    return {
      id: i.id,
      bankStatementId: i.bankStatementId,
      transactionDate: i.transactionDate,
      amount: Number(i.amount),
      description: i.description ?? undefined,
      type: i.type,
      financialTransactionId: i.financialTransactionId ?? undefined,
      reconciled: i.financialTransactionId != null,
      financialTransactionDescription: i.financialTransaction?.description ?? undefined,
      createdAt: i.createdAt,
    };
  }
}
