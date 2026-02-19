import api from '../axios';

export interface VehicleProfitabilityRow {
  vehicleId: string;
  vehiclePlate: string | null;
  revenue: number;
  tripExpenses: number;
  maintenanceCosts: number;
  totalCost: number;
  profit: number;
  marginPercent: number;
}

export interface RevenueByCustomerRow {
  customerId: string;
  customerName: string;
  revenue: number;
  tripCount: number;
}

export interface OperationalCostRow {
  vehicleId: string;
  vehiclePlate: string | null;
  tripExpenses: number;
  maintenanceCosts: number;
  totalCost: number;
}

export interface FleetMarginSummary {
  totalRevenue: number;
  totalTripExpenses: number;
  totalMaintenanceCosts: number;
  totalCost: number;
  profit: number;
  fleetAverageMarginPercent: number;
  vehicleCount: number;
}

export interface DashboardRentability {
  mostProfitableVehicle: {
    vehicleId: string;
    vehiclePlate: string | null;
    profit: number;
  } | null;
  leastProfitableVehicle: {
    vehicleId: string;
    vehiclePlate: string | null;
    profit: number;
  } | null;
  fleetAverageMarginPercent: number;
}

export interface CostCenterReportRow {
  costCenterId: string | null;
  costCenterCode: string;
  costCenterName: string;
  revenue: number;
  expense: number;
  balance: number;
}

export const reportsApi = {
  getVehicleProfitability: async (params?: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<VehicleProfitabilityRow[]> => {
    const response = await api.get<VehicleProfitabilityRow[]>(
      '/reports/vehicle-profitability',
      { params },
    );
    return response.data;
  },

  getRevenueByCustomer: async (params?: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<RevenueByCustomerRow[]> => {
    const response = await api.get<RevenueByCustomerRow[]>(
      '/reports/revenue-by-customer',
      { params },
    );
    return response.data;
  },

  getOperationalCost: async (params?: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<OperationalCostRow[]> => {
    const response = await api.get<OperationalCostRow[]>(
      '/reports/operational-cost',
      { params },
    );
    return response.data;
  },

  getFleetMargin: async (params?: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FleetMarginSummary> => {
    const response = await api.get<FleetMarginSummary>(
      '/reports/fleet-margin',
      { params },
    );
    return response.data;
  },

  getByCostCenter: async (params?: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CostCenterReportRow[]> => {
    const response = await api.get<CostCenterReportRow[]>(
      '/reports/by-cost-center',
      { params },
    );
    return response.data;
  },

  getDashboardRentability: async (branchId?: string): Promise<DashboardRentability> => {
    const response = await api.get<DashboardRentability>(
      '/reports/dashboard-rentability',
      { params: branchId ? { branchId } : undefined },
    );
    return response.data;
  },
};
