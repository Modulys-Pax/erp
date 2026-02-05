import api from '../axios';
import { PaginatedResponse } from './branch';

export interface VehicleMarking {
  id: string;
  vehicleId: string;
  vehiclePlate?: string;
  km: number;
  companyId: string;
  branchId: string;
  createdAt: Date;
  createdBy?: string;
}

export interface CreateVehicleMarkingDto {
  /** IDs dos veículos/placas (1 a 4) que compõem o combo */
  vehicleIds: string[];
  km: number;
  companyId: string;
  branchId: string;
}

export const vehicleMarkingApi = {
  getAll: async (
    branchId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponse<VehicleMarking>> => {
    const response = await api.get<PaginatedResponse<VehicleMarking>>(
      '/vehicle-markings',
      {
        params: { branchId, startDate, endDate, page, limit },
      },
    );
    return response.data;
  },

  getById: async (id: string): Promise<VehicleMarking> => {
    const response = await api.get<VehicleMarking>(`/vehicle-markings/${id}`);
    return response.data;
  },

  create: async (data: CreateVehicleMarkingDto): Promise<VehicleMarking> => {
    const response = await api.post<VehicleMarking>('/vehicle-markings', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicle-markings/${id}`);
  },
};
