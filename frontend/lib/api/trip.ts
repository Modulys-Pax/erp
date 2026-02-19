import api from '../axios';

export type TripStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Trip {
  id: string;
  customerId: string;
  customerName?: string;
  vehicleId: string;
  vehicleIds?: string[];
  vehiclePlate?: string;
  vehiclePlates?: string[];
  driverId: string;
  driverName?: string;
  origin: string;
  destination: string;
  freightValue: number;
  status: TripStatus;
  scheduledDepartureAt?: string | null;
  scheduledArrivalAt?: string | null;
  actualDepartureAt?: string | null;
  actualArrivalAt?: string | null;
  accountReceivableId?: string | null;
  notes?: string | null;
  companyId: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
  /** Detalhe: soma despesas, lucro e margem (apenas em getById) */
  totalExpenses?: number;
  profit?: number;
  marginPercent?: number;
  expenses?: TripExpense[];
}

export interface TripExpense {
  id: string;
  tripId: string;
  tripExpenseTypeId: string;
  tripExpenseTypeName?: string;
  amount: number;
  description?: string | null;
  expenseDate: string;
  vehicleId: string;
  accountPayableId?: string | null;
  costCenterId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripExpenseDto {
  tripExpenseTypeId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  costCenterId?: string;
}

export interface CreateTripDto {
  customerId: string;
  vehicleIds: string[];
  driverId: string;
  origin: string;
  destination: string;
  freightValue: number;
  status?: TripStatus;
  scheduledDepartureAt?: string;
  scheduledArrivalAt?: string;
  actualDepartureAt?: string;
  actualArrivalAt?: string;
  notes?: string;
  branchId: string;
}

export interface UpdateTripDto extends Partial<CreateTripDto> {}

export interface TripExpenseType {
  id: string;
  name: string;
  code?: string | null;
  active: boolean;
  companyId: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

export const tripApi = {
  getAll: async (params?: {
    branchId?: string;
    vehicleId?: string;
    customerId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Trip[]> => {
    const response = await api.get<Trip[]>('/trips', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Trip> => {
    const response = await api.get<Trip>(`/trips/${id}`);
    return response.data;
  },

  create: async (data: CreateTripDto): Promise<Trip> => {
    const response = await api.post<Trip>('/trips', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTripDto): Promise<Trip> => {
    const response = await api.patch<Trip>(`/trips/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/trips/${id}`);
  },

  getExpenseTypes: async (branchId?: string): Promise<TripExpenseType[]> => {
    const response = await api.get<TripExpenseType[]>('/trips/expense-types', {
      params: branchId ? { branchId } : undefined,
    });
    return response.data;
  },

  getExpensesByTrip: async (tripId: string): Promise<TripExpense[]> => {
    const response = await api.get<TripExpense[]>(`/trips/${tripId}/expenses`);
    return response.data;
  },

  createExpense: async (
    tripId: string,
    data: CreateTripExpenseDto,
  ): Promise<TripExpense> => {
    const response = await api.post<TripExpense>(
      `/trips/${tripId}/expenses`,
      data,
    );
    return response.data;
  },

  removeExpense: async (
    tripId: string,
    expenseId: string,
  ): Promise<void> => {
    await api.delete(`/trips/${tripId}/expenses/${expenseId}`);
  },

  getVehicleProfit: async (
    vehicleId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    vehicleId: string;
    revenue: number;
    tripExpenses: number;
    maintenanceCosts: number;
    profit: number;
    marginPercent: number;
  }> => {
    const response = await api.get('/trips/vehicle-profit', {
      params: { vehicleId, startDate, endDate },
    });
    return response.data;
  },
};

const STATUS_LABELS: Record<TripStatus, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export function getTripStatusLabel(status: TripStatus): string {
  return STATUS_LABELS[status] ?? status;
}
