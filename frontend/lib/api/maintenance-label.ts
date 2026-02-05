import api from '../axios';
import { PaginatedResponse } from './branch';

export interface MaintenanceLabelProduct {
  id: string;
  productId: string;
  productName: string;
  replaceEveryKm?: number;
  lastChangeKm: number;
  nextChangeKm: number;
}

export interface MaintenanceLabel {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  companyId: string;
  branchId: string;
  createdAt: Date;
  createdBy?: string;
  products: MaintenanceLabelProduct[];
}

export interface CreateMaintenanceLabelDto {
  vehicleId: string;
  /** Se omitido ou vazio, o backend usa todos os itens de troca por KM do veículo. */
  productIds?: string[];
  companyId: string;
  branchId: string;
}

export interface RegisterProductChangeItemDto {
  vehicleReplacementItemId: string;
  cost?: number;
}

export interface RegisterProductChangeDto {
  /** IDs dos veículos/placas (1 a 4) que compõem o combo */
  vehicleIds: string[];
  changeKm: number;
  items: RegisterProductChangeItemDto[];
  serviceDate?: string; // ISO 8601 (ex.: 2026-01-28)
  companyId: string;
  branchId: string;
}

export type MaintenanceDueStatus = 'ok' | 'warning' | 'due';

export interface MaintenanceDueItem {
  productId: string;
  productName: string;
  replaceEveryKm?: number;
  lastChangeKm: number;
  nextChangeKm: number;
  status: MaintenanceDueStatus;
}

export interface MaintenanceDueByVehicle {
  referenceKm: number;
  items: MaintenanceDueItem[];
}

export const maintenanceLabelApi = {
  getAll: async (
    branchId?: string,
    vehicleId?: string,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponse<MaintenanceLabel>> => {
    const response = await api.get<PaginatedResponse<MaintenanceLabel>>(
      '/maintenance-labels',
      {
        params: { branchId, vehicleId, page, limit },
      },
    );
    return response.data;
  },

  getById: async (id: string): Promise<MaintenanceLabel> => {
    const response = await api.get<MaintenanceLabel>(
      `/maintenance-labels/${id}`,
    );
    return response.data;
  },

  create: async (
    data: CreateMaintenanceLabelDto,
  ): Promise<MaintenanceLabel> => {
    const response = await api.post<MaintenanceLabel>(
      '/maintenance-labels',
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/maintenance-labels/${id}`);
  },

  registerProductChange: async (
    data: RegisterProductChangeDto,
  ): Promise<{ orderId: string }> => {
    const response = await api.post<{ orderId: string }>(
      '/maintenance-labels/register-change',
      data,
    );
    return response.data;
  },

  getDueByVehicle: async (
    vehicleId: string,
    branchId?: string,
  ): Promise<MaintenanceDueByVehicle> => {
    const response = await api.get<MaintenanceDueByVehicle>(
      '/maintenance-labels/due-by-vehicle',
      { params: { vehicleId, branchId } },
    );
    return response.data;
  },
};
