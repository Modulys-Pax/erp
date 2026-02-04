import api from '../axios';
import { PaginatedResponse } from './branch';

export interface MaintenanceWorker {
  id: string;
  maintenanceOrderId: string;
  employeeId: string;
  employeeName?: string;
  isResponsible: boolean;
  createdAt: Date;
  createdBy?: string;
}

export interface MaintenanceService {
  id: string;
  maintenanceOrderId: string;
  description: string;
  cost?: number;
  createdAt: Date;
  createdBy?: string;
}

export interface MaintenanceMaterial {
  id: string;
  maintenanceOrderId: string;
  productId: string;
  productName?: string;
  productUnit?: string;
  vehicleReplacementItemId?: string;
  replacementItemName?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  createdAt: Date;
  createdBy?: string;
}

export interface ReplacementItemSummary {
  id: string;
  name: string;
}

export interface MaintenanceTimeline {
  id: string;
  maintenanceOrderId: string;
  event: 'STARTED' | 'PAUSED' | 'RESUMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: Date;
  createdBy?: string;
}

export interface MaintenanceOrder {
  id: string;
  orderNumber: string;
  vehicleId: string;
  vehiclePlate?: string;
  type: 'PREVENTIVE' | 'CORRECTIVE';
  status: 'OPEN' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  kmAtEntry?: number;
  serviceDate?: Date;
  description?: string;
  observations?: string;
  totalCost?: number;
  totalTimeMinutes?: number;
  attachmentFileName?: string;
  attachmentFilePath?: string;
  companyId: string;
  branchId: string;
  workers?: MaintenanceWorker[];
  services?: MaintenanceService[];
  materials?: MaintenanceMaterial[];
  timeline?: MaintenanceTimeline[];
  /** Itens de troca por KM que foram trocados nesta ordem */
  replacementItemsSummary?: ReplacementItemSummary[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  deletedAt?: Date;
}

export interface CreateMaintenanceWorkerDto {
  employeeId: string;
  isResponsible?: boolean;
}

export interface CreateMaintenanceServiceDto {
  description: string;
  cost?: number;
}

export interface CreateMaintenanceMaterialDto {
  productId: string;
  vehicleReplacementItemId?: string;
  quantity: number;
  unitCost?: number;
}

export interface CreateMaintenanceOrderDto {
  vehicleId: string;
  type: 'PREVENTIVE' | 'CORRECTIVE';
  kmAtEntry?: number;
  description?: string;
  observations?: string;
  companyId: string;
  branchId: string;
  workers?: CreateMaintenanceWorkerDto[];
  services?: CreateMaintenanceServiceDto[];
  materials?: CreateMaintenanceMaterialDto[];
  /** IDs dos itens de troca por KM que foram trocados nesta ordem */
  replacementItemsChanged?: string[];
}

export interface UpdateMaintenanceOrderDto {
  description?: string;
  observations?: string;
  workers?: CreateMaintenanceWorkerDto[];
  services?: CreateMaintenanceServiceDto[];
  materials?: CreateMaintenanceMaterialDto[];
}

export interface MaintenanceActionDto {
  notes?: string;
}

export const maintenanceApi = {
  getAll: async (
    branchId?: string,
    vehicleId?: string,
    status?: string,
    includeDeleted?: boolean,
    page = 1,
    limit = 15,
    startDate?: string,
    endDate?: string,
  ): Promise<PaginatedResponse<MaintenanceOrder>> => {
    const response = await api.get<PaginatedResponse<MaintenanceOrder>>('/maintenance', {
      params: { branchId, vehicleId, status, startDate, endDate, includeDeleted, page, limit },
    });
    return response.data;
  },

  getById: async (id: string): Promise<MaintenanceOrder> => {
    const response = await api.get<MaintenanceOrder>(`/maintenance/${id}`);
    return response.data;
  },

  create: async (
    data: CreateMaintenanceOrderDto,
  ): Promise<MaintenanceOrder> => {
    const response = await api.post<MaintenanceOrder>('/maintenance', data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateMaintenanceOrderDto,
  ): Promise<MaintenanceOrder> => {
    const response = await api.patch<MaintenanceOrder>(
      `/maintenance/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/maintenance/${id}`);
  },

  start: async (
    id: string,
    data?: MaintenanceActionDto,
  ): Promise<MaintenanceOrder> => {
    const response = await api.post<MaintenanceOrder>(
      `/maintenance/${id}/start`,
      data || {},
    );
    return response.data;
  },

  pause: async (
    id: string,
    data?: MaintenanceActionDto,
  ): Promise<MaintenanceOrder> => {
    const response = await api.post<MaintenanceOrder>(
      `/maintenance/${id}/pause`,
      data || {},
    );
    return response.data;
  },

  complete: async (
    id: string,
    data?: MaintenanceActionDto,
  ): Promise<MaintenanceOrder> => {
    const response = await api.post<MaintenanceOrder>(
      `/maintenance/${id}/complete`,
      data || {},
    );
    return response.data;
  },

  cancel: async (
    id: string,
    data?: MaintenanceActionDto,
  ): Promise<MaintenanceOrder> => {
    const response = await api.post<MaintenanceOrder>(
      `/maintenance/${id}/cancel`,
      data || {},
    );
    return response.data;
  },

  getByVehicle: async (vehicleId: string): Promise<MaintenanceOrder[]> => {
    const response = await api.get<MaintenanceOrder[]>(
      `/maintenance/vehicle/${vehicleId}`,
    );
    return response.data;
  },

  uploadAttachment: async (
    orderId: string,
    file: File,
  ): Promise<MaintenanceOrder> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<MaintenanceOrder>(
      `/maintenance/${orderId}/attachment`,
      formData,
    );
    return response.data;
  },

  getAttachment: async (orderId: string): Promise<Blob> => {
    const response = await api.get(`/maintenance/${orderId}/attachment`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
