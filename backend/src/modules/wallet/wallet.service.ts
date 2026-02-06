import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AdjustBalanceDto, AdjustmentType } from './dto/adjust-balance.dto';
import {
  WalletSummaryDto,
  WalletBalanceDto,
  MonthlyMovementDto,
  BalanceAdjustmentResponseDto,
  CashFlowProjectionDto,
  CashFlowProjectionMonthDto,
} from './dto/wallet-response.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtém ou cria o saldo de uma filial
   */
  async getOrCreateBranchBalance(branchId: string): Promise<WalletBalanceDto> {
    let branchBalance = await this.prisma.branchBalance.findUnique({
      where: { branchId },
      include: {
        adjustments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!branchBalance) {
      // Verificar se a filial existe
      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId, deletedAt: null },
      });

      if (!branch) {
        throw new NotFoundException('Filial não encontrada');
      }

      // Criar saldo inicial zerado
      branchBalance = await this.prisma.branchBalance.create({
        data: {
          branchId,
          balance: 0,
        },
        include: {
          adjustments: true,
        },
      });
    }

    return {
      id: branchBalance.id,
      branchId: branchBalance.branchId,
      balance: Number(branchBalance.balance),
      updatedAt: branchBalance.updatedAt,
      adjustments: branchBalance.adjustments.map((adj) => ({
        id: adj.id,
        previousBalance: Number(adj.previousBalance),
        newBalance: Number(adj.newBalance),
        adjustmentType: adj.adjustmentType,
        reason: adj.reason,
        createdAt: adj.createdAt,
        createdBy: adj.createdBy,
      })),
    };
  }

  /**
   * Ajusta o saldo manualmente (apenas admin)
   */
  async adjustBalance(
    branchId: string,
    adjustDto: AdjustBalanceDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<WalletBalanceDto> {
    if (!isAdmin) {
      throw new ForbiddenException('Apenas administradores podem ajustar o saldo manualmente');
    }

    const branchBalance = await this.getOrCreateBranchBalance(branchId);
    const previousBalance = branchBalance.balance;

    // Criar ajuste e atualizar saldo em uma transação
    const [, updatedBalance] = await this.prisma.$transaction([
      this.prisma.balanceAdjustment.create({
        data: {
          branchBalanceId: branchBalance.id,
          previousBalance,
          newBalance: adjustDto.newBalance,
          adjustmentType: adjustDto.adjustmentType,
          reason: adjustDto.reason,
          createdBy: userId,
        },
      }),
      this.prisma.branchBalance.update({
        where: { id: branchBalance.id },
        data: { balance: adjustDto.newBalance },
        include: {
          adjustments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      }),
    ]);

    return {
      id: updatedBalance.id,
      branchId: updatedBalance.branchId,
      balance: Number(updatedBalance.balance),
      updatedAt: updatedBalance.updatedAt,
      adjustments: updatedBalance.adjustments.map((adj) => ({
        id: adj.id,
        previousBalance: Number(adj.previousBalance),
        newBalance: Number(adj.newBalance),
        adjustmentType: adj.adjustmentType,
        reason: adj.reason,
        createdAt: adj.createdAt,
        createdBy: adj.createdBy,
      })),
    };
  }

  /**
   * Atualiza o saldo da filial (usado internamente após pagamentos/recebimentos)
   */
  async updateBalance(branchId: string, amount: number, isIncome: boolean): Promise<void> {
    const branchBalance = await this.getOrCreateBranchBalance(branchId);

    const newBalance = isIncome ? branchBalance.balance + amount : branchBalance.balance - amount;

    await this.prisma.branchBalance.update({
      where: { id: branchBalance.id },
      data: { balance: newBalance },
    });
  }

  /**
   * Verifica se há saldo suficiente para um pagamento
   */
  async checkSufficientBalance(
    branchId: string,
    amount: number,
  ): Promise<{ sufficient: boolean; currentBalance: number }> {
    const branchBalance = await this.getOrCreateBranchBalance(branchId);
    return {
      sufficient: branchBalance.balance >= amount,
      currentBalance: branchBalance.balance,
    };
  }

  /**
   * Obtém o resumo da carteira para um mês/ano
   */
  async getWalletSummary(branchId: string, month: number, year: number): Promise<WalletSummaryDto> {
    // Verificar se a filial existe
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    // Obter saldo atual
    const branchBalance = await this.getOrCreateBranchBalance(branchId);

    // Definir período do mês
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Buscar contas a pagar do período
    const accountsPayable = await this.prisma.accountPayable.findMany({
      where: {
        branchId,
        deletedAt: null,
        OR: [
          // Pagas no período
          {
            status: 'PAID',
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Pendentes com vencimento no período
          {
            status: 'PENDING',
            dueDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    // Buscar contas a receber do período
    const accountsReceivable = await this.prisma.accountReceivable.findMany({
      where: {
        branchId,
        deletedAt: null,
        OR: [
          // Recebidas no período
          {
            status: 'RECEIVED',
            receiptDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Pendentes com vencimento no período
          {
            status: 'PENDING',
            dueDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    // Calcular totais
    const totalIncome = accountsReceivable
      .filter((ar) => ar.status === 'RECEIVED')
      .reduce((sum, ar) => sum + Number(ar.amount), 0);

    const totalExpense = accountsPayable
      .filter((ap) => ap.status === 'PAID')
      .reduce((sum, ap) => sum + Number(ap.amount), 0);

    const pendingReceivables = accountsReceivable
      .filter((ar) => ar.status === 'PENDING')
      .reduce((sum, ar) => sum + Number(ar.amount), 0);

    const pendingPayables = accountsPayable
      .filter((ap) => ap.status === 'PENDING')
      .reduce((sum, ap) => sum + Number(ap.amount), 0);

    const projectedBalance = branchBalance.balance + pendingReceivables - pendingPayables;
    const periodProfit = totalIncome - totalExpense;

    // Montar lista de movimentações
    const movements: MonthlyMovementDto[] = [
      ...accountsPayable.map((ap) => ({
        id: ap.id,
        description: ap.description,
        amount: Number(ap.amount),
        dueDate: ap.dueDate,
        paymentDate: ap.paymentDate || undefined,
        status: ap.status,
        originType: ap.originType || undefined,
        documentNumber: ap.documentNumber || undefined,
        type: 'payable' as const,
      })),
      ...accountsReceivable.map((ar) => ({
        id: ar.id,
        description: ar.description,
        amount: Number(ar.amount),
        dueDate: ar.dueDate,
        paymentDate: ar.receiptDate || undefined,
        status: ar.status,
        originType: ar.originType || undefined,
        documentNumber: ar.documentNumber || undefined,
        type: 'receivable' as const,
      })),
    ].sort((a, b) => {
      // Ordenar por status (pendentes primeiro) e depois por data
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return {
      branchId,
      branchName: branch.name,
      currentBalance: branchBalance.balance,
      totalIncome,
      totalExpense,
      pendingReceivables,
      pendingPayables,
      projectedBalance,
      periodProfit,
      movements,
      referenceMonth: month,
      referenceYear: year,
    };
  }

  /**
   * Fluxo de caixa projetado: próximos N meses com saldo inicial, recebimentos previstos (CR pendentes),
   * pagamentos previstos (CP pendentes) e saldo projetado final por mês.
   */
  async getCashFlowProjection(
    branchId: string,
    months = 6,
  ): Promise<CashFlowProjectionDto> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    const branchBalance = await this.getOrCreateBranchBalance(branchId);
    let runningBalance = branchBalance.balance;

    const result: CashFlowProjectionMonthDto[] = [];
    const now = new Date();
    const startYear = now.getFullYear();
    const startMonth = now.getMonth() + 1;

    for (let i = 0; i < months; i++) {
      const y = startYear + Math.floor((startMonth - 1 + i) / 12);
      const m = ((startMonth - 1 + i) % 12) + 1;
      const yearMonth = `${y}-${String(m).padStart(2, '0')}`;
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

      const [receivables, payables] = await Promise.all([
        this.prisma.accountReceivable.findMany({
          where: {
            branchId,
            deletedAt: null,
            status: 'PENDING',
            dueDate: { gte: monthStart, lte: monthEnd },
          },
          select: { amount: true },
        }),
        this.prisma.accountPayable.findMany({
          where: {
            branchId,
            deletedAt: null,
            status: 'PENDING',
            dueDate: { gte: monthStart, lte: monthEnd },
          },
          select: { amount: true },
        }),
      ]);

      const totalExpectedReceipts = receivables.reduce((s, r) => s + Number(r.amount), 0);
      const totalExpectedPayments = payables.reduce((s, p) => s + Number(p.amount), 0);
      const initialBalance = runningBalance;
      const projectedEndBalance = initialBalance + totalExpectedReceipts - totalExpectedPayments;
      runningBalance = projectedEndBalance;

      result.push({
        yearMonth,
        initialBalance,
        totalExpectedReceipts,
        totalExpectedPayments,
        projectedEndBalance,
      });
    }

    return { branchId, months: result };
  }

  /**
   * Obtém histórico de ajustes de saldo
   */
  async getBalanceHistory(
    branchId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: BalanceAdjustmentResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const branchBalance = await this.prisma.branchBalance.findUnique({
      where: { branchId },
    });

    if (!branchBalance) {
      return { data: [], total: 0, page, totalPages: 0 };
    }

    const [adjustments, total] = await Promise.all([
      this.prisma.balanceAdjustment.findMany({
        where: { branchBalanceId: branchBalance.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.balanceAdjustment.count({
        where: { branchBalanceId: branchBalance.id },
      }),
    ]);

    return {
      data: adjustments.map((adj) => ({
        id: adj.id,
        previousBalance: Number(adj.previousBalance),
        newBalance: Number(adj.newBalance),
        adjustmentType: adj.adjustmentType,
        reason: adj.reason,
        createdAt: adj.createdAt,
        createdBy: adj.createdBy,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
