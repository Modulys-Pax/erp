import api from '../axios';
import { TransactionOriginType } from './financial';
import { PaginatedResponse } from './branch';
import { AccountReceivableDetail } from './account-payable';

export enum AccountReceivableStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export interface AccountReceivable {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  receiptDate?: Date;
  status: AccountReceivableStatus;
  originType?: TransactionOriginType;
  originId?: string;
  documentNumber?: string;
  notes?: string;
  customerId?: string;
  customerName?: string;
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

export interface CreateAccountReceivableDto {
  description: string;
  amount: number;
  dueDate: string;
  originType?: TransactionOriginType;
  originId?: string;
  documentNumber?: string;
  notes?: string;
  customerId?: string;
  costCenterId?: string;
  companyId: string;
  branchId: string;
}

export interface UpdateAccountReceivableDto
  extends Partial<CreateAccountReceivableDto> {}

export interface ReceiveAccountReceivableDto {
  receiptDate?: string;
  notes?: string;
}

export interface AccountReceivableSummary {
  totalReceivablePending: number;
  totalReceivableReceived: number;
  totalReceivableCancelled: number;
  totalReceivable: number;
  countReceivablePending: number;
  countReceivableReceived: number;
  countReceivableCancelled: number;
}

export interface AccountReceivableSummaryResponse {
  summary: AccountReceivableSummary;
  accountsReceivable: PaginatedResponse<AccountReceivableDetail>;
}

export interface AccountReceivableByCustomerGroup {
  customerId: string | null;
  customerName: string;
  total: number;
  count: number;
  items: AccountReceivable[];
}

export interface ReportByCustomerResponse {
  groups: AccountReceivableByCustomerGroup[];
  totalAmount: number;
}

export const accountReceivableApi = {
  getAll: async (
    companyId?: string,
    branchId?: string,
    status?: AccountReceivableStatus,
    startDate?: string,
    endDate?: string,
  ): Promise<AccountReceivable[]> => {
    const response = await api.get<AccountReceivable[]>(
      '/accounts-receivable',
      {
        params: { companyId, branchId, status, startDate, endDate },
      },
    );
    return response.data;
  },

  getById: async (id: string): Promise<AccountReceivable> => {
    const response = await api.get<AccountReceivable>(
      `/accounts-receivable/${id}`,
    );
    return response.data;
  },

  create: async (
    data: CreateAccountReceivableDto,
  ): Promise<AccountReceivable> => {
    const response = await api.post<AccountReceivable>(
      '/accounts-receivable',
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateAccountReceivableDto,
  ): Promise<AccountReceivable> => {
    const response = await api.patch<AccountReceivable>(
      `/accounts-receivable/${id}`,
      data,
    );
    return response.data;
  },

  receive: async (
    id: string,
    data: ReceiveAccountReceivableDto,
  ): Promise<AccountReceivable> => {
    const response = await api.put<AccountReceivable>(
      `/accounts-receivable/${id}/receive`,
      data,
    );
    return response.data;
  },

  cancel: async (id: string): Promise<AccountReceivable> => {
    const response = await api.put<AccountReceivable>(
      `/accounts-receivable/${id}/cancel`,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/accounts-receivable/${id}`);
  },

  getSummary: async (
    branchId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
    page = 1,
    limit = 15,
  ): Promise<AccountReceivableSummaryResponse> => {
    const response = await api.get<AccountReceivableSummaryResponse>(
      '/accounts-receivable/summary',
      {
        params: { branchId, startDate, endDate, status, page, limit },
      },
    );
    return response.data;
  },

  getReportByCustomer: async (
    branchId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ReportByCustomerResponse> => {
    const response = await api.get<ReportByCustomerResponse>(
      '/accounts-receivable/report/by-customer',
      { params: { branchId, startDate, endDate } },
    );
    return response.data;
  },
};
