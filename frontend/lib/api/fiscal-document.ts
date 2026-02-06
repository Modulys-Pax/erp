import api from '../axios';

export type FiscalDocumentType = 'ENTRY' | 'EXIT';
export type FiscalDocumentStatus = 'REGISTERED' | 'CANCELLED';

export interface FiscalDocument {
  id: string;
  type: FiscalDocumentType;
  number: string;
  series?: string;
  issueDate: string;
  totalAmount: number;
  status: FiscalDocumentStatus;
  companyId: string;
  branchId: string;
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;
  accountPayableId?: string;
  accountReceivableId?: string;
  financialTransactionId?: string;
  notes?: string;
  externalKey?: string;
  issuedAt?: string;
  xmlPath?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateFiscalDocumentDto {
  type: FiscalDocumentType;
  number: string;
  series?: string;
  issueDate: string;
  totalAmount: number;
  status?: FiscalDocumentStatus;
  companyId: string;
  branchId: string;
  supplierId?: string;
  customerId?: string;
  accountPayableId?: string;
  accountReceivableId?: string;
  financialTransactionId?: string;
  notes?: string;
}

export interface UpdateFiscalDocumentDto extends Partial<CreateFiscalDocumentDto> {}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const fiscalDocumentApi = {
  getAll: async (
    params?: {
      branchId?: string;
      startDate?: string;
      endDate?: string;
      type?: FiscalDocumentType;
      status?: FiscalDocumentStatus;
      includeDeleted?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedResponse<FiscalDocument>> => {
    const response = await api.get<PaginatedResponse<FiscalDocument>>('/fiscal-documents', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<FiscalDocument> => {
    const response = await api.get<FiscalDocument>(`/fiscal-documents/${id}`);
    return response.data;
  },

  create: async (data: CreateFiscalDocumentDto): Promise<FiscalDocument> => {
    const response = await api.post<FiscalDocument>('/fiscal-documents', data);
    return response.data;
  },

  update: async (id: string, data: UpdateFiscalDocumentDto): Promise<FiscalDocument> => {
    const response = await api.patch<FiscalDocument>(`/fiscal-documents/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/fiscal-documents/${id}`);
  },
};
