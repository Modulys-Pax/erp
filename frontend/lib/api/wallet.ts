import api from '../axios';

export interface BalanceAdjustment {
  id: string;
  previousBalance: number;
  newBalance: number;
  adjustmentType: string;
  reason?: string;
  createdAt: string;
  createdBy?: string;
}

export interface MonthlyMovement {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: string;
  originType?: string;
  documentNumber?: string;
  type: 'payable' | 'receivable';
}

export interface WalletSummary {
  branchId: string;
  branchName: string;
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  pendingReceivables: number;
  pendingPayables: number;
  projectedBalance: number;
  periodProfit: number;
  movements: MonthlyMovement[];
  referenceMonth: number;
  referenceYear: number;
}

export interface WalletBalance {
  id: string;
  branchId: string;
  balance: number;
  updatedAt: string;
  adjustments?: BalanceAdjustment[];
}

export interface AdjustBalanceDto {
  newBalance: number;
  adjustmentType: 'MANUAL_ADJUSTMENT' | 'INITIAL_BALANCE' | 'CORRECTION';
  reason?: string;
}

export interface CheckBalanceResult {
  sufficient: boolean;
  currentBalance: number;
  requiredAmount: number;
}

export interface BalanceHistoryResponse {
  data: BalanceAdjustment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CashFlowProjectionMonth {
  yearMonth: string;
  initialBalance: number;
  totalExpectedReceipts: number;
  totalExpectedPayments: number;
  projectedEndBalance: number;
}

export interface CashFlowProjection {
  branchId: string;
  months: CashFlowProjectionMonth[];
}

export const walletApi = {
  /**
   * Obter resumo da carteira para um mês/ano
   */
  getSummary: async (
    month: number,
    year: number,
    branchId?: string,
  ): Promise<WalletSummary> => {
    const params = new URLSearchParams();
    params.append('month', month.toString());
    params.append('year', year.toString());
    if (branchId) params.append('branchId', branchId);

    const response = await api.get<WalletSummary>(`/wallet/summary?${params.toString()}`);
    return response.data;
  },

  /**
   * Obter saldo atual da filial
   */
  getBalance: async (branchId?: string): Promise<WalletBalance> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const response = await api.get<WalletBalance>(`/wallet/balance?${params.toString()}`);
    return response.data;
  },

  /**
   * Ajustar saldo manualmente (admin)
   */
  adjustBalance: async (
    adjustDto: AdjustBalanceDto,
    branchId?: string,
  ): Promise<WalletBalance> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const response = await api.post<WalletBalance>(
      `/wallet/adjust?${params.toString()}`,
      adjustDto,
    );
    return response.data;
  },

  /**
   * Verificar se há saldo suficiente
   */
  checkBalance: async (
    amount: number,
    branchId?: string,
  ): Promise<CheckBalanceResult> => {
    const params = new URLSearchParams();
    params.append('amount', amount.toString());
    if (branchId) params.append('branchId', branchId);

    const response = await api.get<CheckBalanceResult>(
      `/wallet/check-balance?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Obter histórico de ajustes de saldo
   */
  getHistory: async (
    page = 1,
    limit = 20,
    branchId?: string,
  ): Promise<BalanceHistoryResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (branchId) params.append('branchId', branchId);

    const response = await api.get<BalanceHistoryResponse>(
      `/wallet/history?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Fluxo de caixa projetado (próximos N meses)
   */
  getCashFlowProjection: async (
    branchId?: string,
    months = 6,
  ): Promise<CashFlowProjection> => {
    const params = new URLSearchParams();
    params.append('months', months.toString());
    if (branchId) params.append('branchId', branchId);
    const response = await api.get<CashFlowProjection>(
      `/wallet/cash-flow-projection?${params.toString()}`,
    );
    return response.data;
  },
};
