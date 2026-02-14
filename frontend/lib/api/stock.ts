import api from '../axios';
import { PaginatedResponse } from './branch';

export enum StockMovementType {
  ENTRY = 'ENTRY',
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  description?: string;
  companyId: string;
  branchId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  deletedAt?: Date;
}

export interface Stock {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  averageCost: number;
  companyId: string;
  branchId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface StockMovement {
  id: string;
  type: StockMovementType;
  productId: string;
  productName?: string;
  productCode?: string;
  productUnit?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  documentNumber?: string;
  notes?: string;
  maintenanceOrderId?: string;
  companyId: string;
  branchId: string;
  createdAt: Date;
  createdBy?: string;
}

export interface CreateStockMovementDto {
  type?: StockMovementType; // Sempre será ENTRY, opcional no frontend
  productId: string;
  quantity: number;
  unitCost?: number;
  documentNumber?: string;
  notes?: string;
  maintenanceOrderId?: string;
  companyId: string;
  branchId: string;
}

export const warehouseApi = {
  getAll: async (
    companyId?: string,
    branchId?: string,
    includeDeleted?: boolean,
  ): Promise<Warehouse[]> => {
    const response = await api.get<Warehouse[]>('/stock/warehouses', {
      params: { companyId, branchId, includeDeleted },
    });
    return response.data;
  },

  /** Retorna o almoxarifado único da empresa, ou null se não existir. */
  getCompanyDefault: async (companyId: string): Promise<Warehouse | null> => {
    const response = await api.get<Warehouse[]>('/stock/warehouses', {
      params: { companyId, includeDeleted: false },
    });
    const list = response.data;
    return list.length > 0 ? list[0]! : null;
  },
};

export const stockApi = {
  getAll: async (
    companyId?: string,
    branchId?: string,
    warehouseId?: string,
    productId?: string,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponse<Stock>> => {
    const response = await api.get<PaginatedResponse<Stock>>('/stock/stocks', {
      params: { companyId, branchId, warehouseId, productId, page, limit },
    });
    return response.data;
  },

  getById: async (id: string): Promise<Stock> => {
    const response = await api.get<Stock>(`/stock/stocks/${id}`);
    return response.data;
  },
};

export const stockMovementApi = {
  getAll: async (
    companyId?: string,
    branchId?: string,
    productId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<StockMovement>> => {
    const response = await api.get<PaginatedResponse<StockMovement>>('/stock/movements', {
      params: {
        companyId,
        branchId,
        productId,
        startDate,
        endDate,
        page,
        limit,
      },
    });
    return response.data;
  },

  getById: async (id: string): Promise<StockMovement> => {
    const response = await api.get<StockMovement>(`/stock/movements/${id}`);
    return response.data;
  },

  create: async (data: CreateStockMovementDto): Promise<StockMovement> => {
    const response = await api.post<StockMovement>('/stock/movements', data);
    return response.data;
  },
};
