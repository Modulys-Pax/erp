import api from '../axios';

export type BankStatementItemType = 'CREDIT' | 'DEBIT';

export interface BankStatementItem {
  id: string;
  bankStatementId: string;
  transactionDate: string;
  amount: number;
  description?: string;
  type: BankStatementItemType;
  financialTransactionId?: string;
  reconciled: boolean;
  financialTransactionDescription?: string;
  createdAt: string;
}

export interface BankStatement {
  id: string;
  branchId: string;
  description?: string;
  referenceMonth: number;
  referenceYear: number;
  uploadedAt?: string;
  createdAt: string;
  createdBy?: string;
  itemCount: number;
  reconciledCount: number;
}

export interface CreateBankStatementDto {
  branchId: string;
  description?: string;
  referenceMonth: number;
  referenceYear: number;
}

export interface CreateBankStatementItemDto {
  transactionDate: string;
  amount: number;
  description?: string;
  type: BankStatementItemType;
}

export const bankReconciliationApi = {
  createStatement: async (
    dto: CreateBankStatementDto,
  ): Promise<BankStatement> => {
    const response = await api.post<BankStatement>('/bank-statements', dto);
    return response.data;
  },

  getStatements: async (
    branchId?: string,
    referenceMonth?: number,
    referenceYear?: number,
  ): Promise<BankStatement[]> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (referenceMonth != null) params.append('referenceMonth', referenceMonth.toString());
    if (referenceYear != null) params.append('referenceYear', referenceYear.toString());
    const response = await api.get<BankStatement[]>(`/bank-statements?${params.toString()}`);
    return response.data;
  },

  getStatement: async (id: string): Promise<BankStatement> => {
    const response = await api.get<BankStatement>(`/bank-statements/${id}`);
    return response.data;
  },

  addItem: async (
    statementId: string,
    dto: CreateBankStatementItemDto,
  ): Promise<BankStatementItem> => {
    const response = await api.post<BankStatementItem>(
      `/bank-statements/${statementId}/items`,
      dto,
    );
    return response.data;
  },

  getItems: async (
    statementId: string,
    reconciled?: boolean,
  ): Promise<BankStatementItem[]> => {
    const params = new URLSearchParams();
    if (reconciled === true) params.append('reconciled', 'true');
    if (reconciled === false) params.append('reconciled', 'false');
    const response = await api.get<BankStatementItem[]>(
      `/bank-statements/${statementId}/items?${params.toString()}`,
    );
    return response.data;
  },

  reconcileItem: async (
    itemId: string,
    financialTransactionId: string,
  ): Promise<BankStatementItem> => {
    const response = await api.patch<BankStatementItem>(
      `/bank-statements/items/${itemId}/reconcile`,
      { financialTransactionId },
    );
    return response.data;
  },

  unreconcileItem: async (itemId: string): Promise<BankStatementItem> => {
    const response = await api.patch<BankStatementItem>(
      `/bank-statements/items/${itemId}/unreconcile`,
      {},
    );
    return response.data;
  },
};
