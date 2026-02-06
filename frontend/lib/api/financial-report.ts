import api from '../axios';

export interface ResultByPeriodBreakdownItem {
  key: string;
  label: string;
  amount: number;
}

export interface ResultByPeriodResponse {
  branchId: string;
  month: number;
  year: number;
  costCenterId?: string;
  totalIncome: number;
  totalExpense: number;
  result: number;
  incomeByOrigin?: ResultByPeriodBreakdownItem[];
  expenseByOrigin?: ResultByPeriodBreakdownItem[];
  byCostCenter?: ResultByPeriodBreakdownItem[];
}

export const financialReportApi = {
  getResultByPeriod: async (
    month: number,
    year: number,
    branchId?: string,
    costCenterId?: string,
  ): Promise<ResultByPeriodResponse> => {
    const params = new URLSearchParams();
    params.append('month', month.toString());
    params.append('year', year.toString());
    if (branchId) params.append('branchId', branchId);
    if (costCenterId) params.append('costCenterId', costCenterId);
    const response = await api.get<ResultByPeriodResponse>(
      `/financial/result-by-period?${params.toString()}`,
    );
    return response.data;
  },
};
