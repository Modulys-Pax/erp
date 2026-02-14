import api from '../axios';
import { PaginatedResponse } from './branch';

export interface Employee {
  id: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hireDate?: Date;
  monthlySalary?: number;
  companyId: string;
  branchId: string;
  active: boolean;
  /** Tipo de adicional de risco: apenas um (não acumulam) */
  riskAdditionType?: 'INSALUBRIDADE' | 'PERICULOSIDADE';
  /** Grau de insalubridade quando riskAdditionType = INSALUBRIDADE */
  insalubrityDegree?: 'MINIMO' | 'MEDIO' | 'MAXIMO';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  deletedAt?: Date;
}

export interface CreateEmployeeDto {
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  monthlySalary?: number;
  companyId: string;
  branchId: string;
  active?: boolean;
  riskAdditionType?: 'INSALUBRIDADE' | 'PERICULOSIDADE';
  insalubrityDegree?: 'MINIMO' | 'MEDIO' | 'MAXIMO';
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {}

export interface EmployeeBenefit {
  id: string;
  employeeId: string;
  type: 'TRANSPORT_VOUCHER' | 'MEAL_VOUCHER' | 'HEALTH_INSURANCE' | 'DENTAL_INSURANCE' | 'LIFE_INSURANCE' | 'OTHER';
  name: string;
  monthlyCost: number;
  description?: string;
  active: boolean;
  startDate?: Date;
  companyId: string;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  deletedAt?: Date;
}

export interface EmployeeCostDetail {
  employeeId: string;
  employeeName: string;
  position?: string;
  department?: string;
  monthlySalary: number;
  /** Valor do adicional de risco */
  riskAdditionAmount?: number;
  /** Nome para exibição: "Periculosidade" ou "Insalubridade (Mínimo/Médio/Máximo)" */
  riskAdditionLabel?: string;
  totalBenefits: number;
  totalTaxes: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
}

export interface EmployeeCostsSummary {
  totalEmployees: number;
  totalMonthlySalaries: number;
  totalMonthlyBenefits: number;
  totalMonthlyTaxes: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
}

export interface EmployeeCostsResponse {
  summary: EmployeeCostsSummary;
  employees: PaginatedResponse<EmployeeCostDetail>;
}

export interface EmployeeBenefitCost {
  id: string;
  benefitId: string;
  benefit: {
    id: string;
    name: string;
    dailyCost: number;
    employeeValue: number;
    includeWeekends: boolean;
    description?: string;
  };
  monthlyCost: number; // Calculado baseado em dias úteis
  active: boolean;
}

export interface EmployeeTaxCost {
  type: string;
  name: string;
  rate: number;
  amount: number;
}

export interface EmployeeDetailCostsResponse {
  employeeId: string;
  employeeName: string;
  position?: string;
  department?: string;
  monthlySalary: number;
  /** Valor do adicional de risco */
  riskAdditionAmount?: number;
  /** Nome para exibição: "Periculosidade" ou "Insalubridade (Mínimo/Médio/Máximo)" */
  riskAdditionLabel?: string;
  benefits: EmployeeBenefitCost[];
  totalBenefits: number;
  taxes: EmployeeTaxCost[];
  totalTaxes: number;
  employeeINSS?: number;
  employeeINSSRate?: number;
  employeeINSSBracketRate?: number;
  netSalary?: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
}

export interface CreateEmployeeBenefitDto {
  employeeId: string;
  benefitId: string;
  active?: boolean;
  startDate?: string;
  companyId: string;
  branchId: string;
}

export interface UpdateEmployeeBenefitDto extends Partial<CreateEmployeeBenefitDto> {}

export const employeeApi = {
  getAll: async (
    branchId?: string,
    includeDeleted?: boolean,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponse<Employee>> => {
    const response = await api.get<PaginatedResponse<Employee>>('/employees', {
      params: { branchId, includeDeleted, page, limit },
    });
    return response.data;
  },

  getById: async (id: string): Promise<Employee> => {
    const response = await api.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  create: async (data: CreateEmployeeDto): Promise<Employee> => {
    const response = await api.post<Employee>('/employees', data);
    return response.data;
  },

  update: async (id: string, data: UpdateEmployeeDto): Promise<Employee> => {
    const response = await api.patch<Employee>(`/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },

  getCosts: async (
    branchId?: string,
    page = 1,
    limit = 15,
  ): Promise<EmployeeCostsResponse> => {
    const response = await api.get<EmployeeCostsResponse>('/employees/costs/summary', {
      params: { branchId, page, limit },
    });
    return response.data;
  },

  getDetailCosts: async (id: string): Promise<EmployeeDetailCostsResponse> => {
    const response = await api.get<EmployeeDetailCostsResponse>(`/employees/${id}/costs`);
    return response.data;
  },

  // Benefícios
  getBenefits: async (
    employeeId?: string,
    branchId?: string,
    active?: boolean,
  ): Promise<EmployeeBenefit[]> => {
    const response = await api.get<EmployeeBenefit[]>('/employees/benefits', {
      params: { employeeId, branchId, active },
    });
    return response.data;
  },

  getBenefitById: async (id: string): Promise<EmployeeBenefit> => {
    const response = await api.get<EmployeeBenefit>(`/employees/benefits/${id}`);
    return response.data;
  },

  createBenefit: async (data: CreateEmployeeBenefitDto): Promise<EmployeeBenefit> => {
    const response = await api.post<EmployeeBenefit>('/employees/benefits', data);
    return response.data;
  },

  updateBenefit: async (
    id: string,
    data: UpdateEmployeeBenefitDto,
  ): Promise<EmployeeBenefit> => {
    const response = await api.patch<EmployeeBenefit>(`/employees/benefits/${id}`, data);
    return response.data;
  },

  deleteBenefit: async (id: string): Promise<void> => {
    await api.delete(`/employees/benefits/${id}`);
  },
};
