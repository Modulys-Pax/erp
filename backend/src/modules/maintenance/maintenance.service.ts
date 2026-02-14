import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateMaintenanceOrderDto } from './dto/create-maintenance-order.dto';
import { UpdateMaintenanceOrderDto } from './dto/update-maintenance-order.dto';
import { MaintenanceOrderResponseDto } from './dto/maintenance-order-response.dto';
import { MaintenanceActionDto } from './dto/maintenance-action.dto';
import { Prisma, TransactionOriginType } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { getPrimaryPlate } from '../../shared/utils/vehicle-plate.util';
import { roundCurrency, roundQuantity } from '../../shared/utils/decimal.util';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { AccountPayableService } from '../account-payable/account-payable.service';

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AccountPayableService))
    private accountPayableService: AccountPayableService,
  ) {}

  /**
   * Busca o custo unitário de um produto
   * Prioriza o averageCost do Stock, caso contrário usa o unitPrice do Product
   */
  private async getProductUnitCost(
    tx: Prisma.TransactionClient,
    productId: string,
    branchId: string,
  ): Promise<number> {
    // Buscar estoques do produto na filial
    const stocks = await tx.stock.findMany({
      where: {
        productId,
        branchId,
        quantity: { gt: 0 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Se houver estoque com custo médio, usar o primeiro (mais recente)
    if (stocks.length > 0 && Number(stocks[0].averageCost) > 0) {
      return Number(stocks[0].averageCost);
    }

    // Caso contrário, buscar o produto e usar o unitPrice
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (product && product.unitPrice && Number(product.unitPrice) > 0) {
      return Number(product.unitPrice);
    }

    // Fallback: retornar 0
    return 0;
  }

  /**
   * Gera o número da ordem de manutenção
   * Formato: OM-YYYY-XXX (ex: OM-2024-001)
   */
  private async generateOrderNumber(companyId: string, branchId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OM-${year}`;

    // Buscar a última ordem do ano
    const lastOrder = await this.prisma.maintenanceOrder.findFirst({
      where: {
        companyId,
        branchId,
        orderNumber: {
          startsWith: prefix,
        },
        deletedAt: null,
      },
      orderBy: {
        orderNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2] || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Calcula o tempo total em minutos baseado na timeline
   */
  private calculateTotalTime(timeline: any[]): number {
    if (!timeline || timeline.length === 0) return 0;

    let totalMinutes = 0;
    let sessionStart: Date | null = null;
    let isPaused = false;

    for (const event of timeline) {
      const eventTime = new Date(event.createdAt);

      switch (event.event) {
        case 'STARTED':
        case 'RESUMED':
          if (sessionStart && !isPaused) {
            // Se já havia uma sessão ativa, não deveria acontecer
            // Mas vamos calcular o tempo até agora
            totalMinutes += Math.floor((eventTime.getTime() - sessionStart.getTime()) / 1000 / 60);
          }
          sessionStart = eventTime;
          isPaused = false;
          break;
        case 'PAUSED':
          if (sessionStart && !isPaused) {
            // Calcular tempo da sessão até a pausa
            totalMinutes += Math.floor((eventTime.getTime() - sessionStart.getTime()) / 1000 / 60);
            isPaused = true;
          }
          break;
        case 'COMPLETED':
        case 'CANCELLED':
          if (sessionStart && !isPaused) {
            // Calcular tempo da sessão até o fim
            totalMinutes += Math.floor((eventTime.getTime() - sessionStart.getTime()) / 1000 / 60);
          }
          sessionStart = null;
          isPaused = false;
          break;
      }
    }

    // Se ainda está em execução (não pausada), calcular até agora
    if (sessionStart && !isPaused) {
      const now = new Date();
      totalMinutes += Math.floor((now.getTime() - sessionStart.getTime()) / 1000 / 60);
    }

    return totalMinutes;
  }

  /**
   * Calcula o custo total da ordem
   */
  private calculateTotalCost(order: any): number {
    // 1. Se a ordem já tem totalCost salvo e maior que 0, usar ele
    const orderTotalCost = order.totalCost
      ? typeof order.totalCost === 'object' && 'toNumber' in order.totalCost
        ? (order.totalCost as any).toNumber()
        : Number(order.totalCost)
      : 0;

    if (orderTotalCost > 0) {
      return orderTotalCost;
    }

    // 2. Se não tiver, calcular: apenas materiais (serviços são apenas descritivos)
    let total = 0;

    // Soma dos materiais: quantity * unitCost (ou unitPrice do produto)
    if (order.materials && order.materials.length > 0) {
      for (const material of order.materials) {
        // Converter quantity para number
        const quantity = material.quantity
          ? typeof material.quantity === 'object' && 'toNumber' in material.quantity
            ? (material.quantity as any).toNumber()
            : Number(material.quantity)
          : 0;

        // Pegar unitPrice do produto
        let unitPrice = 0;
        if (material.product?.unitPrice) {
          unitPrice =
            typeof material.product.unitPrice === 'object' &&
            'toNumber' in material.product.unitPrice
              ? (material.product.unitPrice as any).toNumber()
              : Number(material.product.unitPrice);
        }

        // Calcular: quantity * unitPrice
        const materialCost = quantity * unitPrice;
        total += materialCost;
      }
    }

    return total;
  }

  async create(
    createDto: CreateMaintenanceOrderDto,
    userId?: string,
    user?: any,
  ): Promise<MaintenanceOrderResponseDto> {
    // Usar DEFAULT_COMPANY_ID (single-tenant)
    const companyId = DEFAULT_COMPANY_ID;

    // Validar acesso por filial (não-admin só cria na própria filial)
    // O interceptor já força o branchId no body, mas validamos aqui também por segurança
    if (user) {
      validateBranchAccess(user.branchId, user.role, createDto.branchId, undefined);
    }

    // Validar empresa
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
        id: createDto.branchId,
        companyId: companyId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    // Validar veículos (1 a 4 placas)
    const uniqueVehicleIds = [...new Set(createDto.vehicleIds)];
    if (uniqueVehicleIds.length !== createDto.vehicleIds.length) {
      throw new BadRequestException('Não repita o mesmo veículo/placa.');
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        id: { in: createDto.vehicleIds },
        companyId: companyId,
        branchId: createDto.branchId,
        deletedAt: null,
      },
    });

    if (vehicles.length !== createDto.vehicleIds.length) {
      throw new NotFoundException(
        'Um ou mais veículos não foram encontrados ou não pertencem a esta filial.',
      );
    }

    if (!createDto.services || createDto.services.length === 0) {
      throw new BadRequestException('Informe ao menos um serviço a ser realizado na ordem.');
    }

    // Validar itens de troca por KM (replacementItemsChanged devem ser de um dos veículos)
    if (createDto.replacementItemsChanged && createDto.replacementItemsChanged.length > 0) {
      const vehicleItemIds = await this.prisma.vehicleReplacementItem.findMany({
        where: { vehicleId: { in: createDto.vehicleIds } },
        select: { id: true },
      });
      const validIds = new Set(vehicleItemIds.map((r) => r.id));
      const invalid = createDto.replacementItemsChanged.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        throw new BadRequestException(
          'Um ou mais itens de troca por KM não pertencem aos veículos selecionados.',
        );
      }
    }

    // Validar funcionários
    if (createDto.workers && createDto.workers.length > 0) {
      for (const worker of createDto.workers) {
        const employee = await this.prisma.employee.findFirst({
          where: {
            id: worker.employeeId,
            companyId: companyId,
            branchId: createDto.branchId,
            deletedAt: null,
            active: true,
          },
        });

        if (!employee) {
          throw new NotFoundException(`Funcionário ${worker.employeeId} não encontrado`);
        }
      }
    }

    // Validar produtos (materiais) e verificar estoque
    if (createDto.materials && createDto.materials.length > 0) {
      // Buscar almoxarifado padrão para validação
      let defaultWarehouse = await this.prisma.warehouse.findFirst({
        where: {
          companyId: companyId,
          branchId: createDto.branchId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultWarehouse) {
        // Se não existir, criar (será usado na transação também)
        defaultWarehouse = await this.prisma.warehouse.create({
          data: {
            code: 'DEFAULT',
            name: 'Almoxarifado Padrão',
            description: 'Almoxarifado padrão da filial',
            companyId: companyId,
            branchId: createDto.branchId,
            active: true,
          },
        });
      }

      for (const material of createDto.materials) {
        const product = await this.prisma.product.findFirst({
          where: {
            id: material.productId,
            companyId: companyId,
            branchId: createDto.branchId,
            deletedAt: null,
            active: true,
          },
        });

        if (!product) {
          throw new NotFoundException(`Produto ${material.productId} não encontrado`);
        }

        // Buscar estoque disponível no almoxarifado padrão
        const stock = await this.prisma.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId: material.productId,
              warehouseId: defaultWarehouse.id,
            },
          },
        });

        const availableStock = stock ? Number(stock.quantity) : 0;

        if (Number(material.quantity) > availableStock) {
          throw new BadRequestException(
            `Quantidade solicitada (${material.quantity}) excede o estoque disponível (${availableStock}) para o produto ${product.name}`,
          );
        }
      }
    }

    // Gerar número da ordem
    const orderNumber = await this.generateOrderNumber(companyId, createDto.branchId);

    // Criar ordem com transação (status OPEN: apenas veículo + serviços; impressão resumo disponível)
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.maintenanceOrder.create({
        data: {
          orderNumber,
          vehicles: {
            create: createDto.vehicleIds.map((vehicleId) => ({ vehicleId })),
          },
          type: createDto.type,
          status: 'OPEN',
          kmAtEntry: createDto.kmAtEntry,
          description: createDto.description,
          observations: createDto.observations,
          companyId: companyId,
          branchId: createDto.branchId,
          createdBy: userId,
        },
      });

      // Criar workers
      if (createDto.workers && createDto.workers.length > 0) {
        await tx.maintenanceWorker.createMany({
          data: createDto.workers.map((w) => ({
            maintenanceOrderId: newOrder.id,
            employeeId: w.employeeId,
            isResponsible: w.isResponsible || false,
            createdBy: userId,
          })),
        });
      }

      // Criar services
      if (createDto.services && createDto.services.length > 0) {
        await tx.maintenanceService.createMany({
          data: createDto.services.map((s) => ({
            maintenanceOrderId: newOrder.id,
            description: s.description,
            createdBy: userId,
          })),
        });
      }

      // Criar materials (opcional na abertura; quando enviado, pode vincular a serviço)
      if (createDto.materials && createDto.materials.length > 0) {
        const orderServiceIds = new Set(
          (await tx.maintenanceService.findMany({
            where: { maintenanceOrderId: newOrder.id },
            select: { id: true },
          })).map((s) => s.id),
        );
        const materialsData = await Promise.all(
          createDto.materials.map(async (m) => {
            if (m.maintenanceServiceId && !orderServiceIds.has(m.maintenanceServiceId)) {
              throw new BadRequestException(
                `Serviço ${m.maintenanceServiceId} não pertence a esta ordem`,
              );
            }
            const rawUnitCost =
              m.unitCost !== undefined && m.unitCost !== null
                ? m.unitCost
                : await this.getProductUnitCost(tx, m.productId, createDto.branchId);
            const quantity = roundQuantity(m.quantity);
            const unitCost = roundCurrency(rawUnitCost);
            const totalCost = roundCurrency(quantity * unitCost);
            return {
              maintenanceOrderId: newOrder.id,
              maintenanceServiceId: m.maintenanceServiceId ?? null,
              productId: m.productId,
              vehicleReplacementItemId: m.vehicleReplacementItemId ?? null,
              quantity,
              unitCost,
              totalCost,
              createdBy: userId,
            };
          }),
        );

        for (const data of materialsData) {
          await tx.maintenanceMaterial.create({
            data: {
              maintenanceOrderId: data.maintenanceOrderId,
              ...(data.maintenanceServiceId ? { maintenanceServiceId: data.maintenanceServiceId } : {}),
              productId: data.productId,
              ...(data.vehicleReplacementItemId
                ? { vehicleReplacementItemId: data.vehicleReplacementItemId }
                : {}),
              quantity: data.quantity,
              unitCost: data.unitCost,
              totalCost: data.totalCost,
              createdBy: data.createdBy,
            },
          });
        }

        // Consumir estoque dos materiais utilizados
        // Buscar almoxarifado padrão (primeiro criado para a filial)
        let defaultWarehouse = await tx.warehouse.findFirst({
          where: {
            companyId: companyId,
            branchId: createDto.branchId,
            deletedAt: null,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (!defaultWarehouse) {
          // Criar almoxarifado padrão se não existir
          defaultWarehouse = await tx.warehouse.create({
            data: {
              code: 'DEFAULT',
              name: 'Almoxarifado Padrão',
              description: 'Almoxarifado padrão da filial',
              companyId: companyId,
              branchId: createDto.branchId,
              active: true,
            },
          });
        }

        // Criar movimentações de saída para cada material
        for (const material of createDto.materials) {
          // Buscar produto para obter nome (para mensagens de erro)
          const product = await tx.product.findFirst({
            where: {
              id: material.productId,
              companyId: companyId,
              branchId: createDto.branchId,
              deletedAt: null,
            },
          });

          // Verificar estoque disponível
          const existingStock = await tx.stock.findUnique({
            where: {
              productId_warehouseId: {
                productId: material.productId,
                warehouseId: defaultWarehouse.id,
              },
            },
          });

          if (!existingStock) {
            throw new BadRequestException(
              `Estoque não encontrado para o produto ${product?.name || material.productId}`,
            );
          }

          const currentQuantity = Number(existingStock.quantity);
          const materialQuantity = roundQuantity(material.quantity);

          if (currentQuantity < materialQuantity) {
            throw new BadRequestException(
              `Estoque insuficiente para o produto ${product?.name || material.productId}. Disponível: ${currentQuantity}, Solicitado: ${materialQuantity}`,
            );
          }

          const rawUnitCost =
            material.unitCost !== undefined && material.unitCost !== null
              ? material.unitCost
              : await this.getProductUnitCost(tx, material.productId, createDto.branchId);
          const unitCost = roundCurrency(rawUnitCost);
          const totalCost = roundCurrency(materialQuantity * unitCost);

          await tx.stockMovement.create({
            data: {
              type: 'EXIT',
              productId: material.productId,
              quantity: materialQuantity,
              unitCost,
              totalCost,
              notes: `Consumo na ordem de manutenção ${newOrder.orderNumber}`,
              maintenanceOrderId: newOrder.id,
              companyId: companyId,
              branchId: createDto.branchId,
              createdBy: userId,
            },
          });

          // Atualizar estoque (reduzir quantidade)
          const newQuantity = currentQuantity - materialQuantity;
          await tx.stock.update({
            where: {
              productId_warehouseId: {
                productId: material.productId,
                warehouseId: defaultWarehouse.id,
              },
            },
            data: {
              quantity: new Prisma.Decimal(newQuantity),
              updatedAt: new Date(),
            },
          });
        }
      }

      // Evento inicial: ordem aberta (impressão resumo disponível)
      await tx.maintenanceTimeline.create({
        data: {
          maintenanceOrderId: newOrder.id,
          event: 'STARTED',
          notes: 'Ordem aberta – imprimir com veículo e serviços',
          createdBy: userId,
        },
      });

      // Atualizar status de todos os veículos para MAINTENANCE
      const vehicleUpdateData: { status: 'MAINTENANCE'; currentKm?: number } = {
        status: 'MAINTENANCE',
      };
      if (
        createDto.kmAtEntry !== undefined &&
        createDto.kmAtEntry !== null &&
        !Number.isNaN(createDto.kmAtEntry)
      ) {
        vehicleUpdateData.currentKm = createDto.kmAtEntry;
      }
      await tx.vehicle.updateMany({
        where: { id: { in: createDto.vehicleIds } },
        data: vehicleUpdateData,
      });

      // Criar histórico de status para cada veículo
      const kmForHistory =
        createDto.kmAtEntry ?? vehicles[0]?.currentKm ?? null;
      for (const vehicleId of createDto.vehicleIds) {
        const v = vehicles.find((x) => x.id === vehicleId);
        await tx.vehicleStatusHistory.create({
          data: {
            vehicleId,
            maintenanceOrderId: newOrder.id,
            status: 'MAINTENANCE',
            km: createDto.kmAtEntry ?? v?.currentKm ?? null,
            notes: `Ordem de manutenção ${orderNumber} aberta`,
            createdBy: userId,
          },
        });
      }

      // Registrar itens de troca por KM que foram trocados nesta ordem (etiqueta virtual)
      const kmAtEntryCreate =
        createDto.kmAtEntry !== undefined &&
        createDto.kmAtEntry !== null &&
        !Number.isNaN(createDto.kmAtEntry)
          ? createDto.kmAtEntry
          : (vehicles[0]?.currentKm ?? 0);
      if (
        createDto.replacementItemsChanged &&
        createDto.replacementItemsChanged.length > 0 &&
        kmAtEntryCreate !== null
      ) {
        const label = await tx.maintenanceLabel.create({
          data: {
            companyId: companyId,
            branchId: createDto.branchId,
            createdBy: userId,
            vehicles: {
              create: createDto.vehicleIds.map((vehicleId) => ({ vehicleId })),
            },
          },
        });
        for (const vehicleReplacementItemId of createDto.replacementItemsChanged) {
          const item = await tx.vehicleReplacementItem.findFirst({
            where: {
              id: vehicleReplacementItemId,
              vehicleId: { in: createDto.vehicleIds },
            },
          });
          if (item) {
            await (tx as any).maintenanceLabelReplacementItem.create({
              data: {
                maintenanceLabelId: label.id,
                vehicleReplacementItemId,
                lastChangeKm: kmAtEntryCreate,
                createdBy: userId,
              },
            });
          }
        }
      }

      return newOrder;
    });

    return this.findOne(order.id);
  }

  async findAll(
    branchId?: string,
    vehicleId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    includeDeleted = false,
    page = 1,
    limit = 15,
  ): Promise<PaginatedResponseDto<MaintenanceOrderResponseDto>> {
    const skip = (page - 1) * limit;
    const companyId = DEFAULT_COMPANY_ID;

    const where: Prisma.MaintenanceOrderWhereInput = {
      companyId,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(branchId ? { branchId } : {}),
      ...(vehicleId ? { vehicles: { some: { vehicleId } } } : {}),
      ...(status ? { status: status as any } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
            },
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.maintenanceOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicles: {
            include: {
              vehicle: {
                include: { plate: true },
              },
            },
          },
          workers: {
            include: {
              employee: {
                select: {
                  name: true,
                },
              },
            },
          },
          services: true,
          materials: {
            include: {
              product: {
                select: {
                  name: true,
                  unit: true,
                  unitPrice: true,
                },
              },
              vehicleReplacementItem: {
                select: { id: true, name: true },
              },
            },
          },
          timeline: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.maintenanceOrder.count({ where }),
    ]);

    return {
      data: orders.map((order) => this.mapToResponse(order)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user?: any): Promise<MaintenanceOrderResponseDto> {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        vehicles: {
          include: {
            vehicle: {
              include: {
                plate: true,
              },
            },
          },
        },
        workers: {
          include: {
            employee: {
              select: {
                name: true,
              },
            },
          },
        },
        services: {
          include: {
            serviceWorkers: {
              include: {
                employee: { select: { id: true, name: true } },
              },
            },
          } as Prisma.MaintenanceServiceInclude,
        },
        materials: {
          include: {
            product: {
              select: {
                name: true,
                unit: true,
                unitPrice: true,
              },
            },
            maintenanceService: { select: { id: true, description: true } },
            vehicleReplacementItem: {
              select: { id: true, name: true },
            },
          } as Prisma.MaintenanceMaterialInclude,
        },
        timeline: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, order.branchId);
    }

    return this.mapToResponse(order);
  }

  async update(
    id: string,
    updateDto: UpdateMaintenanceOrderDto,
    userId?: string,
    user?: any,
  ): Promise<MaintenanceOrderResponseDto> {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!order) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    // Nota: branchId não pode ser alterado em UpdateMaintenanceOrderDto
    if (user) {
      validateBranchAccess(
        user.branchId,
        user.role,
        undefined, // branchId não pode ser alterado na atualização
        order.branchId,
      );
    }

    // Não permitir atualizar ordens concluídas ou canceladas
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Não é possível atualizar uma ordem concluída ou cancelada');
    }

    // Atualizar ordem
    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceOrder.update({
        where: { id },
        data: {
          description: updateDto.description,
          observations: updateDto.observations,
        },
      });

      // Atualizar workers
      if (updateDto.workers !== undefined) {
        await tx.maintenanceWorker.deleteMany({
          where: { maintenanceOrderId: id },
        });
        if (updateDto.workers.length > 0) {
          await tx.maintenanceWorker.createMany({
            data: updateDto.workers.map((w) => ({
              maintenanceOrderId: id,
              employeeId: w.employeeId,
              isResponsible: w.isResponsible ?? false,
              createdBy: userId,
            })),
          });
        }
      }

      // Atualizar services
      if (updateDto.services) {
        // Deletar services existentes
        await tx.maintenanceService.deleteMany({
          where: { maintenanceOrderId: id },
        });

        // Criar novos services
        if (updateDto.services.length > 0) {
          await tx.maintenanceService.createMany({
            data: updateDto.services.map((s) => ({
              maintenanceOrderId: id,
              description: s.description,
              createdBy: userId,
            })),
          });
        }
      }

      // Atualizar funcionários por serviço (quem executou cada serviço)
      if (updateDto.serviceWorkers !== undefined) {
        const orderServices = await tx.maintenanceService.findMany({
          where: { maintenanceOrderId: id },
          select: { id: true },
        });
        const serviceIds = new Set(orderServices.map((s) => s.id));

        await (tx as any).maintenanceServiceWorker.deleteMany({
          where: { maintenanceServiceId: { in: Array.from(serviceIds) } },
        });

        for (const sw of updateDto.serviceWorkers) {
          if (!serviceIds.has(sw.maintenanceServiceId)) {
            throw new BadRequestException(
              `Serviço ${sw.maintenanceServiceId} não pertence a esta ordem de manutenção`,
            );
          }
          const employee = await tx.employee.findFirst({
            where: {
              id: sw.employeeId,
              companyId: order.companyId,
              branchId: order.branchId,
              deletedAt: null,
              active: true,
            },
          });
          if (!employee) {
            throw new NotFoundException(`Funcionário ${sw.employeeId} não encontrado`);
          }
          await (tx as any).maintenanceServiceWorker.create({
            data: {
              maintenanceServiceId: sw.maintenanceServiceId,
              employeeId: sw.employeeId,
              createdBy: userId,
            },
          });
        }
      }

      // Atualizar materials
      if (updateDto.materials) {
        // Buscar ordem para obter branchId e companyId
        const order = await tx.maintenanceOrder.findUnique({
          where: { id },
          select: { branchId: true, companyId: true },
        });

        if (!order) {
          throw new NotFoundException('Ordem de manutenção não encontrada');
        }

        // Validar estoque disponível antes de atualizar materiais
        if (updateDto.materials.length > 0) {
          for (const material of updateDto.materials) {
            const product = await tx.product.findFirst({
              where: {
                id: material.productId,
                companyId: order.companyId,
                branchId: order.branchId,
                deletedAt: null,
                active: true,
              },
            });

            if (!product) {
              throw new NotFoundException(`Produto ${material.productId} não encontrado`);
            }

            // Buscar estoque disponível apenas da filial da ordem de manutenção
            const stocks = await tx.stock.findMany({
              where: {
                productId: material.productId,
                companyId: order.companyId,
                branchId: order.branchId,
              },
              select: {
                quantity: true,
              },
            });

            // Verificar estoque disponível (soma apenas stocks da mesma filial)
            const totalStock = stocks.reduce((sum: number, stock: any) => {
              return sum + Number(stock.quantity || 0);
            }, 0);

            if (Number(material.quantity) > totalStock) {
              throw new BadRequestException(
                `Quantidade solicitada (${material.quantity}) excede o estoque disponível (${totalStock}) para o produto ${product.name}`,
              );
            }
          }
        }

        // Deletar materials existentes
        await tx.maintenanceMaterial.deleteMany({
          where: { maintenanceOrderId: id },
        });

        // Criar novos materials com custos calculados automaticamente
        if (updateDto.materials.length > 0) {
          const orderServiceIds =
            updateDto.materials.some((m) => m.maintenanceServiceId) ?
              new Set(
                (await tx.maintenanceService.findMany({
                  where: { maintenanceOrderId: id },
                  select: { id: true },
                })).map((s) => s.id),
              )
            : null;

          const materialsData = await Promise.all(
            updateDto.materials.map(async (m) => {
              if (m.maintenanceServiceId && orderServiceIds && !orderServiceIds.has(m.maintenanceServiceId)) {
                throw new BadRequestException(
                  `Serviço ${m.maintenanceServiceId} não pertence a esta ordem de manutenção`,
                );
              }
              const unitCost =
                m.unitCost !== undefined && m.unitCost !== null
                  ? m.unitCost
                  : await this.getProductUnitCost(tx, m.productId, order.branchId);

              const totalCost = Number(m.quantity) * unitCost;

              return {
                maintenanceOrderId: id,
                maintenanceServiceId: m.maintenanceServiceId ?? null,
                productId: m.productId,
                vehicleReplacementItemId: m.vehicleReplacementItemId ?? null,
                quantity: m.quantity,
                unitCost: unitCost,
                totalCost: totalCost,
                createdBy: userId,
              };
            }),
          );

          for (const data of materialsData) {
            await tx.maintenanceMaterial.create({
              data: {
                maintenanceOrderId: data.maintenanceOrderId,
                ...(data.maintenanceServiceId ? { maintenanceServiceId: data.maintenanceServiceId } : {}),
                productId: data.productId,
                ...(data.vehicleReplacementItemId
                  ? { vehicleReplacementItemId: data.vehicleReplacementItemId }
                  : {}),
                quantity: data.quantity,
                unitCost: data.unitCost,
                totalCost: data.totalCost,
                createdBy: data.createdBy,
              },
            });
          }
        }
      }
    });

    return this.findOne(id);
  }

  async start(id: string, actionDto: MaintenanceActionDto, userId?: string) {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!order) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    if (order.status !== 'OPEN' && order.status !== 'PAUSED') {
      throw new BadRequestException('Apenas ordens abertas ou pausadas podem ser iniciadas');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceOrder.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });

      await tx.maintenanceTimeline.create({
        data: {
          maintenanceOrderId: id,
          event: order.status === 'PAUSED' ? 'RESUMED' : 'STARTED',
          notes: actionDto.notes || 'Ordem iniciada',
          createdBy: userId,
        },
      });
    });

    return this.findOne(id);
  }

  async pause(id: string, actionDto: MaintenanceActionDto, userId?: string) {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!order) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    if (order.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Apenas ordens em execução podem ser pausadas');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceOrder.update({
        where: { id },
        data: { status: 'PAUSED' },
      });

      await tx.maintenanceTimeline.create({
        data: {
          maintenanceOrderId: id,
          event: 'PAUSED',
          notes: actionDto.notes || 'Ordem pausada',
          createdBy: userId,
        },
      });
    });

    return this.findOne(id);
  }

  async complete(id: string, actionDto: MaintenanceActionDto, userId?: string) {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        vehicles: true,
        timeline: true,
        services: {
          include: {
            serviceWorkers: true,
          } as Prisma.MaintenanceServiceInclude,
        },
        materials: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    const orderWithRelations = order as typeof order & {
      vehicles: { vehicleId: string }[];
      services: { id: string; description: string; serviceWorkers?: unknown[] }[];
      timeline: { createdAt: Date }[];
    };
    const primaryVehicleId = orderWithRelations.vehicles?.[0]?.vehicleId;
    if (!primaryVehicleId) {
      throw new BadRequestException('Ordem de manutenção sem veículo associado');
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Ordem já foi concluída ou cancelada');
    }

    // Antes de fechar: todo serviço deve ter pelo menos um funcionário atribuído
    const servicesWithoutWorker = (orderWithRelations.services ?? []).filter(
      (s: { serviceWorkers?: unknown[] }) => !s.serviceWorkers?.length,
    );
    if (servicesWithoutWorker.length > 0) {
      throw new BadRequestException(
        `Informe qual(is) funcionário(s) executaram cada serviço antes de concluir. Serviço(s) sem funcionário: ${servicesWithoutWorker.map((s: { description: string }) => s.description).join(', ')}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Calcular tempo e custo
      const totalTimeMinutes = this.calculateTotalTime(orderWithRelations.timeline);
      const totalCost = this.calculateTotalCost(order);

      await tx.maintenanceOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          totalTimeMinutes,
          totalCost,
        },
      });

      await tx.maintenanceTimeline.create({
        data: {
          maintenanceOrderId: id,
          event: 'COMPLETED',
          notes: actionDto.notes || 'Ordem concluída',
          createdBy: userId,
        },
      });

      // Atualizar status do veículo para ACTIVE e manter quilometragem da ordem
      const completeVehicleData: { status: 'ACTIVE'; currentKm?: number } = {
        status: 'ACTIVE',
      };
      if (
        order.kmAtEntry !== undefined &&
        order.kmAtEntry !== null &&
        !Number.isNaN(order.kmAtEntry)
      ) {
        completeVehicleData.currentKm = order.kmAtEntry;
      }
      await tx.vehicle.update({
        where: { id: primaryVehicleId },
        data: completeVehicleData,
      });

      // Criar histórico de status do veículo
      await tx.vehicleStatusHistory.create({
        data: {
          vehicleId: primaryVehicleId,
          maintenanceOrderId: id,
          status: 'ACTIVE',
          km: order.kmAtEntry,
          notes: `Ordem de manutenção ${order.orderNumber} concluída`,
          createdBy: userId,
        },
      });

      // Registrar trocas dos produtos consumidos na OM para "próximas trocas"
      const kmAtEntry =
        order.kmAtEntry !== undefined && order.kmAtEntry !== null && !Number.isNaN(order.kmAtEntry)
          ? order.kmAtEntry
          : null;
      // Trocas por KM são registradas via etiqueta de manutenção ou "troca na estrada", não mais por material da ordem

      // Criar conta a pagar se houver custo
      if (totalCost > 0) {
        const vehiclePlate = await tx.vehiclePlate.findFirst({
          where: { vehicleId: primaryVehicleId },
        });
        const plateStr = vehiclePlate?.plate ?? 'Veículo';

        await tx.accountPayable.create({
          data: {
            description: `Manutenção ${order.orderNumber} - ${plateStr}`,
            amount: totalCost,
            dueDate: new Date(), // Vencimento imediato
            originType: TransactionOriginType.MAINTENANCE,
            originId: order.id,
            companyId: order.companyId,
            branchId: order.branchId,
            status: 'PENDING',
            createdBy: userId,
          },
        });
      }
    });

    return this.findOne(id);
  }

  async cancel(id: string, actionDto: MaintenanceActionDto, userId?: string) {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: { vehicles: true },
    });

    if (!order) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    const primaryVehicleId = order.vehicles?.[0]?.vehicleId;

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Ordem já foi concluída ou cancelada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.maintenanceTimeline.create({
        data: {
          maintenanceOrderId: id,
          event: 'CANCELLED',
          notes: actionDto.notes || 'Ordem cancelada',
          createdBy: userId,
        },
      });

      // Atualizar status do veículo para ACTIVE e manter quilometragem da ordem
      const cancelVehicleData: { status: 'ACTIVE'; currentKm?: number } = {
        status: 'ACTIVE',
      };
      if (
        order.kmAtEntry !== undefined &&
        order.kmAtEntry !== null &&
        !Number.isNaN(order.kmAtEntry)
      ) {
        cancelVehicleData.currentKm = order.kmAtEntry;
      }
      if (primaryVehicleId) {
        await tx.vehicle.update({
          where: { id: primaryVehicleId },
          data: cancelVehicleData,
        });
      }

      // Criar histórico de status do veículo
      if (primaryVehicleId) {
        await tx.vehicleStatusHistory.create({
          data: {
            vehicleId: primaryVehicleId,
            maintenanceOrderId: id,
            status: 'ACTIVE',
            km: order.kmAtEntry,
            notes: `Ordem de manutenção ${order.orderNumber} cancelada`,
            createdBy: userId,
          },
        });
      }
    });

    return this.findOne(id);
  }

  async remove(id: string, user?: any): Promise<void> {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!order) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, order.branchId);
    }

    // Soft delete
    await this.prisma.maintenanceOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Anexa nota/documento à ordem de manutenção (ex.: nota fiscal de terceiro - troca na estrada).
   */
  async uploadAttachment(
    orderId: string,
    file: { buffer: Buffer; originalname: string },
    userId?: string,
  ): Promise<MaintenanceOrderResponseDto> {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: { id: orderId, deletedAt: null },
    });

    if (!order) {
      throw new NotFoundException('Ordem de manutenção não encontrada');
    }

    const baseDir = path.join(process.cwd(), 'uploads', 'maintenance-orders', orderId);
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '';
    const safeName = `${Date.now()}_${(file.originalname || 'anexo').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fileName = safeName.endsWith(ext) ? safeName : `${safeName}${ext}`;
    const fullPath = path.join(baseDir, fileName);

    fs.writeFileSync(fullPath, file.buffer);

    const relativePath = path.join('uploads', 'maintenance-orders', orderId, fileName);

    await this.prisma.maintenanceOrder.update({
      where: { id: orderId },
      data: {
        attachmentFileName: file.originalname,
        attachmentFilePath: relativePath,
        updatedAt: new Date(),
      },
    });

    return this.findOne(orderId);
  }

  /**
   * Retorna o stream do anexo da ordem (para visualizar/download).
   */
  async getAttachmentStream(
    orderId: string,
  ): Promise<{ stream: Readable; fileName: string; mimeType: string }> {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: { id: orderId, deletedAt: null },
    });

    if (!order || !order.attachmentFilePath || !order.attachmentFileName) {
      throw new NotFoundException('Anexo não encontrado');
    }

    const fullPath = path.join(process.cwd(), order.attachmentFilePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Arquivo do anexo não encontrado');
    }

    const ext = path.extname(order.attachmentFileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    const stream = fs.createReadStream(fullPath);
    return {
      stream,
      fileName: order.attachmentFileName,
      mimeType,
    };
  }

  private mapToResponse(order: any): MaintenanceOrderResponseDto {
    const totalCost = this.calculateTotalCost(order);
    const totalTimeMinutes = this.calculateTotalTime(order.timeline || []);
    const firstVehicle = order.vehicles?.[0];
    const vehicleId = firstVehicle?.vehicleId ?? '';
    const vehicle = firstVehicle?.vehicle;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      vehicleId,
      vehiclePlate: vehicle ? getPrimaryPlate(vehicle) : undefined,
      type: order.type,
      status: order.status,
      kmAtEntry: order.kmAtEntry,
      serviceDate: order.serviceDate ?? undefined,
      description: order.description,
      observations: order.observations,
      totalCost: totalCost > 0 ? totalCost : Number(order.totalCost || 0),
      totalTimeMinutes: totalTimeMinutes > 0 ? totalTimeMinutes : order.totalTimeMinutes,
      attachmentFileName: order.attachmentFileName ?? undefined,
      attachmentFilePath: order.attachmentFilePath ?? undefined,
      companyId: order.companyId,
      branchId: order.branchId,
      workers: order.workers?.map((w: any) => ({
        id: w.id,
        maintenanceOrderId: w.maintenanceOrderId,
        employeeId: w.employeeId,
        employeeName: w.employee?.name,
        isResponsible: w.isResponsible,
        createdAt: w.createdAt,
        createdBy: w.createdBy,
      })),
      services: order.services?.map((s: any) => ({
        id: s.id,
        maintenanceOrderId: s.maintenanceOrderId,
        description: s.description,
        serviceWorkers: s.serviceWorkers?.map((sw: any) => ({
          id: sw.id,
          maintenanceServiceId: sw.maintenanceServiceId,
          employeeId: sw.employeeId,
          employeeName: sw.employee?.name,
        })),
        createdAt: s.createdAt,
        createdBy: s.createdBy,
      })),
      materials: order.materials?.map((m: any) => ({
        id: m.id,
        maintenanceOrderId: m.maintenanceOrderId,
        maintenanceServiceId: m.maintenanceServiceId ?? undefined,
        productId: m.productId,
        productName: m.product?.name,
        productUnit: m.product?.unit,
        vehicleReplacementItemId: m.vehicleReplacementItemId ?? undefined,
        replacementItemName: m.vehicleReplacementItem?.name,
        quantity: Number(m.quantity || 0),
        unitCost: Number(m.unitCost || 0),
        totalCost: Number(m.totalCost || 0),
        createdAt: m.createdAt,
        createdBy: m.createdBy,
      })),
      replacementItemsSummary: (() => {
        const seen = new Set<string>();
        const items: { id: string; name: string }[] = [];
        for (const m of order.materials ?? []) {
          if (
            m.vehicleReplacementItemId &&
            m.vehicleReplacementItem &&
            !seen.has(m.vehicleReplacementItemId)
          ) {
            seen.add(m.vehicleReplacementItemId);
            items.push({
              id: m.vehicleReplacementItemId,
              name: m.vehicleReplacementItem.name,
            });
          }
        }
        return items.length > 0 ? items : undefined;
      })(),
      timeline: order.timeline?.map((t: any) => ({
        id: t.id,
        maintenanceOrderId: t.maintenanceOrderId,
        event: t.event,
        notes: t.notes,
        createdAt: t.createdAt,
        createdBy: t.createdBy,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      createdBy: order.createdBy,
      deletedAt: order.deletedAt,
    };
  }
}
