import api from '../axios';
import { PaginatedResponse } from './branch';

export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId: string;
  productName?: string;
  productCode?: string;
  productUnit?: string;
  quantity: number;
  quantityInvoiced: number;
  unitPrice?: number;
  total?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  customerName?: string;
  companyId: string;
  branchId: string;
  orderDate?: Date;
  status: SalesOrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  items: SalesOrderItem[];
  totalAmount?: number;
}

export interface CreateSalesOrderItemDto {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreateSalesOrderDto {
  customerId: string;
  branchId: string;
  orderDate?: string;
  notes?: string;
  items: CreateSalesOrderItemDto[];
}

export interface UpdateSalesOrderDto {
  customerId?: string;
  branchId?: string;
  orderDate?: string;
  notes?: string;
  status?: SalesOrderStatus;
  items?: CreateSalesOrderItemDto[];
}

export interface InvoiceSalesOrderDto {
  createAccountReceivable?: boolean;
  deductStock?: boolean;
}

export const salesOrderApi = {
  getAll: async (
    branchId?: string,
    status?: string,
    customerId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponse<SalesOrder>> => {
    const response = await api.get<PaginatedResponse<SalesOrder>>(
      '/sales-orders',
      {
        params: {
          branchId,
          status,
          customerId,
          startDate,
          endDate,
          page,
          limit,
        },
      },
    );
    return response.data;
  },

  getById: async (id: string): Promise<SalesOrder> => {
    const response = await api.get<SalesOrder>(`/sales-orders/${id}`);
    return response.data;
  },

  create: async (data: CreateSalesOrderDto): Promise<SalesOrder> => {
    const response = await api.post<SalesOrder>('/sales-orders', data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateSalesOrderDto,
  ): Promise<SalesOrder> => {
    const response = await api.patch<SalesOrder>(`/sales-orders/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/sales-orders/${id}`);
  },

  invoice: async (
    id: string,
    data?: InvoiceSalesOrderDto,
  ): Promise<SalesOrder> => {
    const response = await api.post<SalesOrder>(
      `/sales-orders/${id}/invoice`,
      data ?? {},
    );
    return response.data;
  },
};
