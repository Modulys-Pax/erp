import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import {
  EmployeeCostsResponseDto,
  EmployeeCostDetailDto,
  EmployeeCostsSummaryDto,
} from './dto/employee-costs-response.dto';
import { EmployeeDetailCostsResponseDto } from './dto/employee-detail-costs-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';
import { getCurrentMonthWorkingDays } from '../../shared/utils/working-days.util';
import {
  calculateEmployeeINSS,
  calculateEmployerINSS,
  calculateFGTS,
  getEmployeeINSSBracketRate,
  INSS_MAX_CONTRIBUTION_2025,
  INSS_MAX_SALARY_2025,
} from '../../shared/utils/tax-calculator';
import { calculateRiskAdditionAmount, getRiskAdditionDisplayName } from '../../shared/constants/risk-addition.constants';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async create(
    createEmployeeDto: CreateEmployeeDto,
    userId?: string,
    user?: any,
  ): Promise<EmployeeResponseDto> {
    // Usar DEFAULT_COMPANY_ID (single-tenant)
    const companyId = DEFAULT_COMPANY_ID;

    // Validar acesso por filial (não-admin só cria na própria filial)
    // O interceptor já força o branchId no body, mas validamos aqui também por segurança
    if (user) {
      validateBranchAccess(user.branchId, user.role, createEmployeeDto.branchId, undefined);
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
        id: createEmployeeDto.branchId,
        companyId: companyId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    const { riskAdditionType, insalubrityDegree, ...rest } = createEmployeeDto;
    const normalizedRisk = this.normalizeRiskAddition(riskAdditionType, insalubrityDegree);

    const employee = await this.prisma.employee.create({
      data: {
        ...rest,
        companyId: companyId,
        hireDate: createEmployeeDto.hireDate ? new Date(createEmployeeDto.hireDate) : undefined,
        createdBy: userId,
        ...normalizedRisk,
      },
    });

    return this.mapToResponse(employee);
  }

  async findAll(
    branchId?: string,
    includeDeleted = false,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    const skip = (page - 1) * limit;
    const companyId = DEFAULT_COMPANY_ID;

    const where: Prisma.EmployeeWhereInput = {
      companyId,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(branchId ? { branchId } : {}),
    };

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees.map((employee) => this.mapToResponse(employee)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user?: any): Promise<EmployeeResponseDto> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, employee.branchId);
    }

    return this.mapToResponse(employee);
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    user?: any,
  ): Promise<EmployeeResponseDto> {
    const existingEmployee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingEmployee) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(
        user.branchId,
        user.role,
        updateEmployeeDto.branchId,
        existingEmployee.branchId,
      );
    }

    if (updateEmployeeDto.companyId || updateEmployeeDto.branchId) {
      const companyId = updateEmployeeDto.companyId || existingEmployee.companyId;
      const branchId = updateEmployeeDto.branchId || existingEmployee.branchId;

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
          id: branchId,
          companyId,
          deletedAt: null,
        },
      });

      if (!branch) {
        throw new NotFoundException('Filial não encontrada');
      }
    }

    const { riskAdditionType, insalubrityDegree, hireDate, ...rest } = updateEmployeeDto;
    const updateData: any = { ...rest };
    if (hireDate) {
      updateData.hireDate = new Date(hireDate);
    }
    Object.assign(updateData, this.normalizeRiskAddition(riskAdditionType, insalubrityDegree));

    const employee = await this.prisma.employee.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponse(employee);
  }

  async remove(id: string, user?: any): Promise<void> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, employee.branchId);
    }

    await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Calcula o custo total mensal de um funcionário (salário + adicional de risco + benefícios + impostos).
   * INSS e FGTS incidem sobre a remuneração total (salário + adicional).
   */
  private async calculateEmployeeMonthlyCost(
    employee: any,
    branchId: string,
  ): Promise<{
    monthlySalary: number;
    riskAddition: number;
    totalBenefits: number;
    totalTaxes: number;
    totalMonthlyCost: number;
  }> {
    const monthlySalary = employee.monthlySalary ? Number(employee.monthlySalary) : 0;
    const riskAddition = calculateRiskAdditionAmount(
      employee.riskAdditionType,
      employee.insalubrityDegree,
      monthlySalary,
    );
    const grossSalary = monthlySalary + riskAddition;

    // Buscar benefícios ativos do funcionário com dados do benefício
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

    // Calcular custo total dos benefícios baseado em dias úteis
    let totalBenefits = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (const employeeBenefit of employeeBenefits) {
      const benefit = employeeBenefit.benefit;
      if (!benefit || benefit.deletedAt) continue;

      // Calcular dias úteis do mês atual
      const workingDays = getCurrentMonthWorkingDays(
        benefit.includeWeekends,
        [], // TODO: Adicionar lista de feriados quando houver
      );

      // Custo mensal = custo diário * dias úteis
      const monthlyCost = Number(benefit.dailyCost) * workingDays;
      totalBenefits += monthlyCost;
    }

    // Impostos sobre a remuneração total (salário + adicional de risco)
    const inssPatronal = calculateEmployerINSS(grossSalary);
    const fgts = calculateFGTS(grossSalary);
    const totalTaxes = inssPatronal + fgts;

    const totalMonthlyCost = grossSalary + totalBenefits + totalTaxes;

    return {
      monthlySalary,
      riskAddition,
      totalBenefits,
      totalTaxes,
      totalMonthlyCost,
    };
  }

  /**
   * Obtém dashboard de custos com funcionários
   */
  async getEmployeeCosts(
    branchId?: string,
    page = 1,
    limit = 15,
  ): Promise<EmployeeCostsResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {
      companyId,
      deletedAt: null,
      active: true,
      ...(branchId ? { branchId } : {}),
    };

    // Buscar total de funcionários para cálculo do summary
    const totalEmployees = await this.prisma.employee.count({ where });

    // Buscar funcionários com paginação
    const employees = await this.prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    });

    // Calcular custos apenas dos funcionários da página atual
    const employeeCosts: EmployeeCostDetailDto[] = [];
    let pageMonthlySalaries = 0;
    let pageMonthlyBenefits = 0;
    let pageMonthlyTaxes = 0;

    for (const employee of employees) {
      const costs = await this.calculateEmployeeMonthlyCost(employee, employee.branchId);

      pageMonthlySalaries += costs.monthlySalary + costs.riskAddition;
      pageMonthlyBenefits += costs.totalBenefits;
      pageMonthlyTaxes += costs.totalTaxes;

      const riskAdditionLabel = getRiskAdditionDisplayName(employee.riskAdditionType, employee.insalubrityDegree);
      employeeCosts.push({
        employeeId: employee.id,
        employeeName: employee.name,
        position: employee.position || undefined,
        department: employee.department || undefined,
        monthlySalary: costs.monthlySalary,
        riskAdditionAmount: costs.riskAddition > 0 ? costs.riskAddition : undefined,
        riskAdditionLabel: riskAdditionLabel || undefined,
        totalBenefits: costs.totalBenefits,
        totalTaxes: costs.totalTaxes,
        totalMonthlyCost: costs.totalMonthlyCost,
        totalAnnualCost: costs.totalMonthlyCost * 12,
      });
    }

    // Calcular totais de TODOS os funcionários para o summary (incluindo adicionais de risco)
    const allEmployeesForSummary = await this.prisma.employee.findMany({
      where,
      select: { id: true, branchId: true, monthlySalary: true, riskAdditionType: true, insalubrityDegree: true },
    });

    let totalMonthlySalaries = 0;
    let totalMonthlyTaxes = 0;
    for (const emp of allEmployeesForSummary) {
      const baseSalary = emp.monthlySalary ? Number(emp.monthlySalary) : 0;
      const riskAdd = calculateRiskAdditionAmount(emp.riskAdditionType, emp.insalubrityDegree, baseSalary);
      totalMonthlySalaries += baseSalary + riskAdd;
      const gross = baseSalary + riskAdd;
      totalMonthlyTaxes += calculateEmployerINSS(gross) + calculateFGTS(gross);
    }

    // Buscar IDs dos funcionários para buscar benefícios
    const allEmployeeIds = await this.prisma.employee.findMany({
      where,
      select: { id: true, branchId: true },
    });

    // Buscar todos os benefícios ativos dos funcionários com dados do benefício
    const allEmployeeBenefits = await this.prisma.employeeBenefit.findMany({
      where: {
        employeeId: { in: allEmployeeIds.map((e) => e.id) },
        active: true,
        deletedAt: null,
      },
      include: {
        benefit: true,
      },
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let totalMonthlyBenefits = 0;

    for (const employeeBenefit of allEmployeeBenefits) {
      const benefit = employeeBenefit.benefit;
      if (!benefit || benefit.deletedAt) continue;

      const workingDays = getCurrentMonthWorkingDays(
        benefit.includeWeekends,
        [], // TODO: Adicionar lista de feriados quando houver
      );

      const monthlyCost = Number(benefit.dailyCost) * workingDays;
      totalMonthlyBenefits += monthlyCost;
    }

    const totalMonthlyCost = totalMonthlySalaries + totalMonthlyBenefits + totalMonthlyTaxes;

    const summary: EmployeeCostsSummaryDto = {
      totalEmployees,
      totalMonthlySalaries,
      totalMonthlyBenefits,
      totalMonthlyTaxes,
      totalMonthlyCost,
      totalAnnualCost: totalMonthlyCost * 12,
    };

    return {
      summary,
      employees: {
        data: employeeCosts,
        total: totalEmployees,
        page,
        limit,
        totalPages: Math.ceil(totalEmployees / limit),
      },
    };
  }

  /**
   * Obtém detalhes de custos de um funcionário específico
   */
  async getEmployeeDetailCosts(id: string): Promise<EmployeeDetailCostsResponseDto> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    const monthlySalary = employee.monthlySalary ? Number(employee.monthlySalary) : 0;
    const riskAdditionAmount = calculateRiskAdditionAmount(
      employee.riskAdditionType,
      employee.insalubrityDegree,
      monthlySalary,
    );
    const grossSalary = monthlySalary + riskAdditionAmount;

    // Buscar benefícios ativos do funcionário com dados do benefício
    const employeeBenefits = await this.prisma.employeeBenefit.findMany({
      where: {
        employeeId: id,
        active: true,
        deletedAt: null,
      },
      include: {
        benefit: true,
      },
    });

    // Calcular custos baseado em dias úteis
    const benefits = employeeBenefits
      .map((employeeBenefit: any) => {
        const benefit = employeeBenefit.benefit;
        if (!benefit || benefit.deletedAt) return null;

        const benefitWorkingDays = getCurrentMonthWorkingDays(
          benefit.includeWeekends,
          [], // TODO: Adicionar feriados
        );

        const monthlyCost = Number(benefit.dailyCost) * benefitWorkingDays;

        return {
          id: employeeBenefit.id,
          benefitId: benefit.id,
          benefit: {
            id: benefit.id,
            name: benefit.name,
            dailyCost: Number(benefit.dailyCost),
            employeeValue: Number(benefit.employeeValue),
            includeWeekends: benefit.includeWeekends,
            description: benefit.description,
          },
          monthlyCost,
          active: employeeBenefit.active,
        };
      })
      .filter((b) => b !== null) as any[];

    const totalBenefits = benefits.reduce((sum, b) => sum + (b?.monthlyCost || 0), 0);

    // Impostos sobre a remuneração total (salário + adicional de risco)
    const inssPatronal = calculateEmployerINSS(grossSalary);
    const fgts = calculateFGTS(grossSalary);

    const taxes = [
      {
        type: 'INSS',
        name: 'INSS Patronal',
        rate: 20.0,
        amount: inssPatronal,
      },
      {
        type: 'FGTS',
        name: 'FGTS',
        rate: 8.0,
        amount: fgts,
      },
    ];

    const totalTaxes = inssPatronal + fgts;

    // INSS do funcionário (descontado do salário) - base de cálculo inclui adicional
    const employeeINSS = calculateEmployeeINSS(grossSalary);
    const employeeINSSRate = grossSalary > 0 ? (employeeINSS / grossSalary) * 100 : 0;
    const employeeINSSBracketRate = getEmployeeINSSBracketRate(grossSalary);

    const totalMonthlyCost = grossSalary + totalBenefits + totalTaxes;

    const riskAdditionLabel = getRiskAdditionDisplayName(employee.riskAdditionType, employee.insalubrityDegree);
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      position: employee.position || undefined,
      department: employee.department || undefined,
      monthlySalary,
      riskAdditionAmount: riskAdditionAmount > 0 ? riskAdditionAmount : undefined,
      riskAdditionLabel: riskAdditionLabel || undefined,
      benefits,
      totalBenefits,
      taxes,
      totalTaxes,
      employeeINSS,
      employeeINSSRate: Math.round(employeeINSSRate * 100) / 100,
      employeeINSSBracketRate,
      netSalary: grossSalary - employeeINSS,
      totalMonthlyCost,
      totalAnnualCost: totalMonthlyCost * 12,
    };
  }

  /**
   * Normaliza dados de adicional de risco: apenas um tipo (não acumulam).
   * Se periculosidade, grau de insalubridade é ignorado; se nenhum, ambos null.
   */
  private normalizeRiskAddition(
    riskAdditionType?: 'INSALUBRIDADE' | 'PERICULOSIDADE',
    insalubrityDegree?: 'MINIMO' | 'MEDIO' | 'MAXIMO',
  ): { riskAdditionType: string | null; insalubrityDegree: string | null } {
    if (!riskAdditionType) {
      return { riskAdditionType: null, insalubrityDegree: null };
    }
    if (riskAdditionType === 'PERICULOSIDADE') {
      return { riskAdditionType: 'PERICULOSIDADE', insalubrityDegree: null };
    }
    return {
      riskAdditionType: 'INSALUBRIDADE',
      insalubrityDegree: insalubrityDegree ?? null,
    };
  }

  private mapToResponse(employee: any): EmployeeResponseDto {
    return {
      id: employee.id,
      name: employee.name,
      cpf: employee.cpf,
      email: employee.email,
      phone: employee.phone,
      position: employee.position,
      department: employee.department,
      hireDate: employee.hireDate,
      monthlySalary: employee.monthlySalary ? Number(employee.monthlySalary) : undefined,
      companyId: employee.companyId,
      branchId: employee.branchId,
      active: employee.active,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
      createdBy: employee.createdBy,
      deletedAt: employee.deletedAt,
      riskAdditionType: employee.riskAdditionType ?? undefined,
      insalubrityDegree: employee.insalubrityDegree ?? undefined,
    };
  }
}
