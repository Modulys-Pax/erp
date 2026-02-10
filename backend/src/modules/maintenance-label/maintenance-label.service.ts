import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateMaintenanceLabelDto } from './dto/create-maintenance-label.dto';
import { RegisterProductChangeDto } from './dto/register-product-change.dto';
import {
  MaintenanceLabelResponseDto,
  MaintenanceLabelProductResponseDto,
} from './dto/maintenance-label-response.dto';
import {
  MaintenanceDueByVehicleDto,
  MaintenanceDueItemDto,
  MaintenanceDueStatus,
} from './dto/maintenance-due-by-vehicle.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { getPrimaryPlate } from '../../shared/utils/vehicle-plate.util';
import { roundCurrency } from '../../shared/utils/decimal.util';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';
import { AccountPayableService } from '../account-payable/account-payable.service';

@Injectable()
export class MaintenanceLabelService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AccountPayableService))
    private accountPayableService: AccountPayableService,
  ) {}

  async create(
    createMaintenanceLabelDto: CreateMaintenanceLabelDto,
    userId?: string,
    user?: any,
  ): Promise<MaintenanceLabelResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;

    // Validar acesso por filial
    if (user) {
      validateBranchAccess(user.branchId, user.role, createMaintenanceLabelDto.branchId, undefined);
    }

    // Verificar se veículo existe e carregar itens configurados para troca por KM
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: createMaintenanceLabelDto.vehicleId,
        companyId,
        deletedAt: null,
      },
      include: { replacementItems: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // Verificar se filial existe
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: createMaintenanceLabelDto.branchId,
        companyId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    const allItemIds = (vehicle.replacementItems ?? []).map((r) => r.id);
    if (allItemIds.length === 0) {
      throw new BadRequestException(
        'Este veículo não possui itens de troca por KM configurados. Cadastre-os na edição do veículo.',
      );
    }

    // productIds = itens SELECIONADOS (trocados agora) — ao menos um obrigatório
    const dtoProductIds = createMaintenanceLabelDto.productIds;
    const selectedProductIds: string[] =
      dtoProductIds && dtoProductIds.length > 0 ? dtoProductIds : allItemIds;
    const selectedSet = new Set(selectedProductIds);

    const vehicleItemIds = new Set(allItemIds);
    const invalidIds = selectedProductIds.filter((id) => !vehicleItemIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'Um ou mais itens não estão configurados para troca por KM neste veículo. Cadastre-os na edição do veículo.',
      );
    }

    /**
     * REGRA: Para produtos selecionados (trocados agora), usa a KM ATUAL do veículo.
     * A etiqueta NÃO atualiza a KM do veículo - isso é feito por Marcação ou Troca na Estrada.
     */
    const referenceKm = vehicle.currentKm ?? 0;

    const label = await this.prisma.$transaction(async (tx) => {
      const newLabel = await tx.maintenanceLabel.create({
        data: {
          companyId,
          branchId: createMaintenanceLabelDto.branchId,
          createdBy: userId,
          vehicles: {
            create: { vehicleId: createMaintenanceLabelDto.vehicleId },
          },
        },
      });

      // Etiqueta inclui TODOS os itens do veículo
      for (const vehicleReplacementItemId of allItemIds) {
        const wasSelected = selectedSet.has(vehicleReplacementItemId);

        let lastChangeKm: number;
        if (wasSelected) {
          // Selecionado = trocado agora — atualiza com KM atual do veículo
          lastChangeKm = referenceKm;
        } else {
          // Não selecionado = não trocou — busca a última KM desse produto específico
          const lastChange = await tx.maintenanceLabelReplacementItem.findFirst({
            where: {
              vehicleReplacementItemId,
              maintenanceLabel: { vehicles: { some: { vehicleId: createMaintenanceLabelDto.vehicleId } } },
            },
            orderBy: { createdAt: 'desc' },
          });
          // Se nunca foi trocado, usa KM atual do veículo como referência inicial
          lastChangeKm = lastChange?.lastChangeKm ?? referenceKm;
        }

        await tx.maintenanceLabelReplacementItem.create({
          data: {
            maintenanceLabelId: newLabel.id,
            vehicleReplacementItemId,
            lastChangeKm,
            updatedInThisLabel: wasSelected,
            createdBy: userId,
          },
        });
      }

      return { label: newLabel };
    });

    return this.findById(label.label.id);
  }

  async findAll(
    branchId?: string,
    vehicleId?: string,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponseDto<MaintenanceLabelResponseDto>> {
    const skip = (page - 1) * limit;
    const companyId = DEFAULT_COMPANY_ID;

    const where: Prisma.MaintenanceLabelWhereInput = {
      companyId,
      ...(branchId ? { branchId } : {}),
      ...(vehicleId ? { vehicles: { some: { vehicleId } } } : {}),
    };

    const [labels, total] = await Promise.all([
      this.prisma.maintenanceLabel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicles: {
            include: {
              vehicle: {
                include: {
                  plate: true,
                  replacementItems: true,
                },
              },
            },
          },
          replacementItems: {
            include: { vehicleReplacementItem: true },
          },
        },
      }),
      this.prisma.maintenanceLabel.count({ where }),
    ]);

    return {
      data: labels.map((label) => this.mapToResponse(label)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<MaintenanceLabelResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;

    const label = await this.prisma.maintenanceLabel.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        vehicles: {
          include: {
            vehicle: {
              include: {
                plate: true,
                replacementItems: true,
              },
            },
          },
        },
        replacementItems: {
          include: { vehicleReplacementItem: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!label) {
      throw new NotFoundException('Etiqueta não encontrada');
    }

    return this.mapToResponse(label);
  }

  /**
   * Retorna, por veículo, a lista de itens com troca por KM (cadastrados no veículo)
   * e o status (ok / warning ~10% antes / due vencido), usando a KM de referência
   * (última marcação ou KM atual do veículo).
   */
  async getMaintenanceDueByVehicle(
    vehicleId: string,
    branchId?: string,
  ): Promise<MaintenanceDueByVehicleDto> {
    const companyId = DEFAULT_COMPANY_ID;

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId, deletedAt: null },
      include: { replacementItems: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    const lastMarking = await this.prisma.vehicleMarking.findFirst({
      where: {
        vehicles: { some: { vehicleId } },
        companyId,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const referenceKm = lastMarking?.km ?? vehicle.currentKm ?? 0;
    const items: MaintenanceDueItemDto[] = [];

    for (const ri of vehicle.replacementItems ?? []) {
      const lastChange = await this.prisma.maintenanceLabelReplacementItem.findFirst({
        where: {
          vehicleReplacementItemId: ri.id,
          maintenanceLabel: { vehicles: { some: { vehicleId } } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Se nunca foi trocado, usa KM atual do veículo como referência inicial
      const lastChangeKm = lastChange?.lastChangeKm ?? referenceKm;
      const replaceEveryKm = ri.replaceEveryKm;
      const nextChangeKm = lastChangeKm + replaceEveryKm;

      let status: MaintenanceDueStatus = 'ok';
      if (referenceKm >= nextChangeKm) {
        status = 'due';
      } else {
        const warningThreshold = nextChangeKm - replaceEveryKm * 0.1;
        if (referenceKm >= warningThreshold) status = 'warning';
      }

      items.push({
        productId: ri.id,
        productName: ri.name,
        id: ri.id,
        replaceEveryKm,
        lastChangeKm,
        nextChangeKm,
        status,
      });
    }

    return { referenceKm, items };
  }

  async delete(id: string): Promise<void> {
    const companyId = DEFAULT_COMPANY_ID;

    const label = await this.prisma.maintenanceLabel.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!label) {
      throw new NotFoundException('Etiqueta não encontrada');
    }

    await this.prisma.maintenanceLabel.delete({
      where: { id },
    });
  }

  /**
   * Registra troca de produto realizada na estrada.
   * A KM informada passa a ser a última troca daquele produto naquele veículo.
   * Na próxima etiqueta, o cálculo usará essa KM; não é necessário "KM certa" — pode ser 80k, 120k, etc.
   */
  async registerProductChange(
    registerProductChangeDto: RegisterProductChangeDto,
    userId?: string,
    user?: any,
  ): Promise<{ orderId: string }> {
    const companyId = DEFAULT_COMPANY_ID;

    // Validar acesso por filial
    if (user) {
      validateBranchAccess(user.branchId, user.role, registerProductChangeDto.branchId, undefined);
    }

    // Validar veículos (1 a 4 placas)
    const uniqueIds = [...new Set(registerProductChangeDto.vehicleIds)];
    if (uniqueIds.length !== registerProductChangeDto.vehicleIds.length) {
      throw new BadRequestException('Não repita o mesmo veículo/placa.');
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        id: { in: registerProductChangeDto.vehicleIds },
        companyId,
        deletedAt: null,
      },
    });

    if (vehicles.length !== registerProductChangeDto.vehicleIds.length) {
      throw new NotFoundException('Um ou mais veículos não foram encontrados.');
    }

    // Validar cada item: deve ser vehicleReplacementItemId de um dos veículos
    const replacementItems = await this.prisma.vehicleReplacementItem.findMany({
      where: {
        vehicleId: { in: registerProductChangeDto.vehicleIds },
        id: { in: registerProductChangeDto.items.map((i) => i.vehicleReplacementItemId) },
      },
    });

    if (replacementItems.length !== registerProductChangeDto.items.length) {
      throw new BadRequestException(
        'Item(ns) não configurado(s) para troca por KM nos veículos selecionados. Cadastre na edição do veículo.',
      );
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: registerProductChangeDto.branchId,
        companyId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    const totalCost = roundCurrency(
      registerProductChangeDto.items.reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            item.cost !== undefined && Number.isFinite(Number(item.cost))
              ? roundCurrency(Number(item.cost))
              : 0,
          ),
        0,
      ),
    );

    const itemNames = replacementItems.map((r) => r.name).join(', ');
    const observations =
      registerProductChangeDto.items.length === 1
        ? `${itemNames} trocado na estrada (KM ${registerProductChangeDto.changeKm.toLocaleString('pt-BR')})`
        : `${registerProductChangeDto.items.length} itens trocados na estrada (KM ${registerProductChangeDto.changeKm.toLocaleString('pt-BR')}): ${itemNames}`;

    return this.prisma.$transaction(async (tx) => {
      const label = await tx.maintenanceLabel.create({
        data: {
          companyId,
          branchId: registerProductChangeDto.branchId,
          createdBy: userId,
          vehicles: {
            create: registerProductChangeDto.vehicleIds.map((vehicleId) => ({ vehicleId })),
          },
        },
      });

      for (const item of registerProductChangeDto.items) {
        await (tx as any).maintenanceLabelReplacementItem.create({
          data: {
            maintenanceLabelId: label.id,
            vehicleReplacementItemId: item.vehicleReplacementItemId,
            lastChangeKm: registerProductChangeDto.changeKm,
            updatedInThisLabel: true,
            createdBy: userId,
          },
        });
      }

      await tx.vehicle.updateMany({
        where: { id: { in: registerProductChangeDto.vehicleIds } },
        data: { currentKm: registerProductChangeDto.changeKm },
      });

      const orderNumber = await this.generateOrderNumber(
        tx,
        companyId,
        registerProductChangeDto.branchId,
      );

      const serviceDate =
        registerProductChangeDto.serviceDate &&
        !Number.isNaN(Date.parse(registerProductChangeDto.serviceDate))
          ? new Date(registerProductChangeDto.serviceDate)
          : null;

      const newOrder = await tx.maintenanceOrder.create({
        data: {
          orderNumber,
          vehicles: {
            create: registerProductChangeDto.vehicleIds.map((vehicleId) => ({ vehicleId })),
          },
          type: 'PREVENTIVE',
          status: 'COMPLETED',
          kmAtEntry: registerProductChangeDto.changeKm,
          serviceDate,
          description: 'Troca na estrada',
          observations,
          totalCost,
          companyId,
          branchId: registerProductChangeDto.branchId,
          createdBy: userId,
        },
      });

      for (const vehicleId of registerProductChangeDto.vehicleIds) {
        const v = vehicles.find((x) => x.id === vehicleId);
        await tx.vehicleStatusHistory.create({
          data: {
            vehicleId,
            status: v?.status ?? 'ACTIVE',
            km: registerProductChangeDto.changeKm,
          notes: observations,
            maintenanceOrderId: newOrder.id,
            createdBy: userId,
          },
        });
      }

      // Criar conta a pagar se houver custo
      if (totalCost > 0) {
        const vehiclePlate = await tx.vehiclePlate.findFirst({
          where: { vehicleId: registerProductChangeDto.vehicleIds[0] },
        });
        const plateStr = vehiclePlate?.plate ?? 'Veículo';

        await tx.accountPayable.create({
          data: {
            description: `Troca na estrada - ${plateStr} (${itemNames})`,
            amount: totalCost,
            dueDate: serviceDate || new Date(),
            originType: 'MAINTENANCE',
            originId: newOrder.id,
            companyId,
            branchId: registerProductChangeDto.branchId,
            status: 'PENDING',
            createdBy: userId,
          },
        });
      }

      return { orderId: newOrder.id };
    });
  }

  private async generateOrderNumber(tx: any, companyId: string, branchId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OM-${year}`;

    const lastOrder = await tx.maintenanceOrder.findFirst({
      where: {
        companyId,
        branchId,
        orderNumber: { startsWith: prefix },
        deletedAt: null,
      },
      orderBy: { orderNumber: 'desc' },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2] || '0', 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(3, '0')}`;
  }

  private mapToResponse(label: any): MaintenanceLabelResponseDto {
    const firstVehicle = label.vehicles?.[0]?.vehicle;
    const replacementByItem = (firstVehicle?.replacementItems ?? []).reduce(
      (acc: Record<string, number>, r: { id: string; replaceEveryKm: number }) => {
        acc[r.id] = r.replaceEveryKm;
        return acc;
      },
      {},
    );

    const items = (label.replacementItems ?? []).map((lr: any) => {
      const ri = lr.vehicleReplacementItem;
      const replaceEveryKm = replacementByItem[lr.vehicleReplacementItemId];
      const lastChangeKm = lr.lastChangeKm;
      const nextChangeKm = replaceEveryKm != null ? lastChangeKm + replaceEveryKm : lastChangeKm;
      return {
        id: lr.id,
        productId: lr.vehicleReplacementItemId,
        productName: ri?.name ?? '',
        replaceEveryKm: replaceEveryKm != null ? Number(replaceEveryKm) : undefined,
        lastChangeKm,
        nextChangeKm,
        updatedInThisLabel: lr.updatedInThisLabel ?? true,
      };
    });

    return {
      id: label.id,
      vehicleId: label.vehicles?.[0]?.vehicleId ?? '',
      vehiclePlate: firstVehicle ? getPrimaryPlate(firstVehicle) : '',
      companyId: label.companyId,
      branchId: label.branchId,
      createdAt: label.createdAt,
      createdBy: label.createdBy,
      products: items,
    };
  }
}
