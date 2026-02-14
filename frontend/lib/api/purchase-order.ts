import api from '../axios';
import { PaginatedResponse } from './branch';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName?: string;
  productCode?: string;
  productUnit?: string;
  quantity: number;
  quantityReceived: number;
  unitPrice?: number;
  total?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName?: string;
  companyId: string;
  branchId: string;
  expectedDeliveryDate?: Date;
  status: PurchaseOrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  items: PurchaseOrderItem[];
  totalAmount?: number;
}

export interface CreatePurchaseOrderItemDto {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreatePurchaseOrderDto {
  supplierId: string;
  branchId: string;
  expectedDeliveryDate?: string;
  notes?: string;
  items: CreatePurchaseOrderItemDto[];
}

export interface UpdatePurchaseOrderDto {
  supplierId?: string;
  branchId?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  status?: PurchaseOrderStatus;
  items?: CreatePurchaseOrderItemDto[];
}

export interface ReceivePurchaseOrderItemDto {
  itemId: string;
  quantityReceived: number;
}

export interface ReceivePurchaseOrderDto {
  items: ReceivePurchaseOrderItemDto[];
  createAccountPayable?: boolean;
}

export const purchaseOrderApi = {
  getAll: async (
    branchId?: string,
    status?: string,
    supplierId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponse<PurchaseOrder>> => {
    const response = await api.get<PaginatedResponse<PurchaseOrder>>(
      '/purchase-orders',
      {
        params: {
          branchId,
          status,
          supplierId,
          startDate,
          endDate,
          page,
          limit,
        },
      },
    );
    return response.data;
  },

  getById: async (id: string): Promise<PurchaseOrder> => {
    const response = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
    return response.data;
  },

  create: async (data: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
    const response = await api.post<PurchaseOrder>('/purchase-orders', data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> => {
    const response = await api.patch<PurchaseOrder>(
      `/purchase-orders/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/purchase-orders/${id}`);
  },

  receive: async (
    id: string,
    data: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrder> => {
    const response = await api.post<PurchaseOrder>(
      `/purchase-orders/${id}/receive`,
      data,
    );
    return response.data;
  },
};
