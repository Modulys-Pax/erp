import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/update-account-receivable.dto';
import { ReceiveAccountReceivableDto } from './dto/receive-account-receivable.dto';
import { AccountReceivableResponseDto } from './dto/account-receivable-response.dto';
import {
  AccountReceivableSummaryResponseDto,
  AccountReceivableSummaryDto,
} from './dto/account-receivable-summary-response.dto';
import { AccountReceivableDetailDto } from '../account-payable/dto/financial-accounts-summary-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import {
  ReportByCustomerResponseDto,
  AccountReceivableByCustomerGroupDto,
} from './dto/report-by-customer-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class AccountReceivableService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
  ) {}

  async create(
    createDto: CreateAccountReceivableDto,
    userId?: string,
    user?: any,
  ): Promise<AccountReceivableResponseDto> {
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

    const accountReceivable = await this.prisma.accountReceivable.create({
      data: {
        description: createDto.description,
        amount: createDto.amount,
        dueDate: new Date(createDto.dueDate),
        originType: createDto.originType,
        originId: createDto.originId,
        documentNumber: createDto.documentNumber,
        notes: createDto.notes,
        customerId: createDto.customerId ?? undefined,
        costCenterId: createDto.costCenterId ?? undefined,
        companyId: companyId,
        branchId: createDto.branchId,
        status: 'PENDING',
        createdBy: userId,
      },
    });

    return this.mapToResponse(accountReceivable);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AccountReceivableResponseDto[]> {
    const where: Prisma.AccountReceivableWhereInput = {
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

    const accountsReceivable = await this.prisma.accountReceivable.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: { customer: true, costCenter: true },
    });

    return accountsReceivable.map((account) => this.mapToResponse(account));
  }

  async findOne(id: string, user?: any): Promise<AccountReceivableResponseDto> {
    const accountReceivable = await this.prisma.accountReceivable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        financialTransaction: true,
        customer: true,
        costCenter: true,
      },
    });

    if (!accountReceivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, accountReceivable.branchId);
    }

    return this.mapToResponse(accountReceivable);
  }

  async update(
    id: string,
    updateDto: UpdateAccountReceivableDto,
    user?: any,
  ): Promise<AccountReceivableResponseDto> {
    const existingAccount = await this.prisma.accountReceivable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingAccount) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, updateDto.branchId, existingAccount.branchId);
    }

    if (existingAccount.status === 'RECEIVED') {
      throw new BadRequestException('Não é possível editar conta a receber já recebida');
    }

    const accountReceivable = await this.prisma.accountReceivable.update({
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
        ...(updateDto.customerId !== undefined && { customerId: updateDto.customerId ?? null }),
        ...(updateDto.costCenterId !== undefined && { costCenterId: updateDto.costCenterId ?? null }),
      },
    });

    return this.mapToResponse(accountReceivable);
  }

  async receive(
    id: string,
    receiveDto: ReceiveAccountReceivableDto,
    userId?: string,
  ): Promise<AccountReceivableResponseDto> {
    const accountReceivable = await this.prisma.accountReceivable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {},
    });

    if (!accountReceivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    if (accountReceivable.status === 'RECEIVED') {
      throw new BadRequestException('Conta a receber já foi recebida');
    }

    if (accountReceivable.status === 'CANCELLED') {
      throw new BadRequestException('Conta a receber está cancelada');
    }

    const receiptDate = receiveDto.receiptDate ? new Date(receiveDto.receiptDate) : new Date();

    // Criar transação financeira e atualizar conta a receber em uma transação
    const result = await this.prisma.$transaction(async (tx) => {
      // Criar transação financeira
      const financialTransaction = await tx.financialTransaction.create({
        data: {
          type: 'INCOME',
          amount: accountReceivable.amount,
          description: accountReceivable.description,
          transactionDate: receiptDate,
          originType: accountReceivable.originType,
          originId: accountReceivable.originId,
          documentNumber: accountReceivable.documentNumber,
          notes: receiveDto.notes || accountReceivable.notes,
          costCenterId: accountReceivable.costCenterId ?? undefined,
          companyId: accountReceivable.companyId,
          branchId: accountReceivable.branchId,
          createdBy: userId,
        },
      });

      // Atualizar conta a receber
      const updatedAccount = await tx.accountReceivable.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receiptDate,
          financialTransactionId: financialTransaction.id,
        },
        include: {
          financialTransaction: true,
        },
      });

      return updatedAccount;
    });

    // Atualizar saldo da filial (aumentar)
    const amount = Number(accountReceivable.amount);
    await this.walletService.updateBalance(accountReceivable.branchId, amount, true);

    return this.mapToResponse(result);
  }

  async cancel(id: string): Promise<AccountReceivableResponseDto> {
    const accountReceivable = await this.prisma.accountReceivable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!accountReceivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    if (accountReceivable.status === 'RECEIVED') {
      throw new BadRequestException('Não é possível cancelar conta a receber já recebida');
    }

    if (accountReceivable.status === 'CANCELLED') {
      throw new BadRequestException('Conta a receber já está cancelada');
    }

    const updatedAccount = await this.prisma.accountReceivable.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    return this.mapToResponse(updatedAccount);
  }

  /**
   * Relatório de contas a receber agrupadas por cliente (período/filial).
   */
  async getReportByCustomer(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    user?: any,
  ): Promise<ReportByCustomerResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;
    let effectiveBranchId = branchId;
    if (user) {
      const isAdmin = user.role?.toLowerCase() === 'admin';
      if (!isAdmin && !branchId) effectiveBranchId = user.branchId;
      if (effectiveBranchId) {
        validateBranchAccess(user.branchId, user.role, effectiveBranchId, undefined);
      }
    }

    const where: Prisma.AccountReceivableWhereInput = {
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

    const accounts = await this.prisma.accountReceivable.findMany({
      where,
      orderBy: [{ customerId: 'asc' }, { dueDate: 'asc' }],
      include: { customer: true, costCenter: true },
    });

    const map = new Map<string | null, AccountReceivableResponseDto[]>();
    for (const acc of accounts) {
      const key = acc.customerId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(this.mapToResponse(acc));
    }

    const groups: AccountReceivableByCustomerGroupDto[] = [];
    let totalAmount = 0;
    for (const [customerId, items] of map) {
      const total = items.reduce((s, i) => s + i.amount, 0);
      totalAmount += total;
      groups.push({
        customerId,
        customerName: items[0]?.customerName ?? 'Sem cliente',
        total,
        count: items.length,
        items,
      });
    }
    groups.sort((a, b) => b.total - a.total);

    return { groups, totalAmount };
  }

  async remove(id: string, user?: any): Promise<void> {
    const accountReceivable = await this.prisma.accountReceivable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!accountReceivable) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, accountReceivable.branchId);
    }

    if (accountReceivable.status === 'RECEIVED') {
      throw new BadRequestException('Não é possível excluir conta a receber já recebida');
    }

    await this.prisma.accountReceivable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Obtém resumo de contas a receber
   */
  async getAccountReceivableSummary(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    page = 1,
    limit = 15,
    user?: any,
  ): Promise<AccountReceivableSummaryResponseDto> {
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

    // Filtro base para contas a receber (sem status, para calcular totais)
    const baseReceivableWhere: Prisma.AccountReceivableWhereInput = {
      companyId,
      deletedAt: null,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
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
      baseReceivableWhere.dueDate = dateFilter;
    }

    // Filtro para lista paginada (inclui status se fornecido)
    const receivableWhere: Prisma.AccountReceivableWhereInput = {
      ...baseReceivableWhere,
      ...(status ? { status: status as any } : {}),
    };

    // Calcular totais de contas a receber por status (sem filtro de status)
    const [receivablePending, receivableReceived, receivableCancelled] = await Promise.all([
      this.prisma.accountReceivable.aggregate({
        where: { ...baseReceivableWhere, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.accountReceivable.aggregate({
        where: { ...baseReceivableWhere, status: 'RECEIVED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.accountReceivable.aggregate({
        where: { ...baseReceivableWhere, status: 'CANCELLED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Buscar contas a receber com paginação (com filtro de status se fornecido)
    const accountsReceivable = await this.prisma.accountReceivable.findMany({
      where: receivableWhere,
      skip,
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
      },
    });

    // Contar total para paginação (com filtro de status se fornecido)
    const totalReceivableCount = await this.prisma.accountReceivable.count({
      where: receivableWhere,
    });

    // Calcular totais
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

    const summary: AccountReceivableSummaryDto = {
      totalReceivablePending,
      totalReceivableReceived,
      totalReceivableCancelled,
      totalReceivable,
      countReceivablePending: receivablePending._count,
      countReceivableReceived: receivableReceived._count,
      countReceivableCancelled: receivableCancelled._count,
    };

    return {
      summary,
      accountsReceivable: {
        data: accountsReceivable.map((account) => ({
          id: account.id,
          description: account.description,
          amount: Number(account.amount),
          dueDate: account.dueDate,
          receiptDate: account.receiptDate || undefined,
          status: account.status,
          documentNumber: account.documentNumber || undefined,
        })),
        total: totalReceivableCount,
        page,
        limit,
        totalPages: Math.ceil(totalReceivableCount / limit),
      },
    };
  }

  private mapToResponse(account: any): AccountReceivableResponseDto {
    return {
      id: account.id,
      description: account.description,
      amount: Number(account.amount),
      dueDate: account.dueDate,
      receiptDate: account.receiptDate,
      status: account.status,
      originType: account.originType,
      originId: account.originId,
      documentNumber: account.documentNumber,
      notes: account.notes,
      customerId: account.customerId ?? undefined,
      customerName: account.customer?.name ?? undefined,
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
