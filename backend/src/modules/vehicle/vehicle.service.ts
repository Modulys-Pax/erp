import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { UpdateVehicleKmDto } from './dto/update-vehicle-km.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { VehicleStatusHistoryResponseDto } from './dto/vehicle-status-history-response.dto';
import {
  VehicleCostsResponseDto,
  VehicleCostDetailDto,
  VehicleCostsSummaryDto,
} from './dto/vehicle-costs-response.dto';
import { VehicleStatus, VehiclePlateType } from '@prisma/client';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { getPrimaryPlate } from '../../shared/utils/vehicle-plate.util';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';

@Injectable()
export class VehicleService {
  constructor(private prisma: PrismaService) {}

  async create(
    createVehicleDto: CreateVehicleDto,
    userId?: string,
    user?: any,
  ): Promise<VehicleResponseDto> {
    // Usar DEFAULT_COMPANY_ID (single-tenant)
    const companyId = DEFAULT_COMPANY_ID;

    // Validar acesso por filial (não-admin só cria na própria filial)
    // O interceptor já força o branchId no body, mas validamos aqui também por segurança
    if (user) {
      validateBranchAccess(user.branchId, user.role, createVehicleDto.branchId, undefined);
    }

    // Verificar se empresa existe
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: createVehicleDto.branchId,
        companyId: companyId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    // Verificar se a placa já existe na filial (em outro veículo)
    const plateItem = createVehicleDto.plate;
    const existingPlate = await this.prisma.vehiclePlate.findFirst({
      where: {
        plate: plateItem.plate.trim(),
        vehicle: {
          companyId,
          branchId: createVehicleDto.branchId,
          deletedAt: null,
        },
      },
    });
    if (existingPlate) {
      throw new ConflictException(`Placa ${plateItem.plate} já cadastrada para esta empresa/filial`);
    }

    const {
      plate: plateInput,
      replacementItems: replacementInput,
      ...vehicleData
    } = createVehicleDto;

    const vehicle = await this.prisma.vehicle.create({
      data: {
        ...vehicleData,
        companyId: companyId,
        status: (createVehicleDto.status as VehicleStatus) || VehicleStatus.ACTIVE,
        createdBy: userId,
        plate: {
          create: {
            type: plateInput.type as VehiclePlateType,
            plate: plateInput.plate.trim(),
          },
        },
        ...(replacementInput?.length
          ? {
              replacementItems: {
                create: replacementInput.map((r) => ({
                  name: r.name.trim(),
                  replaceEveryKm: r.replaceEveryKm,
                })),
              },
            }
          : {}),
      } as any,
      include: {
        brand: true,
        model: true,
        plate: true,
        replacementItems: true,
      },
    });

    // Criar histórico inicial se status ou KM foram informados
    if (createVehicleDto.status || createVehicleDto.currentKm) {
      await this.prisma.vehicleStatusHistory.create({
        data: {
          vehicleId: vehicle.id,
          status: (createVehicleDto.status as any) || 'ACTIVE',
          km: createVehicleDto.currentKm,
          notes: 'Cadastro inicial',
          createdBy: userId,
        },
      });
    }

    return this.mapToResponse(vehicle);
  }

  async findAll(
    branchId?: string,
    includeDeleted = false,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponseDto<VehicleResponseDto>> {
    const skip = (page - 1) * limit;
    const companyId = DEFAULT_COMPANY_ID;

    const where: Prisma.VehicleWhereInput = {
      companyId,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(branchId ? { branchId } : {}),
    };

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        include: {
          brand: true,
          model: true,
          plate: true,
          replacementItems: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: vehicles.map((vehicle) => this.mapToResponse(vehicle)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user?: any): Promise<VehicleResponseDto> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        brand: true,
        model: true,
        plate: true,
        replacementItems: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, vehicle.branchId);
    }

    return this.mapToResponse(vehicle);
  }

