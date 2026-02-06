import api from '../axios';

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  companyId: string;
  branchId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateCostCenterDto {
  code: string;
  name: string;
  companyId: string;
  branchId: string;
  active?: boolean;
}

export interface UpdateCostCenterDto extends Partial<CreateCostCenterDto> {}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const costCenterApi = {
  getAll: async (
    branchId?: string,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponse<CostCenter>> => {
    const response = await api.get<PaginatedResponse<CostCenter>>('/cost-centers', {
      params: { branchId, page, limit },
    });
    return response.data;
  },

  getById: async (id: string): Promise<CostCenter> => {
    const response = await api.get<CostCenter>(`/cost-centers/${id}`);
    return response.data;
  },

  create: async (data: CreateCostCenterDto): Promise<CostCenter> => {
    const response = await api.post<CostCenter>('/cost-centers', data);
    return response.data;
  },

  update: async (id: string, data: UpdateCostCenterDto): Promise<CostCenter> => {
    const response = await api.patch<CostCenter>(`/cost-centers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/cost-centers/${id}`);
  },
};
