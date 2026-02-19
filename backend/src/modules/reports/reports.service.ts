import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';

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

export interface DashboardRentabilityDto {
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

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private defaultPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  private parsePeriod(startDate?: string, endDate?: string): { start: Date; end: Date } {
    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate + 'T23:59:59.999Z'),
      };
    }
    return this.defaultPeriod();
  }

  async getVehicleProfitabilityReport(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    user?: any,
  ): Promise<VehicleProfitabilityRow[]> {
    const companyId = DEFAULT_COMPANY_ID;
    if (user && branchId) {
      validateBranchAccess(user.branchId, user.role, branchId, undefined);
    }
    const { start, end } = this.parsePeriod(startDate, endDate);

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      include: { plate: true },
    });

    const vehicleIds = vehicles.map((v) => v.id);
    if (vehicleIds.length === 0) return [];

    const trips = await this.prisma.trip.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        deletedAt: null,
        status: 'COMPLETED',
        OR: [
          { scheduledDepartureAt: { gte: start, lte: end } },
          { scheduledArrivalAt: { gte: start, lte: end } },
          { actualDepartureAt: { gte: start, lte: end } },
          { actualArrivalAt: { gte: start, lte: end } },
        ],
      },
      include: { expenses: true },
    });

    const tripRevenueByVehicle: Record<string, number> = {};
    const tripExpensesByVehicle: Record<string, number> = {};
    for (const t of trips) {
      tripRevenueByVehicle[t.vehicleId] =
        (tripRevenueByVehicle[t.vehicleId] ?? 0) + Number(t.freightValue);
      const expSum = t.expenses.reduce((s, e) => s + Number(e.amount), 0);
      tripExpensesByVehicle[t.vehicleId] =
        (tripExpensesByVehicle[t.vehicleId] ?? 0) + expSum;
    }

    const maintenanceCp = await this.prisma.accountPayable.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        deletedAt: null,
        originType: 'MAINTENANCE',
        dueDate: { gte: start, lte: end },
      },
    });
    const maintenanceByVehicle: Record<string, number> = {};
    for (const ap of maintenanceCp) {
      if (ap.vehicleId) {
        maintenanceByVehicle[ap.vehicleId] =
          (maintenanceByVehicle[ap.vehicleId] ?? 0) + Number(ap.amount);
      }
    }

    const rows: VehicleProfitabilityRow[] = vehicles.map((v) => {
      const revenue = tripRevenueByVehicle[v.id] ?? 0;
      const tripExp = tripExpensesByVehicle[v.id] ?? 0;
      const maint = maintenanceByVehicle[v.id] ?? 0;
      const totalCost = tripExp + maint;
      const profit = revenue - totalCost;
      const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
      return {
        vehicleId: v.id,
        vehiclePlate: v.plate?.plate ?? null,
        revenue,
        tripExpenses: tripExp,
        maintenanceCosts: maint,
        totalCost,
        profit,
        marginPercent: Math.round(marginPercent * 100) / 100,
      };
    });

    return rows.sort((a, b) => b.profit - a.profit);
  }

  async getRevenueByCustomerReport(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    user?: any,
  ): Promise<RevenueByCustomerRow[]> {
    const companyId = DEFAULT_COMPANY_ID;
    if (user && branchId) {
      validateBranchAccess(user.branchId, user.role, branchId, undefined);
    }
    const { start, end } = this.parsePeriod(startDate, endDate);

    const trips = await this.prisma.trip.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: 'COMPLETED',
        ...(branchId ? { branchId } : {}),
        OR: [
          { scheduledDepartureAt: { gte: start, lte: end } },
          { scheduledArrivalAt: { gte: start, lte: end } },
          { actualDepartureAt: { gte: start, lte: end } },
          { actualArrivalAt: { gte: start, lte: end } },
        ],
      },
      include: { customer: true },
    });

    const byCustomer: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const t of trips) {
      const id = t.customerId;
      if (!byCustomer[id]) {
        byCustomer[id] = {
          name: (t.customer as any)?.name ?? id,
          revenue: 0,
          count: 0,
        };
      }
      byCustomer[id].revenue += Number(t.freightValue);
      byCustomer[id].count += 1;
    }

    return Object.entries(byCustomer).map(([customerId, v]) => ({
      customerId,
      customerName: v.name,
      revenue: v.revenue,
      tripCount: v.count,
    })).sort((a, b) => b.revenue - a.revenue);
  }

  async getOperationalCostReport(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    user?: any,
  ): Promise<OperationalCostRow[]> {
    const companyId = DEFAULT_COMPANY_ID;
    if (user && branchId) {
      validateBranchAccess(user.branchId, user.role, branchId, undefined);
    }
    const { start, end } = this.parsePeriod(startDate, endDate);

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      include: { plate: true },
    });
    const vehicleIds = vehicles.map((v) => v.id);
    if (vehicleIds.length === 0) return [];

    const trips = await this.prisma.trip.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        deletedAt: null,
        OR: [
          { scheduledDepartureAt: { gte: start, lte: end } },
          { scheduledArrivalAt: { gte: start, lte: end } },
          { actualDepartureAt: { gte: start, lte: end } },
          { actualArrivalAt: { gte: start, lte: end } },
        ],
      },
      include: { expenses: true },
    });

    const tripExpensesByVehicle: Record<string, number> = {};
    for (const t of trips) {
      const sum = t.expenses.reduce((s, e) => s + Number(e.amount), 0);
      tripExpensesByVehicle[t.vehicleId] =
        (tripExpensesByVehicle[t.vehicleId] ?? 0) + sum;
    }

    const maintenanceCp = await this.prisma.accountPayable.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        deletedAt: null,
        originType: 'MAINTENANCE',
        dueDate: { gte: start, lte: end },
      },
    });
    const maintenanceByVehicle: Record<string, number> = {};
    for (const ap of maintenanceCp) {
      if (ap.vehicleId) {
        maintenanceByVehicle[ap.vehicleId] =
          (maintenanceByVehicle[ap.vehicleId] ?? 0) + Number(ap.amount);
      }
    }

    return vehicles.map((v) => {
      const tripExp = tripExpensesByVehicle[v.id] ?? 0;
      const maint = maintenanceByVehicle[v.id] ?? 0;
      return {
        vehicleId: v.id,
        vehiclePlate: v.plate?.plate ?? null,
        tripExpenses: tripExp,
        maintenanceCosts: maint,
        totalCost: tripExp + maint,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
  }

  async getFleetMarginReport(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    user?: any,
  ): Promise<FleetMarginSummary> {
    const rows = await this.getVehicleProfitabilityReport(
      branchId,
      startDate,
      endDate,
      user,
    );
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const totalTripExpenses = rows.reduce((s, r) => s + r.tripExpenses, 0);
    const totalMaintenanceCosts = rows.reduce((s, r) => s + r.maintenanceCosts, 0);
    const totalCost = totalTripExpenses + totalMaintenanceCosts;
    const profit = totalRevenue - totalCost;
    const fleetAverageMarginPercent =
      totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    return {
      totalRevenue,
      totalTripExpenses,
      totalMaintenanceCosts,
      totalCost,
      profit,
      fleetAverageMarginPercent: Math.round(fleetAverageMarginPercent * 100) / 100,
      vehicleCount: rows.length,
    };
  }

  async getDashboardRentability(
    branchId?: string,
    user?: any,
  ): Promise<DashboardRentabilityDto> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const rows = await this.getVehicleProfitabilityReport(
      branchId,
      startStr,
      endStr,
      user,
    );

    const withProfit = rows.filter((r) => r.revenue > 0 || r.totalCost > 0);
    if (withProfit.length === 0) {
      return {
        mostProfitableVehicle: null,
        leastProfitableVehicle: null,
        fleetAverageMarginPercent: 0,
      };
    }

    const sorted = [...withProfit].sort((a, b) => b.profit - a.profit);
    const most = sorted[0];
    const least = sorted[sorted.length - 1];
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
    const profit = totalRevenue - totalCost;
    const fleetAverageMarginPercent =
      totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      mostProfitableVehicle: most
        ? {
            vehicleId: most.vehicleId,
            vehiclePlate: most.vehiclePlate,
            profit: most.profit,
          }
        : null,
      leastProfitableVehicle: least
        ? {
            vehicleId: least.vehicleId,
            vehiclePlate: least.vehiclePlate,
            profit: least.profit,
          }
        : null,
      fleetAverageMarginPercent: Math.round(fleetAverageMarginPercent * 100) / 100,
    };
  }

  /**
   * Relatório por centro de custo: receita (CR recebidas) e despesa (CP pagas) no período.
   */
  async getCostCenterReport(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    user?: any,
  ): Promise<CostCenterReportRow[]> {
    const companyId = DEFAULT_COMPANY_ID;
    if (user && branchId) {
      validateBranchAccess(user.branchId, user.role, branchId, undefined);
    }
    const { start, end } = this.parsePeriod(startDate, endDate);

    const branchFilter = branchId ? { branchId } : {};
    const baseWhere = { companyId, deletedAt: null, ...branchFilter };

    const costCenters = await this.prisma.costCenter.findMany({
      where: { ...baseWhere, active: true },
      orderBy: [{ code: 'asc' }],
    });

    const [arAgg, apAgg] = await Promise.all([
      this.prisma.accountReceivable.groupBy({
        by: ['costCenterId'],
        where: {
          ...baseWhere,
          status: 'RECEIVED',
          receiptDate: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      this.prisma.accountPayable.groupBy({
        by: ['costCenterId'],
        where: {
          ...baseWhere,
          status: 'PAID',
          paymentDate: { not: null, gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
    ]);

    const revenueByCc: Record<string, number> = {};
    const expenseByCc: Record<string, number> = {};
    for (const row of arAgg) {
      const key = row.costCenterId ?? '__null__';
      revenueByCc[key] = Number(row._sum.amount ?? 0);
    }
    for (const row of apAgg) {
      const key = row.costCenterId ?? '__null__';
      expenseByCc[key] = Number(row._sum.amount ?? 0);
    }

    const rows: CostCenterReportRow[] = costCenters.map((cc) => {
      const revenue = revenueByCc[cc.id] ?? 0;
      const expense = expenseByCc[cc.id] ?? 0;
      return {
        costCenterId: cc.id,
        costCenterCode: cc.code,
        costCenterName: cc.name,
        revenue,
        expense,
        balance: revenue - expense,
      };
    });

    const nullRevenue = revenueByCc['__null__'] ?? 0;
    const nullExpense = expenseByCc['__null__'] ?? 0;
    if (nullRevenue > 0 || nullExpense > 0) {
      rows.push({
        costCenterId: null,
        costCenterCode: '—',
        costCenterName: 'Sem centro de custo',
        revenue: nullRevenue,
        expense: nullExpense,
        balance: nullRevenue - nullExpense,
      });
    }

    return rows.sort((a, b) =>
      a.costCenterId == null ? 1 : b.costCenterId == null ? -1 : a.costCenterCode.localeCompare(b.costCenterCode),
    );
  }
}
