import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripResponseDto } from './dto/trip-response.dto';
import { CreateTripExpenseTypeDto } from './dto/create-trip-expense-type.dto';
import { TripExpenseTypeResponseDto } from './dto/trip-expense-type-response.dto';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { TripExpenseResponseDto } from './dto/trip-expense-response.dto';
import { TripDetailResponseDto } from './dto/trip-detail-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';

@Injectable()
export class TripService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreateTripDto,
    userId?: string,
    user?: any,
  ): Promise<TripResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;

    if (user) {
      validateBranchAccess(user.branchId, user.role, createDto.branchId, undefined);
    }

    const primaryVehicleId = createDto.vehicleIds[0];
    const [customer, primaryVehicle, driver] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: createDto.customerId, deletedAt: null },
      }),
      this.prisma.vehicle.findFirst({
        where: { id: primaryVehicleId, deletedAt: null },
        include: { plate: true },
      }),
      this.prisma.employee.findFirst({
        where: { id: createDto.driverId, deletedAt: null },
      }),
    ]);

    if (!customer) throw new NotFoundException('Cliente não encontrado');
    if (!primaryVehicle) throw new NotFoundException('Veículo não encontrado');
    if (!driver) throw new NotFoundException('Motorista não encontrado');

    const branch = await this.prisma.branch.findFirst({
      where: { id: createDto.branchId, companyId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Filial não encontrada');

    const trip = await this.prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          customerId: createDto.customerId,
          vehicleId: primaryVehicleId,
          driverId: createDto.driverId,
          origin: createDto.origin,
          destination: createDto.destination,
          freightValue: createDto.freightValue,
          status: (createDto.status as any) ?? 'DRAFT',
          scheduledDepartureAt: createDto.scheduledDepartureAt
            ? new Date(createDto.scheduledDepartureAt)
            : undefined,
          scheduledArrivalAt: createDto.scheduledArrivalAt
            ? new Date(createDto.scheduledArrivalAt)
            : undefined,
          actualDepartureAt: createDto.actualDepartureAt
            ? new Date(createDto.actualDepartureAt)
            : undefined,
          actualArrivalAt: createDto.actualArrivalAt
            ? new Date(createDto.actualArrivalAt)
            : undefined,
          notes: createDto.notes,
          companyId,
          branchId: createDto.branchId,
          createdBy: userId,
        },
      });

      // Gerar Conta a Receber com status Prevista (PLANNED)
      const dueDate =
        createDto.scheduledArrivalAt != null
          ? new Date(createDto.scheduledArrivalAt)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const cr = await tx.accountReceivable.create({
        data: {
          description: `Frete: ${createDto.origin} → ${createDto.destination}`,
          amount: createDto.freightValue,
          dueDate,
          status: 'PLANNED',
          originType: 'TRIP',
          originId: created.id,
          customerId: createDto.customerId,
          companyId,
          branchId: createDto.branchId,
          createdBy: userId,
        },
      });

      await tx.trip.update({
        where: { id: created.id },
        data: { accountReceivableId: cr.id },
      });

      await (tx as unknown as { tripVehicle: { createMany: (args: { data: { tripId: string; vehicleId: string }[] }) => Promise<unknown> } }).tripVehicle.createMany({
        data: createDto.vehicleIds.map((vehicleId) => ({
          tripId: created.id,
          vehicleId,
        })),
      });

      return tx.trip.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          customer: true,
          vehicle: { include: { plate: true } },
          vehicles: { include: { vehicle: { include: { plate: true } } } },
          driver: true,
          accountReceivable: true,
        } as any,
      });
    });

    return this.mapToResponse(trip!);
  }

  async findAll(
    branchId?: string,
    vehicleId?: string,
    customerId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    user?: any,
  ): Promise<TripResponseDto[]> {
    const companyId = DEFAULT_COMPANY_ID;
    if (user) {
      validateBranchAccess(user.branchId, user.role, branchId, undefined);
    }

    const where: Prisma.TripWhereInput = { deletedAt: null };
    if (branchId) where.branchId = branchId;
    if (vehicleId) {
      (where as any).OR = [
        { vehicleId },
        { vehicles: { some: { vehicleId } } },
      ];
    }
    if (customerId) where.customerId = customerId;
    if (status) where.status = status as any;

    if (startDate || endDate) {
      const dateConditions: Prisma.TripWhereInput[] = [];
      if (startDate) {
        const start = new Date(startDate);
        dateConditions.push({
          OR: [
            { scheduledDepartureAt: { gte: start } },
            { scheduledArrivalAt: { gte: start } },
          ],
        });
      }
      if (endDate) {
        const end = new Date(endDate);
        dateConditions.push({
          OR: [
            { scheduledDepartureAt: { lte: end } },
            { scheduledArrivalAt: { lte: end } },
          ],
        });
      }
      if (dateConditions.length > 0) {
        const existingAnd = Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : [];
        where.AND = [...existingAnd, ...dateConditions];
      }
    }

    const trips = await this.prisma.trip.findMany({
      where: { ...where, companyId },
      include: {
        customer: true,
        vehicle: { include: { plate: true } },
        vehicles: { include: { vehicle: { include: { plate: true } } } },
        driver: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    });

    return trips.map((t) => this.mapToResponse(t));
  }

  async findOne(id: string, user?: any): Promise<TripDetailResponseDto> {
    const trip = await this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        vehicle: { include: { plate: true } },
        vehicles: { include: { vehicle: { include: { plate: true } } } },
        driver: true,
        accountReceivable: true,
        expenses: {
          include: { tripExpenseType: true },
        },
      } as any,
    });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    if (user) {
      validateBranchAccess(user.branchId, user.role, trip.branchId, undefined);
    }
    return this.mapToDetailResponse(trip);
  }

  /** Lucro = valor do frete - soma das despesas. Margem % = (lucro / frete) * 100 */
  private computeTripFinancials(trip: { freightValue: any; expenses?: { amount: any }[] }) {
    const freight = Number(trip.freightValue);
    const totalExpenses =
      trip.expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
    const profit = Math.max(0, freight - totalExpenses);
    const marginPercent = freight > 0 ? (profit / freight) * 100 : 0;
    return { totalExpenses, profit, marginPercent };
  }

  async createExpense(
    tripId: string,
    dto: CreateTripExpenseDto,
    userId?: string,
    user?: any,
  ): Promise<TripExpenseResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;

    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      include: { vehicle: { include: { plate: true } } },
    });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    if (user) {
      validateBranchAccess(user.branchId, user.role, trip.branchId, undefined);
    }

    const type = await this.prisma.tripExpenseType.findFirst({
      where: { id: dto.tripExpenseTypeId, deletedAt: null },
    });
    if (!type) throw new NotFoundException('Tipo de despesa não encontrado');

    const amount = Number(dto.amount);
    const expenseDate = new Date(dto.expenseDate);
    const plateStr = trip.vehicle?.plate?.plate ?? trip.vehicleId;

    const created = await this.prisma.$transaction(async (tx) => {
      const ap = await tx.accountPayable.create({
        data: {
          description: `Viagem ${trip.origin} → ${trip.destination} - ${type.name}`,
          amount,
          dueDate: expenseDate,
          status: 'PENDING',
          originType: 'TRIP',
          originId: tripId,
          vehicleId: trip.vehicleId,
          costCenterId: dto.costCenterId ?? undefined,
          companyId,
          branchId: trip.branchId,
          createdBy: userId,
        },
      });

      const expense = await tx.tripExpense.create({
        data: {
          tripId,
          tripExpenseTypeId: dto.tripExpenseTypeId,
          amount,
          description: dto.description,
          expenseDate,
          vehicleId: trip.vehicleId,
          accountPayableId: ap.id,
          costCenterId: dto.costCenterId ?? undefined,
          companyId,
          branchId: trip.branchId,
          createdBy: userId,
        },
        include: { tripExpenseType: true },
      });
      return expense;
    });

    return this.mapExpenseToResponse(created);
  }

  async findExpensesByTrip(
    tripId: string,
    user?: any,
  ): Promise<TripExpenseResponseDto[]> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
    });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    if (user) {
      validateBranchAccess(user.branchId, user.role, trip.branchId, undefined);
    }

    const list = await this.prisma.tripExpense.findMany({
      where: { tripId },
      include: { tripExpenseType: true },
      orderBy: { expenseDate: 'desc' },
    });
    return list.map((e) => this.mapExpenseToResponse(e));
  }

  /**
   * Lucro acumulado por veículo no período (apenas viagens concluídas).
   * Lucro = Receita viagens - Despesas viagem - Custos manutenção (OS).
   */
  async getVehicleProfit(
    vehicleId: string,
    startDate?: string,
    endDate?: string,
    user?: any,
  ): Promise<{
    vehicleId: string;
    revenue: number;
    tripExpenses: number;
    maintenanceCosts: number;
    profit: number;
    marginPercent: number;
  }> {
    const companyId = DEFAULT_COMPANY_ID;

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, vehicle.branchId, undefined);
    }

    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date(9999, 11, 31);

    const trips = await this.prisma.trip.findMany({
      where: {
        vehicleId,
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

    let revenue = 0;
    let tripExpensesSum = 0;
    for (const t of trips) {
      revenue += Number(t.freightValue);
      tripExpensesSum += t.expenses.reduce((s, e) => s + Number(e.amount), 0);
    }

    const maintenanceCp = await this.prisma.accountPayable.findMany({
      where: {
        vehicleId,
        deletedAt: null,
        originType: 'MAINTENANCE',
        ...(startDate || endDate
          ? {
              dueDate: {
                ...(startDate ? { gte: start } : {}),
                ...(endDate ? { lte: end } : {}),
              },
            }
          : {}),
      },
    });
    const maintenanceCosts = maintenanceCp.reduce(
      (s, ap) => s + Number(ap.amount),
      0,
    );

    const profit = revenue - tripExpensesSum - maintenanceCosts;
    const marginPercent =
      revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      vehicleId,
      revenue,
      tripExpenses: tripExpensesSum,
      maintenanceCosts,
      profit,
      marginPercent: Math.round(marginPercent * 100) / 100,
    };
  }

  async removeExpense(
    tripId: string,
    expenseId: string,
    user?: any,
  ): Promise<void> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
    });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    if (user) {
      validateBranchAccess(user.branchId, user.role, trip.branchId, undefined);
    }

    const expense = await this.prisma.tripExpense.findFirst({
      where: { id: expenseId, tripId },
    });
    if (!expense) throw new NotFoundException('Despesa não encontrada');

    await this.prisma.$transaction(async (tx) => {
      if (expense.accountPayableId) {
        await tx.accountPayable.update({
          where: { id: expense.accountPayableId },
          data: { originId: null, originType: null },
        });
      }
      await tx.tripExpense.delete({ where: { id: expenseId } });
    });
  }

  async update(
    id: string,
    updateDto: UpdateTripDto,
    userId?: string,
    user?: any,
  ): Promise<TripResponseDto> {
    const existing = await this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
      include: { accountReceivable: true },
    });
    if (!existing) throw new NotFoundException('Viagem não encontrada');
    if (user) {
      validateBranchAccess(user.branchId, user.role, existing.branchId, undefined);
    }

    const becameCompleted =
      updateDto.status === 'COMPLETED' && existing.status !== 'COMPLETED';

    const trip = await this.prisma.$transaction(async (tx) => {
      if (becameCompleted && existing.accountReceivableId) {
        await tx.accountReceivable.update({
          where: { id: existing.accountReceivableId },
          data: { status: 'RECEIVED', receiptDate: new Date() },
        });
      }

      if (updateDto.vehicleIds !== undefined) {
        if (updateDto.vehicleIds.length < 1 || updateDto.vehicleIds.length > 4) {
          throw new BadRequestException('Selecione entre 1 e 4 placas');
        }
        const txPrisma = tx as unknown as { tripVehicle: { deleteMany: (args: { where: { tripId: string } }) => Promise<unknown>; createMany: (args: { data: { tripId: string; vehicleId: string }[] }) => Promise<unknown> } };
        await txPrisma.tripVehicle.deleteMany({ where: { tripId: id } });
        await txPrisma.tripVehicle.createMany({
          data: updateDto.vehicleIds.map((vehicleId) => ({ tripId: id, vehicleId })),
        });
      }

      const primaryVehicleId =
        updateDto.vehicleIds?.length
          ? updateDto.vehicleIds[0]
          : undefined;

      const updated = await tx.trip.update({
        where: { id },
        data: {
          ...(updateDto.customerId && { customerId: updateDto.customerId }),
          ...(primaryVehicleId && { vehicleId: primaryVehicleId }),
          ...(updateDto.driverId && { driverId: updateDto.driverId }),
          ...(updateDto.origin && { origin: updateDto.origin }),
          ...(updateDto.destination && { destination: updateDto.destination }),
          ...(updateDto.freightValue !== undefined && { freightValue: updateDto.freightValue }),
          ...(updateDto.status && { status: updateDto.status as any }),
          ...(updateDto.scheduledDepartureAt !== undefined && {
            scheduledDepartureAt: updateDto.scheduledDepartureAt
              ? new Date(updateDto.scheduledDepartureAt)
              : null,
          }),
          ...(updateDto.scheduledArrivalAt !== undefined && {
            scheduledArrivalAt: updateDto.scheduledArrivalAt
              ? new Date(updateDto.scheduledArrivalAt)
              : null,
          }),
          ...(updateDto.actualDepartureAt !== undefined && {
            actualDepartureAt: updateDto.actualDepartureAt
              ? new Date(updateDto.actualDepartureAt)
              : null,
          }),
          ...(updateDto.actualArrivalAt !== undefined && {
            actualArrivalAt: updateDto.actualArrivalAt
              ? new Date(updateDto.actualArrivalAt)
              : null,
          }),
          ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
        },
      });

      return tx.trip.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          customer: true,
          vehicle: { include: { plate: true } },
          vehicles: { include: { vehicle: { include: { plate: true } } } },
          driver: true,
          accountReceivable: true,
        } as any,
      });
    });

    return this.mapToResponse(trip);
  }

  async remove(id: string, user?: any): Promise<void> {
    const trip = await this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
    });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    if (user) {
      validateBranchAccess(user.branchId, user.role, trip.branchId, undefined);
    }
    await this.prisma.trip.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- TripExpenseType ---
  async createExpenseType(
    dto: CreateTripExpenseTypeDto,
    userId?: string,
    user?: any,
  ): Promise<TripExpenseTypeResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;
    if (user) {
      validateBranchAccess(user.branchId, user.role, dto.branchId, undefined);
    }
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, companyId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Filial não encontrada');

    const created = await this.prisma.tripExpenseType.create({
      data: {
        name: dto.name,
        code: dto.code,
        companyId,
        branchId: dto.branchId,
        createdBy: userId,
      },
    });
    return this.mapExpenseTypeToResponse(created);
  }

  async findAllExpenseTypes(
    branchId?: string,
    user?: any,
  ): Promise<TripExpenseTypeResponseDto[]> {
    const companyId = DEFAULT_COMPANY_ID;
    if (user && branchId) {
      validateBranchAccess(user.branchId, user.role, branchId, undefined);
    }
    const where: Prisma.TripExpenseTypeWhereInput = { deletedAt: null };
    if (branchId) where.branchId = branchId;

    const list = await this.prisma.tripExpenseType.findMany({
      where: { ...where, companyId },
      orderBy: { name: 'asc' },
    });
    return list.map((t) => this.mapExpenseTypeToResponse(t));
  }

  private mapToResponse(t: any): TripResponseDto {
    const vehicleIds =
      t.vehicles?.length > 0
        ? t.vehicles.map((v: any) => v.vehicleId)
        : t.vehicleId
          ? [t.vehicleId]
          : [];
    const vehiclePlates =
      t.vehicles?.length > 0
        ? t.vehicles
            .map((v: any) => v.vehicle?.plate?.plate)
            .filter(Boolean)
        : t.vehicle?.plate?.plate
          ? [t.vehicle.plate.plate]
          : [];
    return {
      id: t.id,
      customerId: t.customerId,
      customerName: t.customer?.name,
      vehicleId: t.vehicleId,
      vehicleIds,
      vehiclePlate: t.vehicle?.plate?.plate ?? vehiclePlates[0],
      vehiclePlates,
      driverId: t.driverId,
      driverName: t.driver?.name,
      origin: t.origin,
      destination: t.destination,
      freightValue: Number(t.freightValue),
      status: t.status,
      scheduledDepartureAt: t.scheduledDepartureAt,
      scheduledArrivalAt: t.scheduledArrivalAt,
      actualDepartureAt: t.actualDepartureAt,
      actualArrivalAt: t.actualArrivalAt,
      accountReceivableId: t.accountReceivableId,
      notes: t.notes,
      companyId: t.companyId,
      branchId: t.branchId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private mapToDetailResponse(t: any): TripDetailResponseDto {
    const { totalExpenses, profit, marginPercent } =
      this.computeTripFinancials(t);
    return {
      ...this.mapToResponse(t),
      totalExpenses,
      profit,
      marginPercent: Math.round(marginPercent * 100) / 100,
      expenses: (t.expenses ?? []).map((e: any) => this.mapExpenseToResponse(e)),
    };
  }

  private mapExpenseToResponse(e: any): TripExpenseResponseDto {
    return {
      id: e.id,
      tripId: e.tripId,
      tripExpenseTypeId: e.tripExpenseTypeId,
      tripExpenseTypeName: e.tripExpenseType?.name,
      amount: Number(e.amount),
      description: e.description,
      expenseDate: e.expenseDate,
      vehicleId: e.vehicleId,
      accountPayableId: e.accountPayableId,
      costCenterId: e.costCenterId,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  private mapExpenseTypeToResponse(t: any): TripExpenseTypeResponseDto {
    return {
      id: t.id,
      name: t.name,
      code: t.code,
      active: t.active,
      companyId: t.companyId,
      branchId: t.branchId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
