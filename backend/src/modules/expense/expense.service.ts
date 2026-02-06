import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreateExpenseDto,
    userId?: string,
    user?: any,
  ): Promise<ExpenseResponseDto> {
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

    // Verificar se funcionário existe (se informado)
    if (createDto.employeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: createDto.employeeId,
          companyId: companyId,
          branchId: createDto.branchId,
          deletedAt: null,
          active: true,
        },
      });

      if (!employee) {
        throw new NotFoundException('Funcionário não encontrado');
      }
    }

    // Criar despesa e transação financeira em uma transação
    const result = await this.prisma.$transaction(async (tx) => {
      // Criar despesa
      const expense = await tx.expense.create({
        data: {
          employeeId: createDto.employeeId,
          type: createDto.type,
          amount: createDto.amount,
          description: createDto.description,
          expenseDate: new Date(createDto.expenseDate),
          documentNumber: createDto.documentNumber,
          costCenterId: createDto.costCenterId ?? undefined,
          companyId: companyId,
          branchId: createDto.branchId,
          createdBy: userId,
        },
        include: {
          employee: {
            select: {
              name: true,
            },
          },
        },
      });

      // Criar transação financeira automaticamente
      const financialTransaction = await tx.financialTransaction.create({
        data: {
          type: 'EXPENSE',
          amount: createDto.amount,
          description: createDto.description,
          transactionDate: new Date(createDto.expenseDate),
          originType: 'HR',
          originId: expense.id,
          documentNumber: createDto.documentNumber,
          notes: `Despesa ${createDto.type}${createDto.employeeId ? ` - Funcionário: ${expense.employee?.name}` : ''}`,
          costCenterId: createDto.costCenterId ?? undefined,
          companyId: companyId,
          branchId: createDto.branchId,
          createdBy: userId,
        },
      });

      // Atualizar despesa com o ID da transação financeira
      const updatedExpense = await tx.expense.update({
        where: { id: expense.id },
        data: {
          financialTransactionId: financialTransaction.id,
        },
        include: {
          employee: {
            select: {
              name: true,
            },
          },
        },
      });

      return updatedExpense;
    });

    return this.mapToResponse(result);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
    employeeId?: string,
    type?: string,
    startDate?: string,
    endDate?: string,
    includeDeleted = false,
  ): Promise<ExpenseResponseDto[]> {
    const where: Prisma.ExpenseWhereInput = includeDeleted ? {} : { deletedAt: null };

    if (companyId) {
      where.companyId = companyId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (type) {
      where.type = type as any;
    }

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.expenseDate.lte = new Date(endDate);
      }
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { expenseDate: 'desc' },
    });

    return expenses.map((expense) => this.mapToResponse(expense));
  }

  async findOne(id: string, user?: any): Promise<ExpenseResponseDto> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
        financialTransaction: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, expense.branchId);
    }

    return this.mapToResponse(expense);
  }

  async update(id: string, updateDto: UpdateExpenseDto, user?: any): Promise<ExpenseResponseDto> {
    const existingExpense = await this.prisma.expense.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingExpense) {
      throw new NotFoundException('Despesa não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, updateDto.branchId, existingExpense.branchId);
    }

    // Não permitir editar despesa que já tem transação financeira
    if (existingExpense.financialTransactionId) {
      throw new BadRequestException(
        'Não é possível editar despesa que já foi processada financeiramente',
      );
    }

    // Validar funcionário se informado
    if (updateDto.employeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: updateDto.employeeId,
          companyId: existingExpense.companyId,
          branchId: existingExpense.branchId,
          deletedAt: null,
          active: true,
        },
      });

      if (!employee) {
        throw new NotFoundException('Funcionário não encontrado');
      }
    }

    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(updateDto.employeeId !== undefined && {
          employeeId: updateDto.employeeId,
        }),
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.amount !== undefined && { amount: updateDto.amount }),
        ...(updateDto.description !== undefined && {
          description: updateDto.description,
        }),
        ...(updateDto.expenseDate && {
          expenseDate: new Date(updateDto.expenseDate),
        }),
        ...(updateDto.documentNumber !== undefined && {
          documentNumber: updateDto.documentNumber,
        }),
        ...(updateDto.costCenterId !== undefined && {
          costCenterId: updateDto.costCenterId ?? null,
        }),
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
      },
    });

    return this.mapToResponse(expense);
  }

  async remove(id: string, user?: any): Promise<void> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, expense.branchId);
    }

    // Não permitir excluir despesa que já tem transação financeira
    if (expense.financialTransactionId) {
      throw new BadRequestException(
        'Não é possível excluir despesa que já foi processada financeiramente',
      );
    }

    // Soft delete
    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private mapToResponse(expense: any): ExpenseResponseDto {
    return {
      id: expense.id,
      employeeId: expense.employeeId,
      employeeName: expense.employee?.name,
      type: expense.type,
      amount: Number(expense.amount),
      description: expense.description,
      expenseDate: expense.expenseDate,
      documentNumber: expense.documentNumber,
      costCenterId: expense.costCenterId ?? undefined,
      companyId: expense.companyId,
      branchId: expense.branchId,
      financialTransactionId: expense.financialTransactionId,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      createdBy: expense.createdBy,
      deletedAt: expense.deletedAt,
    };
  }
}
