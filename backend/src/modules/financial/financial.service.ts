import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  ResultByPeriodResponseDto,
  ResultByPeriodBreakdownItemDto,
} from './dto/result-by-period-response.dto';
import { TransactionType } from '@prisma/client';

const ORIGIN_LABELS: Record<string, string> = {
  MAINTENANCE: 'Manutenção',
  STOCK: 'Estoque',
  HR: 'Recursos Humanos',
  MANUAL: 'Manual',
  PURCHASE_ORDER: 'Pedido de compra',
  SALE_ORDER: 'Pedido de venda',
};

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resultado por período (DRE simplificada): receitas e despesas realizadas no mês/ano,
   * baseado em FinancialTransaction (transações de receita e despesa no período).
   * Opcional: filtro por costCenterId; quebra por originType e por centro de custo.
   */
  async getResultByPeriod(
    branchId: string,
    month: number,
    year: number,
    costCenterId?: string,
  ): Promise<ResultByPeriodResponseDto> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const whereBase = {
      branchId,
      transactionDate: { gte: startDate, lte: endDate },
      ...(costCenterId ? { costCenterId } : {}),
    };

    const [incomeTx, expenseTx, incomeByOrigin, expenseByOrigin, incomeByCc, expenseByCc] =
      await Promise.all([
        this.prisma.financialTransaction.aggregate({
          where: { ...whereBase, type: TransactionType.INCOME },
          _sum: { amount: true },
        }),
        this.prisma.financialTransaction.aggregate({
          where: { ...whereBase, type: TransactionType.EXPENSE },
          _sum: { amount: true },
        }),
        costCenterId
          ? Promise.resolve(null)
          : this.prisma.financialTransaction.groupBy({
              by: ['originType'],
              where: { ...whereBase, type: TransactionType.INCOME },
              _sum: { amount: true },
            }),
        costCenterId
          ? Promise.resolve(null)
          : this.prisma.financialTransaction.groupBy({
              by: ['originType'],
              where: { ...whereBase, type: TransactionType.EXPENSE },
              _sum: { amount: true },
            }),
        costCenterId
          ? Promise.resolve(null)
          : this.prisma.financialTransaction.groupBy({
              by: ['costCenterId'],
              where: { ...whereBase, type: TransactionType.INCOME },
              _sum: { amount: true },
            }),
        costCenterId
          ? Promise.resolve(null)
          : this.prisma.financialTransaction.groupBy({
              by: ['costCenterId'],
              where: { ...whereBase, type: TransactionType.EXPENSE },
              _sum: { amount: true },
            }),
      ]);

    const totalIncome = incomeTx._sum.amount ? Number(incomeTx._sum.amount) : 0;
    const totalExpense = expenseTx._sum.amount ? Number(expenseTx._sum.amount) : 0;
    const result = totalIncome - totalExpense;

    const incomeByOriginList: ResultByPeriodBreakdownItemDto[] = incomeByOrigin
      ? incomeByOrigin.map((g) => ({
          key: g.originType ?? 'NULL',
          label: ORIGIN_LABELS[g.originType ?? ''] ?? g.originType ?? 'Sem origem',
          amount: g._sum.amount ? Number(g._sum.amount) : 0,
        }))
      : [];

    const expenseByOriginList: ResultByPeriodBreakdownItemDto[] = expenseByOrigin
      ? expenseByOrigin.map((g) => ({
          key: g.originType ?? 'NULL',
          label: ORIGIN_LABELS[g.originType ?? ''] ?? g.originType ?? 'Sem origem',
          amount: g._sum.amount ? Number(g._sum.amount) : 0,
        }))
      : [];

    let byCostCenterList: ResultByPeriodBreakdownItemDto[] = [];
    if (incomeByCc || expenseByCc) {
      const allCcIds = new Set<string>();
      (incomeByCc ?? []).forEach((g) => g.costCenterId && allCcIds.add(g.costCenterId));
      (expenseByCc ?? []).forEach((g) => g.costCenterId && allCcIds.add(g.costCenterId));
      const costCenters = await this.prisma.costCenter.findMany({
        where: { id: { in: [...allCcIds] } },
        select: { id: true, code: true, name: true },
      });
      const ccMap = new Map(costCenters.map((c) => [c.id, `${c.code} - ${c.name}`]));
      const incomeByCcMap = new Map(
        (incomeByCc ?? []).map((g) => [g.costCenterId ?? 'NULL', g._sum.amount ? Number(g._sum.amount) : 0]),
      );
      const expenseByCcMap = new Map(
        (expenseByCc ?? []).map((g) => [g.costCenterId ?? 'NULL', g._sum.amount ? Number(g._sum.amount) : 0]),
      );
      const keys = new Set([...incomeByCcMap.keys(), ...expenseByCcMap.keys()]);
      byCostCenterList = [...keys].map((key) => {
        const inc = incomeByCcMap.get(key) ?? 0;
        const exp = expenseByCcMap.get(key) ?? 0;
        const label = key === 'NULL' ? 'Sem centro de custo' : ccMap.get(key) ?? key;
        return { key, label, amount: inc - exp };
      }).filter((x) => x.amount !== 0);
    }

    return {
      branchId,
      month,
      year,
      costCenterId,
      totalIncome,
      totalExpense,
      result,
      incomeByOrigin: incomeByOriginList.length ? incomeByOriginList : undefined,
      expenseByOrigin: expenseByOriginList.length ? expenseByOriginList : undefined,
      byCostCenter: byCostCenterList.length ? byCostCenterList : undefined,
    };
  }
}
