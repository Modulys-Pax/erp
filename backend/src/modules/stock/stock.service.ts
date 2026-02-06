import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateStockMovementDto, StockMovementType } from './dto/create-stock-movement.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { StockResponseDto } from './dto/stock-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma, TransactionOriginType } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { roundCurrency, roundQuantity } from '../../shared/utils/decimal.util';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';
import { AccountPayableService } from '../account-payable/account-payable.service';

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AccountPayableService))
    private accountPayableService: AccountPayableService,
  ) {}

  // ============================================
  // WAREHOUSE (Almoxarifado) - Método privado para uso interno
  // ============================================

  /**
   * Busca o almoxarifado padrão da empresa (apenas um por empresa)
   * Usado internamente para movimentações de estoque
   * Cria automaticamente se não existir
   */
  async getCompanyDefaultWarehouse(companyId: string) {
    let warehouse = await this.prisma.warehouse.findFirst({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Se não existir, criar automaticamente
    if (!warehouse) {
      warehouse = await this.ensureDefaultWarehouse(companyId);
    }

    return warehouse;
  }

  /**
   * Lista todos os almoxarifados da empresa (para uso interno)
   * Retorna apenas o almoxarifado padrão, já que a empresa usa um único
   * Cria automaticamente o almoxarifado padrão se não existir
   */
  async findAllWarehouses(companyId?: string, branchId?: string, includeDeleted = false) {
    const targetCompanyId = companyId || DEFAULT_COMPANY_ID;

    const where: any = includeDeleted ? {} : { deletedAt: null };

    if (targetCompanyId) {
      where.companyId = targetCompanyId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    let warehouses = await this.prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Se não houver almoxarifado e não estiver incluindo deletados, criar automaticamente
    if (warehouses.length === 0 && !includeDeleted && targetCompanyId) {
      warehouses = [await this.ensureDefaultWarehouse(targetCompanyId, branchId)];
    }

    return warehouses;
  }

  /**
   * Garante que existe um almoxarifado padrão para a empresa
   * Cria automaticamente se não existir
   */
  private async ensureDefaultWarehouse(companyId: string, branchId?: string) {
    // Verificar se já existe
    const existing = await this.prisma.warehouse.findFirst({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return existing;
    }

    // Buscar primeira filial disponível
    let targetBranchId = branchId;

    if (!targetBranchId) {
      const firstBranch = await this.prisma.branch.findFirst({
        where: {
          companyId,
          deletedAt: null,
          active: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!firstBranch) {
        throw new NotFoundException(
          'Não há filiais cadastradas. Cadastre uma filial antes de usar o estoque.',
        );
      }

      targetBranchId = firstBranch.id;
    }

    // Verificar se a filial existe
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: targetBranchId,
        companyId,
        deletedAt: null,
      },
    });

    if (!branch) {
      throw new NotFoundException('Filial não encontrada');
    }

    // Criar almoxarifado padrão
    const warehouse = await this.prisma.warehouse.create({
      data: {
        code: 'ALM-001',
        name: 'Almoxarifado Principal',
        description: 'Almoxarifado padrão da empresa',
        companyId,
        branchId: targetBranchId,
        active: true,
      },
    });

    return warehouse;
  }

  // ============================================
  // STOCK (Estoque)
  // ============================================

  async findAllStocks(
    companyId?: string,
    branchId?: string,
    warehouseId?: string,
    productId?: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<StockResponseDto>> {
    const skip = (page - 1) * limit;
    const targetCompanyId = companyId || DEFAULT_COMPANY_ID;

    const where: Prisma.StockWhereInput = {
      companyId: targetCompanyId,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (productId) {
      where.productId = productId;
    }

    const [stocks, total] = await Promise.all([
      this.prisma.stock.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          warehouse: true,
        },
        orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
      }),
      this.prisma.stock.count({ where }),
    ]);

    return {
      data: stocks.map((stock) => this.mapStockToResponse(stock)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneStock(id: string, user?: any): Promise<StockResponseDto> {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
      include: {
        product: true,
        warehouse: true,
      },
    });

    if (!stock) {
      throw new NotFoundException('Estoque não encontrado');
    }

    // Validar acesso por filial (não-admin só acessa própria filial)
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, stock.branchId);
    }

    return this.mapStockToResponse(stock);
  }

  async findStockByProductAndWarehouse(
    productId: string,
    warehouseId: string,
  ): Promise<StockResponseDto | null> {
    const stock = await this.prisma.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return stock ? this.mapStockToResponse(stock) : null;
  }

  // ============================================
  // STOCK MOVEMENT (Movimentação de Estoque)
  // ============================================

  async createStockMovement(
    createDto: CreateStockMovementDto,
    userId?: string,
    user?: any,
  ): Promise<StockMovementResponseDto> {
    // Usar DEFAULT_COMPANY_ID (single-tenant)
    const companyId = DEFAULT_COMPANY_ID;

    // Validar acesso por filial (não-admin só cria na própria filial)
    // O interceptor já força o branchId no body, mas validamos aqui também por segurança
    if (user) {
      validateBranchAccess(user.branchId, user.role, createDto.branchId, undefined);
    }

    // Validações básicas
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

    const product = await this.prisma.product.findFirst({
      where: {
        id: createDto.productId,
        companyId: companyId,
        branchId: createDto.branchId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    // Validações por tipo
    const movementType = createDto.type || StockMovementType.ENTRY;
    if (movementType === StockMovementType.ENTRY) {
      if (!createDto.unitCost && createDto.unitCost !== 0) {
        throw new BadRequestException('Custo unitário é obrigatório para entrada');
      }
    } else if (movementType === StockMovementType.EXIT) {
      // Validar estoque disponível para saída
      const defaultWarehouse = await this.ensureDefaultWarehouse(companyId, createDto.branchId);
      const existingStock = await this.prisma.stock.findUnique({
        where: {
          productId_warehouseId: {
            productId: createDto.productId,
            warehouseId: defaultWarehouse.id,
          },
        },
      });

      if (!existingStock || Number(existingStock.quantity) < createDto.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente. Disponível: ${existingStock ? Number(existingStock.quantity) : 0}, Solicitado: ${createDto.quantity}`,
        );
      }
    }

    // Obter almoxarifado padrão da empresa/filial
    const defaultWarehouse = await this.ensureDefaultWarehouse(companyId, createDto.branchId);

    // Verificar ordem de manutenção se informada
    if (createDto.maintenanceOrderId) {
      const maintenanceOrder = await this.prisma.maintenanceOrder.findFirst({
        where: {
          id: createDto.maintenanceOrderId,
          companyId: companyId,
          branchId: createDto.branchId,
          deletedAt: null,
        },
      });

      if (!maintenanceOrder) {
        throw new NotFoundException('Ordem de manutenção não encontrada');
      }
    }

    const quantity = roundQuantity(createDto.quantity);
    const unitCost =
      createDto.unitCost !== undefined ? roundCurrency(createDto.unitCost) : undefined;
    const totalCost = unitCost !== undefined ? roundCurrency(quantity * unitCost) : null;

    const movement = await this.prisma.$transaction(async (tx) => {
      const newMovement = await tx.stockMovement.create({
        data: {
          type: movementType,
          productId: createDto.productId,
          quantity,
          unitCost: unitCost ?? null,
          totalCost,
          documentNumber: createDto.documentNumber,
          notes: createDto.notes,
          maintenanceOrderId: createDto.maintenanceOrderId,
          purchaseOrderId: createDto.purchaseOrderId,
          salesOrderId: createDto.salesOrderId,
          companyId: companyId,
          branchId: createDto.branchId,
          createdBy: userId,
        },
      });

      // Atualizar estoque - usa almoxarifado padrão
      if (createDto.type === StockMovementType.EXIT) {
        await this.updateStockOnExit(
          tx,
          createDto.productId,
          defaultWarehouse.id,
          quantity,
          companyId,
          createDto.branchId,
        );
      } else {
        await this.updateStockOnEntry(
          tx,
          createDto.productId,
          defaultWarehouse.id,
          quantity,
          unitCost ?? 0,
          companyId,
          createDto.branchId,
          userId,
        );
      }

      return newMovement;
    });

    // Criar conta a pagar automaticamente para entradas de estoque com custo (exceto quando origem é pedido de compra)
    if (
      movementType === StockMovementType.ENTRY &&
      totalCost &&
      totalCost > 0 &&
      !createDto.purchaseOrderId
    ) {
      try {
        await this.accountPayableService.create(
          {
            description: `Compra de estoque - ${product.name} (${quantity} ${product.unit || 'un'})`,
            amount: totalCost,
            dueDate: new Date().toISOString(), // Vencimento imediato (pode ser ajustado)
            originType: TransactionOriginType.STOCK,
            originId: movement.id,
            documentNumber: createDto.documentNumber,
            notes: createDto.notes || `Movimentação de entrada de estoque #${movement.id}`,
            companyId: companyId,
            branchId: createDto.branchId,
          },
          userId,
        );
      } catch (error) {
        // Log do erro mas não falha a operação (conta pode ser criada manualmente)
        console.error('Erro ao criar conta a pagar para entrada de estoque:', error);
      }
    }

    return this.mapStockMovementToResponse(movement);
  }

  private async updateStockOnEntry(
    tx: Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    quantity: number,
    unitCost: number | null,
    companyId: string,
    branchId: string,
    userId?: string,
  ): Promise<void> {
    const existingStock = await tx.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
    });

    if (existingStock) {
      // Atualizar estoque existente
      let newAverageCost = existingStock.averageCost;
      const newQuantity = Number(existingStock.quantity) + quantity;

      if (unitCost !== null && unitCost !== undefined) {
        const currentTotalCost = Number(existingStock.quantity) * Number(existingStock.averageCost);
        const entryTotalCost = roundCurrency(quantity * unitCost);
        const totalCost = roundCurrency(currentTotalCost + entryTotalCost);
        newAverageCost = new Prisma.Decimal(
          newQuantity > 0 ? roundCurrency(totalCost / newQuantity) : 0,
        );
      }

      await tx.stock.update({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
        data: {
          quantity: new Prisma.Decimal(newQuantity),
          averageCost: newAverageCost,
          updatedAt: new Date(),
        },
      });
    } else {
      // Criar novo registro de estoque
      const averageCost = unitCost !== null && unitCost !== undefined ? unitCost : 0;
      await tx.stock.create({
        data: {
          productId,
          warehouseId,
          quantity: new Prisma.Decimal(quantity),
          averageCost: new Prisma.Decimal(averageCost),
          companyId,
          branchId,
          createdBy: userId,
        },
      });
    }
  }

  /**
   * Atualizar estoque na saída (consumo)
   */
  private async updateStockOnExit(
    tx: Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    quantity: number,
    companyId: string,
    branchId: string,
  ): Promise<void> {
    const existingStock = await tx.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
    });

    if (!existingStock) {
      throw new NotFoundException('Estoque não encontrado para o produto');
    }

    const currentQuantity = Number(existingStock.quantity);
    if (currentQuantity < quantity) {
      throw new BadRequestException(
        `Estoque insuficiente. Disponível: ${currentQuantity}, Solicitado: ${quantity}`,
      );
    }

    const newQuantity = currentQuantity - quantity;

    await tx.stock.update({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
      data: {
        quantity: new Prisma.Decimal(newQuantity),
        updatedAt: new Date(),
      },
    });
  }

  async findAllStockMovements(
    companyId?: string,
    branchId?: string,
    productId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<StockMovementResponseDto>> {
    const skip = (page - 1) * limit;
    const where: Prisma.StockMovementWhereInput = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (productId) {
      where.productId = productId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Adicionar 23:59:59 ao endDate para incluir o dia inteiro
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements.map((movement) => this.mapStockMovementToResponse(movement)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneStockMovement(id: string, user?: any): Promise<StockMovementResponseDto> {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!movement) {
      throw new NotFoundException('Movimentação não encontrada');
    }

    return this.mapStockMovementToResponse(movement);
  }

  // ============================================
  // MAPPERS
  // ============================================

  private mapStockToResponse(stock: any): StockResponseDto {
    return {
      id: stock.id,
      productId: stock.productId,
      warehouseId: stock.warehouseId,
      quantity: Number(stock.quantity),
      averageCost: Number(stock.averageCost),
      companyId: stock.companyId,
      branchId: stock.branchId,
      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt,
      createdBy: stock.createdBy,
    };
  }

  private mapStockMovementToResponse(movement: any): StockMovementResponseDto {
    return {
      id: movement.id,
      type: movement.type,
      productId: movement.productId,
      quantity: Number(movement.quantity),
      unitCost: movement.unitCost ? Number(movement.unitCost) : undefined,
      totalCost: movement.totalCost ? Number(movement.totalCost) : undefined,
      documentNumber: movement.documentNumber,
      notes: movement.notes,
      maintenanceOrderId: movement.maintenanceOrderId,
      companyId: movement.companyId,
      branchId: movement.branchId,
      createdAt: movement.createdAt,
      createdBy: movement.createdBy,
    };
  }
}
