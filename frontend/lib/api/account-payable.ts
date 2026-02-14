import api from '../axios';
import { TransactionOriginType } from './financial';
import { PaginatedResponse } from './branch';

export enum AccountPayableStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export interface AccountPayable {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  paymentDate?: Date;
  status: AccountPayableStatus;
  originType?: TransactionOriginType;
  originId?: string;
  documentNumber?: string;
  notes?: string;
  /** Para contas de folha (HR): "Periculosidade" ou "Insalubridade (Mínimo/Médio/Máximo)" para exibir no lugar de "Adicional" */
  riskAdditionLabel?: string;
  supplierId?: string;
  supplierName?: string;
  costCenterId?: string;
  costCenterName?: string;
  companyId: string;
  branchId: string;
  financialTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  deletedAt?: Date;
}

export interface CreateAccountPayableDto {
  description: string;
  amount: number;
  dueDate: string;
  originType?: TransactionOriginType;
  originId?: string;
  documentNumber?: string;
  notes?: string;
  supplierId?: string;
  costCenterId?: string;
  companyId: string;
  branchId: string;
}

export interface UpdateAccountPayableDto
  extends Partial<CreateAccountPayableDto> {}

export interface PayAccountPayableDto {
  paymentDate?: string;
  notes?: string;
}

export interface AccountPayableDetail {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  paymentDate?: Date;
  status: AccountPayableStatus;
  documentNumber?: string;
  createdAt?: Date;
}

export interface AccountPayableBySupplierGroup {
  supplierId: string | null;
  supplierName: string;
  total: number;
  count: number;
  items: AccountPayable[];
}

export interface ReportBySupplierResponse {
  groups: AccountPayableBySupplierGroup[];
  totalAmount: number;
}

export interface AccountReceivableDetail {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  receiptDate?: Date;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  documentNumber?: string;
  createdAt?: Date;
}

export interface FinancialAccountsSummary {
  totalPayablePending: number;
  totalPayablePaid: number;
  totalPayableCancelled: number;
  totalPayable: number;
  countPayablePending: number;
  countPayablePaid: number;
  countPayableCancelled: number;
  totalReceivablePending: number;
  totalReceivableReceived: number;
  totalReceivableCancelled: number;
  totalReceivable: number;
  countReceivablePending: number;
  countReceivableReceived: number;
  countReceivableCancelled: number;
  netBalance: number;
}

export interface FinancialAccountsSummaryResponse {
  summary: FinancialAccountsSummary;
  accountsPayable: PaginatedResponse<AccountPayableDetail>;
  accountsReceivable: PaginatedResponse<AccountReceivableDetail>;
}

export interface AccountPayableSummary {
  totalPayablePending: number;
  totalPayablePaid: number;
  totalPayableCancelled: number;
  totalPayable: number;
  countPayablePending: number;
  countPayablePaid: number;
  countPayableCancelled: number;
}

export interface AccountPayableSummaryResponse {
  summary: AccountPayableSummary;
  accountsPayable: PaginatedResponse<AccountPayableDetail>;
}

// Payroll (Folha de Pagamento)
export interface ProcessPayrollDto {
  referenceMonth: number;
  referenceYear: number;
  dueDate: string;
  companyId: string;
  branchId: string;
}

export interface PayrollEmployeeBenefitDetail {
  benefitName: string;
  amount: number;
}

export interface PayrollEmployeeDetail {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  /** Valor do adicional de risco */
  riskAdditionAmount?: number;
  /** Nome para exibição: "Periculosidade" ou "Insalubridade (Mínimo/Médio/Máximo)" */
  riskAdditionLabel?: string;
  totalBenefits: number;
  totalAmount: number;
  benefits: PayrollEmployeeBenefitDetail[];
  status: 'created' | 'already_exists' | 'skipped_no_salary';
  accountPayableId?: string;
}

export interface ProcessPayrollResult {
  totalEmployees: number;
  created: number;
  alreadyExists: number;
  skippedNoSalary: number;
  totalAmount: number;
  details: PayrollEmployeeDetail[];
}

export const accountPayableApi = {
  getAll: async (
    companyId?: string,
    branchId?: string,
    status?: AccountPayableStatus,
    startDate?: string,
    endDate?: string,
  ): Promise<AccountPayable[]> => {
    const response = await api.get<AccountPayable[]>('/accounts-payable', {
      params: { companyId, branchId, status, startDate, endDate },
    });
    return response.data;
  },

  getById: async (id: string): Promise<AccountPayable> => {
    const response = await api.get<AccountPayable>(`/accounts-payable/${id}`);
    return response.data;
  },

  create: async (data: CreateAccountPayableDto): Promise<AccountPayable> => {
    const response = await api.post<AccountPayable>('/accounts-payable', data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateAccountPayableDto,
  ): Promise<AccountPayable> => {
    const response = await api.patch<AccountPayable>(
      `/accounts-payable/${id}`,
      data,
    );
    return response.data;
  },

  pay: async (
    id: string,
    data: PayAccountPayableDto,
  ): Promise<AccountPayable> => {
    const response = await api.put<AccountPayable>(
      `/accounts-payable/${id}/pay`,
      data,
    );
    return response.data;
  },

  cancel: async (id: string): Promise<AccountPayable> => {
    const response = await api.put<AccountPayable>(
      `/accounts-payable/${id}/cancel`,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/accounts-payable/${id}`);
  },

  getSummary: async (
    branchId?: string,
    startDate?: string,
    endDate?: string,
    payablePage = 1,
    receivablePage = 1,
    limit = 15,
    filterDateType?: 'dueDate' | 'createdAt',
  ): Promise<FinancialAccountsSummaryResponse> => {
    const response = await api.get<FinancialAccountsSummaryResponse>(
      '/accounts-payable/summary',
      {
        params: { branchId, startDate, endDate, payablePage, receivablePage, limit, filterDateType },
      },
    );
    return response.data;
  },

  getPayableSummary: async (
    branchId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 15,
    originType?: string,
  ): Promise<AccountPayableSummaryResponse> => {
    const response = await api.get<AccountPayableSummaryResponse>(
      '/accounts-payable/summary/payable',
      {
        params: { branchId, startDate, endDate, status, page, limit, originType },
      },
    );
    return response.data;
  },

  getReportBySupplier: async (
    branchId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ReportBySupplierResponse> => {
    const response = await api.get<ReportBySupplierResponse>(
      '/accounts-payable/report/by-supplier',
      { params: { branchId, startDate, endDate } },
    );
    return response.data;
  },

  // Payroll (Folha de Pagamento)
  processPayroll: async (data: ProcessPayrollDto): Promise<ProcessPayrollResult> => {
    const response = await api.post<ProcessPayrollResult>(
      '/accounts-payable/payroll/process',
      data,
    );
    return response.data;
  },

  getPayrollPreview: async (
    referenceMonth: number,
    referenceYear: number,
    branchId: string,
  ): Promise<PayrollEmployeeDetail[]> => {
    const response = await api.get<PayrollEmployeeDetail[]>(
      '/accounts-payable/payroll/preview',
      {
        params: { referenceMonth, referenceYear, branchId },
      },
    );
    return response.data;
  },
};