  /**
   * Lista todas as placas cadastradas na filial (para seleção de composição em manutenção, marcação, etc.)
   */
  async getPlatesByBranch(branchId: string | undefined, user?: any): Promise<{ plate: string; type: VehiclePlateType }[]> {
    if (!branchId) {
      return [];
    }
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, branchId);
    }
    const plates = await this.prisma.vehiclePlate.findMany({
      where: {
        vehicle: {
          branchId,
          companyId: DEFAULT_COMPANY_ID,
          deletedAt: null,
          active: true,
        },
      },
      select: { plate: true, type: true },
      orderBy: [{ type: 'asc' }, { plate: 'asc' }],
    });
    return plates.map((p) => ({ plate: p.plate, type: p.type as VehiclePlateType }));
  }

  async update(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
    userId?: string,
    user?: any,
  ): Promise<VehicleResponseDto> {
    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingVehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(
        user.branchId,
        user.role,
        updateVehicleDto.branchId,
        existingVehicle.branchId,
      );
    }

    if (updateVehicleDto.companyId || updateVehicleDto.branchId) {
      const companyId = updateVehicleDto.companyId || existingVehicle.companyId;
      const branchId = updateVehicleDto.branchId || existingVehicle.branchId;

      const company = await this.prisma.company.findFirst({
        where: {
          id: companyId,
          deletedAt: null,
        },
      });

      if (!company) {
        throw new NotFoundException('Empresa não encontrada');
      }

      const branch = await this.prisma.branch.findFirst({
        where: {
          id: branchId,
          companyId,
          deletedAt: null,
        },
      });

      if (!branch) {
        throw new NotFoundException('Filial não encontrada');
      }
    }

    // Atualizar placa se enviada (1 placa por veículo)
    if (updateVehicleDto.plate !== undefined) {
      const plateItem = updateVehicleDto.plate;
      const branchId = updateVehicleDto.branchId ?? existingVehicle.branchId;
      const existingPlate = await this.prisma.vehiclePlate.findFirst({
        where: {
          plate: plateItem.plate.trim(),
          vehicle: {
            companyId: existingVehicle.companyId,
            branchId,
            deletedAt: null,
          },
          NOT: { vehicleId: id },
        },
      });
      if (existingPlate) {
        throw new ConflictException(`Placa ${plateItem.plate} já cadastrada para esta empresa/filial`);
      }
      await this.prisma.vehiclePlate.deleteMany({ where: { vehicleId: id } });
      await this.prisma.vehiclePlate.create({
        data: {
          vehicleId: id,
          type: plateItem.type as VehiclePlateType,
          plate: plateItem.plate.trim(),
        },
      });
    }

    if (updateVehicleDto.replacementItems !== undefined) {
      const replacementInput = updateVehicleDto.replacementItems;
      await this.prisma.vehicleReplacementItem.deleteMany({ where: { vehicleId: id } });
      if (replacementInput.length > 0) {
        await this.prisma.vehicleReplacementItem.createMany({
          data: replacementInput.map((r) => ({
            vehicleId: id,
            name: r.name.trim(),
            replaceEveryKm: r.replaceEveryKm,
          })) as any,
        });
      }
    }

    // Verificar se status ou KM mudaram para criar histórico
    const statusChanged =
      updateVehicleDto.status && updateVehicleDto.status !== existingVehicle.status;
    const kmChanged =
      updateVehicleDto.currentKm !== undefined &&
      updateVehicleDto.currentKm !== existingVehicle.currentKm;

    // Excluir campos que não devem ser atualizados (plate e replacementItems já tratados acima)
    const {
      companyId,
      branchId,
      status,
      plate: _plate,
      replacementItems: _replacementItems,
      ...restData
    } = updateVehicleDto;

    // Preparar dados de atualização
    const updateData: any = { ...restData };

    // Converter status string para enum se fornecido
    if (status !== undefined) {
      updateData.status = status as VehicleStatus;
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        brand: true,
        model: true,
        plate: true,
        replacementItems: true,
      },
    });

    // Criar histórico se status ou KM mudaram
    if (statusChanged || kmChanged) {
      await this.prisma.vehicleStatusHistory.create({
        data: {
          vehicleId: vehicle.id,
          status: (updateVehicleDto.status as any) || existingVehicle.status,
          km: updateVehicleDto.currentKm ?? existingVehicle.currentKm ?? null,
          notes: statusChanged
            ? `Status alterado de ${existingVehicle.status} para ${updateVehicleDto.status}`
            : 'Atualização de quilometragem',
          createdBy: userId,
        },
      });
    }

    return this.mapToResponse(vehicle);
  }

  async remove(id: string, user?: any): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, vehicle.branchId);
    }

    await this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateKm(
    id: string,
    updateKmDto: UpdateVehicleKmDto,
    userId?: string,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // Validar que a nova KM não é menor que a anterior (currentKm pode ser 0 ou null)
    const currentKmNum = vehicle.currentKm != null ? Number(vehicle.currentKm) : null;
    if (currentKmNum != null && updateKmDto.currentKm < currentKmNum) {
      throw new BadRequestException(
        `A nova quilometragem (${updateKmDto.currentKm}) não pode ser menor que a anterior (${currentKmNum})`,
      );
    }

    const updatedVehicle = await this.prisma.vehicle.update({
      where: { id },
      data: { currentKm: updateKmDto.currentKm },
      include: {
        brand: true,
        model: true,
        plate: true,
        replacementItems: true,
      },
    });

    // Criar histórico
    await this.prisma.vehicleStatusHistory.create({
      data: {
        vehicleId: id,
        status: vehicle.status,
        km: updateKmDto.currentKm,
        notes: updateKmDto.notes || 'Atualização de quilometragem',
        createdBy: userId,
      },
    });

    return this.mapToResponse(updatedVehicle);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateVehicleStatusDto,
    userId?: string,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // Validar status
    const validStatuses = ['ACTIVE', 'MAINTENANCE', 'STOPPED'];
    if (!validStatuses.includes(updateStatusDto.status)) {
      throw new BadRequestException('Status inválido');
    }

    const updatedVehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        status: updateStatusDto.status as any,
        currentKm: updateStatusDto.km ?? vehicle.currentKm,
      },
      include: {
        brand: true,
        model: true,
        plate: true,
        replacementItems: true,
      },
    });

    // Criar histórico
    await this.prisma.vehicleStatusHistory.create({
      data: {
        vehicleId: id,
        status: updateStatusDto.status as any,
        km: updateStatusDto.km ?? vehicle.currentKm ?? null,
        notes:
          updateStatusDto.notes ||
          `Status alterado de ${vehicle.status} para ${updateStatusDto.status}`,
        createdBy: userId,
      },
    });

    return this.mapToResponse(updatedVehicle);
  }

  async getStatusHistory(vehicleId: string): Promise<VehicleStatusHistoryResponseDto[]> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    const history = await this.prisma.vehicleStatusHistory.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
    });

    return history.map((item) => ({
      id: item.id,
      vehicleId: item.vehicleId,
      status: item.status,
      km: item.km ?? undefined,
      notes: item.notes ?? undefined,
      createdAt: item.createdAt,
      createdBy: item.createdBy ?? undefined,
      maintenanceOrderId: item.maintenanceOrderId ?? undefined,
    }));
  }

  /**
   * Obtém dashboard de custos com veículos
   */
  async getVehicleCosts(
    branchId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 15,
  ): Promise<VehicleCostsResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {
      companyId,
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    };

    // Buscar total de veículos
    const totalVehicles = await this.prisma.vehicle.count({ where });

    // Buscar veículos com paginação
    const vehicles = await this.prisma.vehicle.findMany({
      where,
      include: {
        model: true,
        plate: true,
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });

    // Preparar filtro de data para manutenções
    const maintenanceWhere: Prisma.MaintenanceOrderWhereInput = {
      companyId,
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    };

    if (startDate || endDate) {
      maintenanceWhere.createdAt = {};
      if (startDate) {
        maintenanceWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        maintenanceWhere.createdAt.lte = endDateTime;
      }
    }

    // Calcular custos por veículo
    const vehicleCosts: VehicleCostDetailDto[] = [];
    let totalMaintenanceCost = 0;
    let totalMaterialsCost = 0;
    let totalServicesCost = 0;
    let totalMaintenanceOrders = 0;

    for (const vehicle of vehicles) {
      // Buscar todas as ordens de manutenção do veículo
      const orders = await this.prisma.maintenanceOrder.findMany({
        where: {
          ...maintenanceWhere,
          vehicles: { some: { vehicleId: vehicle.id } },
        },
        include: {
          materials: {
            include: {
              product: true,
            },
          },
          services: true,
        },
      });

      // Calcular custos
      let vehicleMaterialsCost = 0;
      let vehicleServicesCost = 0;
      let vehicleOtherCost = 0; // Custos diretos (sem materials/services detalhados)
      let vehiclePeriodCost = 0;
      let vehiclePeriodOrders = 0;

      for (const order of orders) {
        // Calcular custos da ordem atual (apenas materiais; serviços são descritivos)
        let orderMaterialsCost = 0;
        const orderWithIncludes = order as typeof order & { materials?: { totalCost?: unknown; unitCost?: unknown; quantity?: unknown }[] };

        // Custo de materiais da ordem
        for (const material of orderWithIncludes.materials || []) {
          const materialCost = material.totalCost
            ? typeof material.totalCost === 'object' && 'toNumber' in material.totalCost
              ? (material.totalCost as any).toNumber()
              : Number(material.totalCost)
            : material.unitCost && material.quantity
              ? Number(material.unitCost) * Number(material.quantity)
              : 0;
          orderMaterialsCost += materialCost;
          vehicleMaterialsCost += materialCost;
        }

        // Custo total da ordem (usar totalCost se não houver detalhamento)
        const detailedCost = orderMaterialsCost;
        const orderTotalCost = order.totalCost
          ? typeof order.totalCost === 'object' && 'toNumber' in order.totalCost
            ? (order.totalCost as any).toNumber()
            : Number(order.totalCost)
          : detailedCost;

        // Se tem totalCost mas não tem materials/services, é custo direto (ex: troca na estrada)
        if (orderTotalCost > 0 && detailedCost === 0) {
          vehicleOtherCost += orderTotalCost;
        }

        // Se tiver filtro de data, calcular apenas do período
        if (startDate || endDate) {
          const orderDate = order.createdAt;
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          end?.setHours(23, 59, 59, 999);

          if ((!start || orderDate >= start) && (!end || orderDate <= end)) {
            vehiclePeriodCost += orderTotalCost;
            vehiclePeriodOrders += 1;
          }
        } else {
          vehiclePeriodCost += orderTotalCost;
          vehiclePeriodOrders += 1;
        }
      }

      // Custo total = materials + outros (custos diretos); serviços são apenas descritivos
      const vehicleTotalCost = vehicleMaterialsCost + vehicleOtherCost;

      vehicleCosts.push({
        vehicleId: vehicle.id,
        plate: getPrimaryPlate(vehicle),
        model: vehicle.model?.name,
        totalMaintenanceCost: vehicleTotalCost,
        totalMaterialsCost: vehicleMaterialsCost,
        totalServicesCost: vehicleOtherCost, // Custos diretos (ex.: troca na estrada)
        totalMaintenanceOrders: orders.length,
        periodCost: vehiclePeriodCost,
        periodOrders: vehiclePeriodOrders,
      });

      totalMaintenanceCost += vehicleTotalCost;
      totalMaterialsCost += vehicleMaterialsCost;
      totalServicesCost += vehicleOtherCost;
      totalMaintenanceOrders += orders.length;
    }

    // Totais gerais: cada ordem conta uma vez (buscar ordens diretamente, não por veículo)
    const allOrdersForSummary = await this.prisma.maintenanceOrder.findMany({
      where: maintenanceWhere,
      include: {
        materials: true,
        services: true,
      },
    });

    let globalTotalMaintenanceCost = 0;
    let globalTotalMaterialsCost = 0;
    let globalTotalServicesCost = 0;

    for (const order of allOrdersForSummary) {
      const orderWithIncludes = order as typeof order & { materials?: { totalCost?: unknown; unitCost?: unknown; quantity?: unknown }[] };
      let orderMaterialsCost = 0;

      for (const material of orderWithIncludes.materials || []) {
        const cost = material.totalCost
          ? typeof material.totalCost === 'object' && 'toNumber' in material.totalCost
            ? (material.totalCost as any).toNumber()
            : Number(material.totalCost)
          : material.unitCost && material.quantity
            ? Number(material.unitCost) * Number(material.quantity)
            : 0;
        orderMaterialsCost += cost;
        globalTotalMaterialsCost += cost;
      }

      const detailedCost = orderMaterialsCost;
      if (detailedCost === 0 && order.totalCost) {
        const directCost =
          typeof order.totalCost === 'object' && 'toNumber' in order.totalCost
            ? (order.totalCost as any).toNumber()
            : Number(order.totalCost);
        if (directCost > 0) {
          globalTotalServicesCost += directCost;
        }
      }
    }

    globalTotalMaintenanceCost = globalTotalMaterialsCost + globalTotalServicesCost;
    const globalTotalOrders = allOrdersForSummary.length;

    const summary: VehicleCostsSummaryDto = {
      totalVehicles,
      totalMaintenanceCost: globalTotalMaintenanceCost,
      totalMaterialsCost: globalTotalMaterialsCost,
      totalServicesCost: globalTotalServicesCost,
      totalMaintenanceOrders: globalTotalOrders,
      averageCostPerVehicle: totalVehicles > 0 ? globalTotalMaintenanceCost / totalVehicles : 0,
    };

    return {
      summary,
      vehicles: {
        data: vehicleCosts,
        total: totalVehicles,
        page,
        limit,
        totalPages: Math.ceil(totalVehicles / limit),
      },
    };
  }

  private mapToResponse(vehicle: any): VehicleResponseDto {
    const plates = vehicle.plate
      ? [{ type: vehicle.plate.type, plate: vehicle.plate.plate }]
      : [];
    const replacementItems = (vehicle.replacementItems ?? []).map(
      (ri: { id: string; name: string; replaceEveryKm: number }) => ({
        id: ri.id,
        name: ri.name,
        replaceEveryKm: ri.replaceEveryKm,
      }),
    );
    return {
      id: vehicle.id,
      plate: getPrimaryPlate(vehicle),
      plates,
      replacementItems,
      brandId: vehicle.brandId ?? undefined,
      brandName: vehicle.brand?.name ?? undefined,
      modelId: vehicle.modelId ?? undefined,
      modelName: vehicle.model?.name ?? undefined,
      year: vehicle.year,
      color: vehicle.color,
      chassis: vehicle.chassis,
      renavam: vehicle.renavam,
      companyId: vehicle.companyId,
      branchId: vehicle.branchId,
      currentKm: vehicle.currentKm ?? undefined,
      status: vehicle.status,
      active: vehicle.active,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
      createdBy: vehicle.createdBy,
      deletedAt: vehicle.deletedAt,
    };
  }
}
