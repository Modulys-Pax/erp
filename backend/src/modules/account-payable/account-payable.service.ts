import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/update-account-payable.dto';
import { PayAccountPayableDto } from './dto/pay-account-payable.dto';
import { AccountPayableResponseDto } from './dto/account-payable-response.dto';
import {
  ProcessPayrollDto,
  ProcessPayrollResultDto,
  PayrollEmployeeDetail,
  PayrollEmployeeBenefitDetail,
} from './dto/process-payroll.dto';
import {
  ReportBySupplierResponseDto,
  AccountPayableBySupplierGroupDto,
} from './dto/report-by-supplier-response.dto';
import { getWorkingDaysInMonth } from '../../shared/utils/working-days.util';
import {
  FinancialAccountsSummaryResponseDto,
  FinancialAccountsSummaryDto,
  AccountPayableDetailDto,
  AccountReceivableDetailDto,
} from './dto/financial-accounts-summary-response.dto';
import {
  AccountPayableSummaryResponseDto,
  AccountPayableSummaryDto,
} from './dto/account-payable-summary-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { calculateRiskAdditionAmount, getRiskAdditionDisplayName } from '../../shared/constants/risk-addition.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class AccountPayableService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
  ) {}

  async create(
    createDto: CreateAccountPayableDto,
    userId?: string,
    user?: any,
  ): Promise<AccountPayableResponseDto> {
    // Usar DEFAULT_COMPANY_ID (single-tenant)
    const companyId = DEFAULT_COMPANY_ID;

    // Validar acesso por filial (não-admin só cria na própria filial)
    // O interceptor já força o branchId no body, mas validamos aqui também por segurança
    if (user) {
      validateBranchAccess(user.branchId, user.role, createDto.branchId, undefined);
    }

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

    const accountPayable = await this.prisma.accountPayable.create({
      data: {
        description: createDto.description,
        amount: createDto.amount,
        dueDate: new Date(createDto.dueDate),
        originType: createDto.originType,
        originId: createDto.originId,
        documentNumber: createDto.documentNumber,
        notes: createDto.notes,
        supplierId: createDto.supplierId ?? undefined,
        costCenterId: createDto.costCenterId ?? undefined,
        companyId: companyId,
        branchId: createDto.branchId,
        status: 'PENDING',
        createdBy: userId,
      },
    });

    return this.mapToResponse(accountPayable);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AccountPayableResponseDto[]> {
    const where: Prisma.AccountPayableWhereInput = {
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (status) {
      where.status = status as any;
    }

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) {
        where.dueDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate);
      }
    }

    const accountsPayable = await this.prisma.accountPayable.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: { supplier: true, costCenter: true },
    });

    const hrOriginIds = accountsPayable
      .filter((a) => a.originType === 'HR' && a.originId)
      .map((a) => a.originId as string);
    const employeeLabelMap = new Map<string, string>();
    if (hrOriginIds.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: { id: { in: hrOriginIds }, deletedAt: null },
        select: { id: true, riskAdditionType: true, insalubrityDegree: true },
      });
      for (const emp of employees) {
        const label = getRiskAdditionDisplayName(emp.riskAdditionType, emp.insalubrityDegree);
        if (label) employeeLabelMap.set(emp.id, label);
      }
    }

    return accountsPayable.map((account) => {
      const dto = this.mapToResponse(account);
      if (account.originType === 'HR' && account.originId) {
        const label = employeeLabelMap.get(account.originId);
        if (label) dto.riskAdditionLabel = label;
      }
      return dto;
    });
  }

  async findOne(id: string, user?: any): Promise<AccountPayableResponseDto> {
    const accountPayable = await this.prisma.accountPayable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        financialTransaction: true,
        supplier: true,
        costCenter: true,
      },
    });

    if (!accountPayable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, accountPayable.branchId);
    }

    return this.mapToResponse(accountPayable);
  }

  async update(
    id: string,
    updateDto: UpdateAccountPayableDto,
    user?: any,
  ): Promise<AccountPayableResponseDto> {
    const existingAccount = await this.prisma.accountPayable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingAccount) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, updateDto.branchId, existingAccount.branchId);
    }

    if (existingAccount.status === 'PAID') {
      throw new BadRequestException('Não é possível editar conta a pagar já paga');
    }

    const accountPayable = await this.prisma.accountPayable.update({
      where: { id },
      data: {
        ...(updateDto.description !== undefined && {
          description: updateDto.description,
        }),
        ...(updateDto.amount !== undefined && { amount: updateDto.amount }),
        ...(updateDto.dueDate && { dueDate: new Date(updateDto.dueDate) }),
        ...(updateDto.originType !== undefined && {
          originType: updateDto.originType,
        }),
        ...(updateDto.originId !== undefined && { originId: updateDto.originId }),
        ...(updateDto.documentNumber !== undefined && {
          documentNumber: updateDto.documentNumber,
        }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        ...(updateDto.supplierId !== undefined && { supplierId: updateDto.supplierId ?? null }),
        ...(updateDto.costCenterId !== undefined && { costCenterId: updateDto.costCenterId ?? null }),
      },
    });

    return this.mapToResponse(accountPayable);
  }

  async pay(
    id: string,
    payDto: PayAccountPayableDto,
    userId?: string,
  ): Promise<AccountPayableResponseDto> {
    const accountPayable = await this.prisma.accountPayable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!accountPayable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    if (accountPayable.status === 'PAID') {
      throw new BadRequestException('Conta a pagar já foi paga');
    }

    if (accountPayable.status === 'CANCELLED') {
      throw new BadRequestException('Conta a pagar está cancelada');
    }

    // Verificar saldo antes de pagar
    const amount = Number(accountPayable.amount);
    const balanceCheck = await this.walletService.checkSufficientBalance(
      accountPayable.branchId,
      amount,
    );

    if (!balanceCheck.sufficient) {
      throw new BadRequestException(
        `Saldo insuficiente para realizar o pagamento. ` +
          `Saldo atual: R$ ${balanceCheck.currentBalance.toFixed(2)} | ` +
          `Valor necessário: R$ ${amount.toFixed(2)} | ` +
          `Faltam: R$ ${(amount - balanceCheck.currentBalance).toFixed(2)}`,
      );
    }

    const paymentDate = payDto.paymentDate ? new Date(payDto.paymentDate) : new Date();

    // Criar transação financeira e atualizar conta a pagar em uma transação
    const result = await this.prisma.$transaction(async (tx) => {
      // Criar transação financeira
      const financialTransaction = await tx.financialTransaction.create({
        data: {
          type: 'EXPENSE',
          amount: accountPayable.amount,
          description: accountPayable.description,
          transactionDate: paymentDate,
          originType: accountPayable.originType,
          originId: accountPayable.originId,
          documentNumber: accountPayable.documentNumber,
          notes: payDto.notes || accountPayable.notes,
          costCenterId: accountPayable.costCenterId ?? undefined,
          companyId: accountPayable.companyId,
          branchId: accountPayable.branchId,
          createdBy: userId,
        },
      });

      // Atualizar conta a pagar
      const updatedAccount = await tx.accountPayable.update({
        where: { id },
        data: {
          status: 'PAID',
          paymentDate,
          financialTransactionId: financialTransaction.id,
        },
        include: {
          financialTransaction: true,
        },
      });

      return updatedAccount;
    });

    // Atualizar saldo da filial (diminuir)
    await this.walletService.updateBalance(accountPayable.branchId, amount, false);

    return this.mapToResponse(result);
  }

  async cancel(id: string): Promise<AccountPayableResponseDto> {
    const accountPayable = await this.prisma.accountPayable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!accountPayable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    if (accountPayable.status === 'PAID') {
      throw new BadRequestException('Não é possível cancelar conta a pagar já paga');
    }

    if (accountPayable.status === 'CANCELLED') {
      throw new BadRequestException('Conta a pagar já está cancelada');
    }

    const updatedAccount = await this.prisma.accountPayable.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    return this.mapToResponse(updatedAccount);
  }

  /**
   * Relatório de contas a pagar agrupadas por fornecedor (período/filial).
   */
  async getReportBySupplier(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    user?: any,
  ): Promise<ReportBySupplierResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;
    let effectiveBranchId = branchId;
    if (user) {
      const isAdmin = user.role?.toLowerCase() === 'admin';
      if (!isAdmin && !branchId) effectiveBranchId = user.branchId;
      if (effectiveBranchId) {
        validateBranchAccess(user.branchId, user.role, effectiveBranchId, undefined);
      }
    }

    const where: Prisma.AccountPayableWhereInput = {
      companyId,
      deletedAt: null,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    };
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.dueDate.lte = end;
      }
    }

    const accounts = await this.prisma.accountPayable.findMany({
      where,
      orderBy: [{ supplierId: 'asc' }, { dueDate: 'asc' }],
      include: { supplier: true, costCenter: true },
    });

    const map = new Map<string | null, AccountPayableResponseDto[]>();
    for (const acc of accounts) {
      const key = acc.supplierId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(this.mapToResponse(acc));
    }

    const groups: AccountPayableBySupplierGroupDto[] = [];
    let totalAmount = 0;
    for (const [supplierId, items] of map) {
      const total = items.reduce((s, i) => s + i.amount, 0);
      totalAmount += total;
      groups.push({
        supplierId,
        supplierName: items[0]?.supplierName ?? 'Sem fornecedor',
        total,
        count: items.length,
        items,
      });
    }
    groups.sort((a, b) => (b.total - a.total));

    return { groups, totalAmount };
  }

  async remove(id: string, user?: any): Promise<void> {
    const accountPayable = await this.prisma.accountPayable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!accountPayable) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, accountPayable.branchId);
    }

    if (accountPayable.status === 'PAID') {
      throw new BadRequestException('Não é possível excluir conta a pagar já paga');
    }

    await this.prisma.accountPayable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Obtém dashboard de resumo financeiro (contas a pagar e receber)
   */
  async getFinancialAccountsSummary(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    payablePage = 1,
    receivablePage = 1,
    limit = 15,
    user?: any,
    filterDateType: 'dueDate' | 'createdAt' = 'dueDate',
  ): Promise<FinancialAccountsSummaryResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;
    const payableSkip = (payablePage - 1) * limit;
    const receivableSkip = (receivablePage - 1) * limit;

    // Validar acesso por filial (não-admin só acessa própria filial)
    let effectiveBranchId = branchId;
    if (user) {
      const isAdmin = user.role?.toLowerCase() === 'admin';

      // Se não for admin e não tiver branchId na query, usar branchId do usuário
      if (!isAdmin && !branchId) {
        effectiveBranchId = user.branchId;
      }

      // Validar acesso se branchId foi fornecido
      if (effectiveBranchId) {
        validateBranchAccess(user.branchId, user.role, effectiveBranchId, undefined);
      }
    }

    // Filtro base para contas a pagar
    const payableWhere: Prisma.AccountPayableWhereInput = {
      companyId,
      deletedAt: null,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    };

    // Filtro base para contas a receber
    const receivableWhere: Prisma.AccountReceivableWhereInput = {
      companyId,
      deletedAt: null,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    };

    // Aplicar filtro de data se fornecido (por vencimento ou por cadastro)
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.lte = endDateTime;
      }
      const dateField = filterDateType === 'createdAt' ? 'createdAt' : 'dueDate';
      payableWhere[dateField] = dateFilter;
      receivableWhere[dateField] = dateFilter;
    }

    // Calcular totais de contas a pagar por status
    const [payablePending, payablePaid, payableCancelled] = await Promise.all([
      this.prisma.accountPayable.aggregate({
        where: { ...payableWhere, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.accountPayable.aggregate({
        where: { ...payableWhere, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.accountPayable.aggregate({
        where: { ...payableWhere, status: 'CANCELLED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Calcular totais de contas a receber por status
    const [receivablePending, receivableReceived, receivableCancelled] = await Promise.all([
      this.prisma.accountReceivable.aggregate({
        where: { ...receivableWhere, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.accountReceivable.aggregate({
        where: { ...receivableWhere, status: 'RECEIVED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.accountReceivable.aggregate({
        where: { ...receivableWhere, status: 'CANCELLED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Buscar contas a pagar com paginação
    const accountsPayable = await this.prisma.accountPayable.findMany({
      where: payableWhere,
      skip: payableSkip,
      take: limit,
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        description: true,
        amount: true,
        dueDate: true,
        paymentDate: true,
        status: true,
        documentNumber: true,
        createdAt: true,
      },
    });

    // Buscar contas a receber com paginação
    const accountsReceivable = await this.prisma.accountReceivable.findMany({
      where: receivableWhere,
      skip: receivableSkip,
      take: limit,
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        description: true,
        amount: true,
        dueDate: true,
        receiptDate: true,
        status: true,
        documentNumber: true,
        createdAt: true,
      },
    });

    // Contar totais para paginação
    const [totalPayableCount, totalReceivableCount] = await Promise.all([
      this.prisma.accountPayable.count({ where: payableWhere }),
      this.prisma.accountReceivable.count({ where: receivableWhere }),
    ]);

    // Calcular totais
    const totalPayablePending = payablePending._sum.amount ? Number(payablePending._sum.amount) : 0;
    const totalPayablePaid = payablePaid._sum.amount ? Number(payablePaid._sum.amount) : 0;
    const totalPayableCancelled = payableCancelled._sum.amount
      ? Number(payableCancelled._sum.amount)
      : 0;
    const totalPayable = totalPayablePending + totalPayablePaid + totalPayableCancelled;

    const totalReceivablePending = receivablePending._sum.amount
      ? Number(receivablePending._sum.amount)
      : 0;
    const totalReceivableReceived = receivableReceived._sum.amount
      ? Number(receivableReceived._sum.amount)
      : 0;
    const totalReceivableCancelled = receivableCancelled._sum.amount
      ? Number(receivableCancelled._sum.amount)
      : 0;
    const totalReceivable =
      totalReceivablePending + totalReceivableReceived + totalReceivableCancelled;

    const netBalance = totalReceivable - totalPayable;

    const summary: FinancialAccountsSummaryDto = {
      totalPayablePending,
      totalPayablePaid,
      totalPayableCancelled,
      totalPayable,
      countPayablePending: payablePending._count,
      countPayablePaid: payablePaid._count,
      countPayableCancelled: payableCancelled._count,
      totalReceivablePending,
      totalReceivableReceived,
      totalReceivableCancelled,
      totalReceivable,
      countReceivablePending: receivablePending._count,
      countReceivableReceived: receivableReceived._count,
      countReceivableCancelled: receivableCancelled._count,
      netBalance,
    };

    return {
      summary,
      accountsPayable: {
        data: accountsPayable.map((account) => ({
          id: account.id,
          description: account.description,
          amount: Number(account.amount),
          dueDate: account.dueDate,
          paymentDate: account.paymentDate || undefined,
          status: account.status,
          documentNumber: account.documentNumber || undefined,
          createdAt: account.createdAt,
        })),
        total: totalPayableCount,
        page: payablePage,
        limit,
        totalPages: Math.ceil(totalPayableCount / limit),
      },
      accountsReceivable: {
        data: accountsReceivable.map((account) => ({
          id: account.id,
          description: account.description,
          amount: Number(account.amount),
          dueDate: account.dueDate,
          receiptDate: account.receiptDate || undefined,
          status: account.status,
          documentNumber: account.documentNumber || undefined,
          createdAt: account.createdAt,
        })),
        total: totalReceivableCount,
        page: receivablePage,
        limit,
        totalPages: Math.ceil(totalReceivableCount / limit),
      },
    };
  }

  /**
   * Obtém resumo de contas a pagar
   */
  async getAccountPayableSummary(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    page = 1,
    limit = 15,
    user?: any,
    originType?: string,
  ): Promise<AccountPayableSummaryResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;
    const skip = (page - 1) * limit;

    // Validar acesso por filial (não-admin só acessa própria filial)
    let effectiveBranchId = branchId;
    if (user) {
      const isAdmin = user.role?.toLowerCase() === 'admin';

      // Se não for admin e não tiver branchId na query, usar branchId do usuário
      if (!isAdmin && !branchId) {
        effectiveBranchId = user.branchId;
      }

      // Validar acesso se branchId foi fornecido
      if (effectiveBranchId) {
        validateBranchAccess(user.branchId, user.role, effectiveBranchId, undefined);
      }
    }

    // Filtro base para contas a pagar (sem status, para calcular totais)
    const basePayableWhere: Prisma.AccountPayableWhereInput = {
      companyId,
      deletedAt: null,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(originType ? { originType: originType as any } : {}),
    };

    // Aplicar filtro de data se fornecido
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        dateFilter.lte = endDateTime;
      }
      basePayableWhere.dueDate = dateFilter;
    }

    // Filtro para lista paginada (inclui status se fornecido)
    const payableWhere: Prisma.AccountPayableWhereInput = {
      ...basePayableWhere,
      ...(status ? { status: status as any } : {}),
    };

    // Calcular totais de contas a pagar por status (sem filtro de status)
    const [payablePending, payablePaid, payableCancelled] = await Promise.all([
      this.prisma.accountPayable.aggregate({
        where: { ...basePayableWhere, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.accountPayable.aggregate({
        where: { ...basePayableWhere, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.accountPayable.aggregate({
        where: { ...basePayableWhere, status: 'CANCELLED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Buscar contas a pagar com paginação (com filtro de status se fornecido)
    const accountsPayable = await this.prisma.accountPayable.findMany({
      where: payableWhere,
      skip,
      take: limit,
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        description: true,
        amount: true,
        dueDate: true,
        paymentDate: true,
        status: true,
        documentNumber: true,
        originType: true,
        originId: true,
      },
    });

    // Contar total para paginação (com filtro de status se fornecido)
    const totalPayableCount = await this.prisma.accountPayable.count({
      where: payableWhere,
    });

    // Calcular totais
    const totalPayablePending = payablePending._sum.amount ? Number(payablePending._sum.amount) : 0;
    const totalPayablePaid = payablePaid._sum.amount ? Number(payablePaid._sum.amount) : 0;
    const totalPayableCancelled = payableCancelled._sum.amount
      ? Number(payableCancelled._sum.amount)
      : 0;
    const totalPayable = totalPayablePending + totalPayablePaid + totalPayableCancelled;

    const summary: AccountPayableSummaryDto = {
      totalPayablePending,
      totalPayablePaid,
      totalPayableCancelled,
      totalPayable,
      countPayablePending: payablePending._count,
      countPayablePaid: payablePaid._count,
      countPayableCancelled: payableCancelled._count,
    };

    return {
      summary,
      accountsPayable: {
        data: accountsPayable.map((account) => ({
          id: account.id,
          description: account.description,
          amount: Number(account.amount),
          dueDate: account.dueDate,
          paymentDate: account.paymentDate || undefined,
          status: account.status,
          documentNumber: account.documentNumber || undefined,
        })),
        total: totalPayableCount,
        page,
        limit,
        totalPages: Math.ceil(totalPayableCount / limit),
      },
    };
  }

  /**
   * Valida se o mês/ano de referência está dentro do período permitido.
   * Regra: Somente mês atual ou 1 mês no passado. Meses futuros não são permitidos.
   */
  private validateReferencePeriod(referenceMonth: number, referenceYear: number): void {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const currentTotalMonths = currentYear * 12 + currentMonth;
    const referenceTotalMonths = referenceYear * 12 + referenceMonth;
    const monthsDiff = currentTotalMonths - referenceTotalMonths;

    if (monthsDiff < 0) {
      throw new BadRequestException(
        'Não é permitido processar folha de pagamento para meses futuros',
      );
    }

    if (monthsDiff > 1) {
      let allowedMinMonth = currentMonth - 1;
      let allowedMinYear = currentYear;

      if (allowedMinMonth <= 0) {
        allowedMinMonth += 12;
        allowedMinYear -= 1;
      }

      throw new BadRequestException(
        `Período fora do limite permitido. Só é possível processar folha a partir de ${allowedMinMonth.toString().padStart(2, '0')}/${allowedMinYear}`,
      );
    }
  }

  /**
   * Processa a folha de pagamento para um mês/ano específico.
   * Cria contas a pagar para todos os funcionários ativos (salário + benefícios).
   */
  async processPayroll(
    processDto: ProcessPayrollDto,
    userId?: string,
    user?: any,
  ): Promise<ProcessPayrollResultDto> {
    // Validar período de referência
    this.validateReferencePeriod(processDto.referenceMonth, processDto.referenceYear);

    const companyId = DEFAULT_COMPANY_ID;

    // Validar acesso por filial
    if (user) {
      validateBranchAccess(user.branchId, user.role, processDto.branchId, undefined);
    }

    // Verificar se filial existe
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: processDto.branchId,
        companyId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    // Calcular data de vencimento (se não fornecida, usar dia 5 do próximo mês)
    let dueDate: Date;
    if (processDto.dueDate) {
      dueDate = new Date(processDto.dueDate);
    } else {
      let dueMonth = processDto.referenceMonth + 1;
      let dueYear = processDto.referenceYear;
      if (dueMonth > 12) {
        dueMonth = 1;
        dueYear++;
      }
      dueDate = new Date(dueYear, dueMonth - 1, 5);
    }

    // Buscar todos os funcionários ativos da filial
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        branchId: processDto.branchId,
        deletedAt: null,
        active: true,
      },
      orderBy: { name: 'asc' },
    });

    // Buscar contas a pagar já existentes para o mês/ano (originType = HR)
    const existingAccounts = await this.prisma.accountPayable.findMany({
      where: {
        companyId,
        branchId: processDto.branchId,
        originType: 'HR',
        deletedAt: null,
        // Usar documentNumber para identificar o mês/ano e funcionário
        documentNumber: {
          startsWith: `FOLHA-${processDto.referenceMonth.toString().padStart(2, '0')}/${processDto.referenceYear}-`,
        },
      },
    });

    // Criar mapa de contas existentes por employeeId
    const existingMap = new Map<string, any>();
    for (const account of existingAccounts) {
      // Extrair employeeId do documentNumber: FOLHA-MM/YYYY-employeeId
      const parts = account.documentNumber?.split('-');
      if (parts && parts.length >= 3) {
        const employeeId = parts.slice(2).join('-'); // Caso o ID tenha hífen
        existingMap.set(employeeId, account);
      }
    }

    // Nome dos meses para descrição
    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    const monthName = monthNames[processDto.referenceMonth - 1];

    // Processar cada funcionário
    const details: PayrollEmployeeDetail[] = [];
    let created = 0;
    let alreadyExists = 0;
    let skippedNoSalary = 0;
    let totalAmount = 0;

    for (const employee of employees) {
      const monthlySalary = employee.monthlySalary ? Number(employee.monthlySalary) : 0;
      const riskAdditionAmount = calculateRiskAdditionAmount(
        employee.riskAdditionType,
        employee.insalubrityDegree,
        monthlySalary,
      );
      const riskAdditionLabel = getRiskAdditionDisplayName(employee.riskAdditionType, employee.insalubrityDegree);

      // Verificar se já existe conta a pagar
      const existing = existingMap.get(employee.id);
      if (existing) {
        alreadyExists++;
        details.push({
          employeeId: employee.id,
          employeeName: employee.name,
          baseSalary: monthlySalary,
          riskAdditionAmount: riskAdditionAmount > 0 ? riskAdditionAmount : undefined,
          riskAdditionLabel: riskAdditionLabel || undefined,
          totalBenefits: 0,
          totalAmount: Number(existing.amount),
          benefits: [],
          status: 'already_exists',
          accountPayableId: existing.id,
        });
        continue;
      }

      // Verificar se tem salário base
      if (monthlySalary <= 0) {
        skippedNoSalary++;
        details.push({
          employeeId: employee.id,
          employeeName: employee.name,
          baseSalary: 0,
          totalBenefits: 0,
          totalAmount: 0,
          benefits: [],
          status: 'skipped_no_salary',
        });
        continue;
      }

      // Buscar benefícios ativos do funcionário
      const employeeBenefits = await this.prisma.employeeBenefit.findMany({
        where: {
          employeeId: employee.id,
          branchId: processDto.branchId,
          active: true,
          deletedAt: null,
        },
        include: {
          benefit: true,
        },
      });

      // Calcular benefícios
      const benefitDetails: PayrollEmployeeBenefitDetail[] = [];
      let totalBenefits = 0;

      for (const employeeBenefit of employeeBenefits) {
        const benefit = employeeBenefit.benefit;
        if (!benefit || benefit.deletedAt) continue;

        // Calcular dias úteis do mês de referência
        const workingDays = getWorkingDaysInMonth({
          year: processDto.referenceYear,
          month: processDto.referenceMonth,
          includeWeekends: benefit.includeWeekends,
          holidays: [],
        });

        const monthlyCost = Number(benefit.dailyCost) * workingDays;
        totalBenefits += monthlyCost;

        benefitDetails.push({
          benefitName: benefit.name,
          amount: monthlyCost,
        });
      }

      const employeeTotal = monthlySalary + riskAdditionAmount + totalBenefits;
      totalAmount += employeeTotal;

      // Criar descrição detalhada
      let description = `Folha de Pagamento - ${employee.name} - ${monthName}/${processDto.referenceYear}`;
      const salaryPart = riskAdditionAmount > 0 && riskAdditionLabel
        ? `Salário: R$ ${monthlySalary.toFixed(2)} + ${riskAdditionLabel}: R$ ${riskAdditionAmount.toFixed(2)}`
        : `Salário: R$ ${monthlySalary.toFixed(2)}`;
      if (benefitDetails.length > 0) {
        const benefitsSummary = benefitDetails
          .map((b) => `${b.benefitName}: R$ ${b.amount.toFixed(2)}`)
          .join(', ');
        description += ` (${salaryPart} + Benefícios: ${benefitsSummary})`;
      }

      const notesParts = [salaryPart];
      if (totalBenefits > 0) notesParts.push(`Benefícios: R$ ${totalBenefits.toFixed(2)}`);

      // Criar conta a pagar
      const accountPayable = await this.prisma.accountPayable.create({
        data: {
          description,
          amount: employeeTotal,
          dueDate,
          status: 'PENDING',
          originType: 'HR',
          originId: employee.id,
          documentNumber: `FOLHA-${processDto.referenceMonth.toString().padStart(2, '0')}/${processDto.referenceYear}-${employee.id}`,
          notes: notesParts.join(' | '),
          companyId,
          branchId: processDto.branchId,
          createdBy: userId,
        },
      });

      created++;
      details.push({
        employeeId: employee.id,
        employeeName: employee.name,
        baseSalary: monthlySalary,
        riskAdditionAmount: riskAdditionAmount > 0 ? riskAdditionAmount : undefined,
        riskAdditionLabel: riskAdditionLabel || undefined,
        totalBenefits,
        totalAmount: employeeTotal,
        benefits: benefitDetails,
        status: 'created',
        accountPayableId: accountPayable.id,
      });
    }

    return {
      totalEmployees: employees.length,
      created,
      alreadyExists,
      skippedNoSalary,
      totalAmount,
      details,
    };
  }

  /**
   * Obtém prévia da folha de pagamento (sem criar contas a pagar)
   */
  async getPayrollPreview(
    referenceMonth: number,
    referenceYear: number,
    branchId: string,
  ): Promise<PayrollEmployeeDetail[]> {
    const companyId = DEFAULT_COMPANY_ID;

    // Buscar todos os funcionários ativos da filial
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        branchId,
        deletedAt: null,
        active: true,
      },
      orderBy: { name: 'asc' },
    });

    // Buscar contas a pagar já existentes
    const existingAccounts = await this.prisma.accountPayable.findMany({
      where: {
        companyId,
        branchId,
        originType: 'HR',
        deletedAt: null,
        documentNumber: {
          startsWith: `FOLHA-${referenceMonth.toString().padStart(2, '0')}/${referenceYear}-`,
        },
      },
    });

    const existingMap = new Map<string, any>();
    for (const account of existingAccounts) {
      const parts = account.documentNumber?.split('-');
      if (parts && parts.length >= 3) {
        const employeeId = parts.slice(2).join('-');
        existingMap.set(employeeId, account);
      }
    }

    const details: PayrollEmployeeDetail[] = [];

    for (const employee of employees) {
      const monthlySalary = employee.monthlySalary ? Number(employee.monthlySalary) : 0;
      const riskAdditionAmount = calculateRiskAdditionAmount(
        employee.riskAdditionType,
        employee.insalubrityDegree,
        monthlySalary,
      );
      const riskAdditionLabel = getRiskAdditionDisplayName(employee.riskAdditionType, employee.insalubrityDegree);
      const existing = existingMap.get(employee.id);

      if (existing) {
        details.push({
          employeeId: employee.id,
          employeeName: employee.name,
          baseSalary: monthlySalary,
          riskAdditionAmount: riskAdditionAmount > 0 ? riskAdditionAmount : undefined,
          riskAdditionLabel: riskAdditionLabel || undefined,
          totalBenefits: 0,
          totalAmount: Number(existing.amount),
          benefits: [],
          status: 'already_exists',
          accountPayableId: existing.id,
        });
        continue;
      }

      if (monthlySalary <= 0) {
        details.push({
          employeeId: employee.id,
          employeeName: employee.name,
          baseSalary: 0,
          totalBenefits: 0,
          totalAmount: 0,
          benefits: [],
          status: 'skipped_no_salary',
        });
        continue;
      }

      // Buscar benefícios
      const employeeBenefits = await this.prisma.employeeBenefit.findMany({
        where: {
          employeeId: employee.id,
          branchId,
          active: true,
          deletedAt: null,
        },
        include: {
          benefit: true,
        },
      });

      const benefitDetails: PayrollEmployeeBenefitDetail[] = [];
      let totalBenefits = 0;

      for (const employeeBenefit of employeeBenefits) {
        const benefit = employeeBenefit.benefit;
        if (!benefit || benefit.deletedAt) continue;

        const workingDays = getWorkingDaysInMonth({
          year: referenceYear,
          month: referenceMonth,
          includeWeekends: benefit.includeWeekends,
          holidays: [],
        });

        const monthlyCost = Number(benefit.dailyCost) * workingDays;
        totalBenefits += monthlyCost;

        benefitDetails.push({
          benefitName: benefit.name,
          amount: monthlyCost,
        });
      }

      const employeeTotal = monthlySalary + riskAdditionAmount + totalBenefits;
      details.push({
        employeeId: employee.id,
        employeeName: employee.name,
        baseSalary: monthlySalary,
        riskAdditionAmount: riskAdditionAmount > 0 ? riskAdditionAmount : undefined,
        riskAdditionLabel: riskAdditionLabel || undefined,
        totalBenefits,
        totalAmount: employeeTotal,
        benefits: benefitDetails,
        status: 'created',
      });
    }

    return details;
  }

  private mapToResponse(account: any): AccountPayableResponseDto {
    return {
      id: account.id,
      description: account.description,
      amount: Number(account.amount),
      dueDate: account.dueDate,
      paymentDate: account.paymentDate,
      status: account.status,
      originType: account.originType,
      originId: account.originId,
      documentNumber: account.documentNumber,
      notes: account.notes,
      supplierId: account.supplierId ?? undefined,
      supplierName: account.supplier?.name ?? undefined,
      costCenterId: account.costCenterId ?? undefined,
      costCenterName: account.costCenter?.name ?? undefined,
      companyId: account.companyId,
      branchId: account.branchId,
      financialTransactionId: account.financialTransactionId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      createdBy: account.createdBy,
      deletedAt: account.deletedAt,
    };
  }
}
