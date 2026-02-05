import api from '../axios';
import { PaginatedResponse } from './branch';

export const VEHICLE_PLATE_TYPES = [
  'CAVALO',
  'PRIMEIRA_CARRETA',
  'DOLLY',
  'SEGUNDA_CARRETA',
] as const;
export type VehiclePlateType = (typeof VEHICLE_PLATE_TYPES)[number];

export interface VehiclePlateItem {
  type: VehiclePlateType;
  plate: string;
}

export interface Vehicle {
  id: string;
  /** Placa principal (cavalo ou primeira da lista) - compatibilidade */
  plate: string;
  /** Placas por tipo (cavalo, primeira carreta, dolly, segunda carreta) */
  plates: VehiclePlateItem[];
  /** Produtos para troca a cada X KM neste veículo */
  replacementItems: VehicleReplacementItemResponse[];
  brandId?: string;
  brandName?: string;
  modelId?: string;
  modelName?: string;
  year?: number;
  color?: string;
  chassis?: string;
  renavam?: string;
  currentKm?: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'STOPPED';
  companyId: string;
  branchId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  deletedAt?: Date;
}

export interface VehicleReplacementItemDto {
  name: string;
  replaceEveryKm: number;
}

export interface VehicleReplacementItemResponse {
  id: string;
  name: string;
  replaceEveryKm: number;
}

export interface CreateVehicleDto {
  /** Uma placa por registro (Vehicle = 1 placa) */
  plate: VehiclePlateItem;
  replacementItems?: VehicleReplacementItemDto[];
  brandId?: string;
  modelId?: string;
  year?: number;
  color?: string;
  chassis?: string;
  renavam?: string;
  currentKm?: number;
  status?: 'ACTIVE' | 'MAINTENANCE' | 'STOPPED';
  companyId: string;
  branchId: string;
  active?: boolean;
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {}

export const vehicleApi = {
  getAll: async (
    branchId?: string,
    includeDeleted?: boolean,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponse<Vehicle>> => {
    const response = await api.get<PaginatedResponse<Vehicle>>('/vehicles', {
      params: { branchId, includeDeleted, page, limit },
    });
    return response.data;
  },

  getById: async (id: string): Promise<Vehicle> => {
    const response = await api.get<Vehicle>(`/vehicles/${id}`);
    return response.data;
  },

  create: async (data: CreateVehicleDto): Promise<Vehicle> => {
    const response = await api.post<Vehicle>('/vehicles', data);
    return response.data;
  },

  update: async (id: string, data: UpdateVehicleDto): Promise<Vehicle> => {
    const response = await api.patch<Vehicle>(`/vehicles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}`);
  },

  updateKm: async (
    id: string,
    data: { currentKm: number; notes?: string },
  ): Promise<Vehicle> => {
    const response = await api.patch<Vehicle>(`/vehicles/${id}/km`, data);
    return response.data;
  },

  updateStatus: async (
    id: string,
    data: {
      status: 'ACTIVE' | 'MAINTENANCE' | 'STOPPED';
      km?: number;
      notes?: string;
    },
  ): Promise<Vehicle> => {
    const response = await api.patch<Vehicle>(`/vehicles/${id}/status`, data);
    return response.data;
  },

  getStatusHistory: async (id: string): Promise<VehicleStatusHistory[]> => {
    const response = await api.get<VehicleStatusHistory[]>(
      `/vehicles/${id}/history`,
    );
    return response.data;
  },

  getCosts: async (
    branchId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 15,
  ): Promise<VehicleCostsResponse> => {
    const response = await api.get<VehicleCostsResponse>('/vehicles/costs/summary', {
      params: { branchId, startDate, endDate, page, limit },
    });
    return response.data;
  },

  /** Lista placas da filial para seleção de composição (manutenção, marcação, troca na estrada) */
  getPlatesByBranch: async (
    branchId: string,
  ): Promise<{ plate: string; type: VehiclePlateType }[]> => {
    const response = await api.get<{ plate: string; type: VehiclePlateType }[]>(
      '/vehicles/plates/by-branch',
      { params: { branchId } },
    );
    return response.data;
  },
};

export interface VehicleStatusHistory {
  id: string;
  vehicleId: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'STOPPED';
  km?: number;
  notes?: string;
  createdAt: Date;
  createdBy?: string;
  maintenanceOrderId?: string;
}

export interface VehicleCostDetail {
  vehicleId: string;
  plate: string;
  model?: string;
  totalMaintenanceCost: number;
  totalMaterialsCost: number;
  totalServicesCost: number;
  totalMaintenanceOrders: number;
  periodCost: number;
  periodOrders: number;
}

export interface VehicleCostsSummary {
  totalVehicles: number;
  totalMaintenanceCost: number;
  totalMaterialsCost: number;
  totalServicesCost: number;
  totalMaintenanceOrders: number;
  averageCostPerVehicle: number;
}

export interface VehicleCostsResponse {
  summary: VehicleCostsSummary;
  vehicles: PaginatedResponse<VehicleCostDetail>;
}
