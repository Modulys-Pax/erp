import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { PurchaseOrderResponseDto } from './dto/purchase-order-response.dto';
import { PurchaseOrderItemResponseDto } from './dto/purchase-order-item-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';
import { roundCurrency, roundQuantity } from '../../shared/utils/decimal.util';
import { StockService } from '../stock/stock.service';
import { AccountPayableService } from '../account-payable/account-payable.service';
import { CreateStockMovementDto, StockMovementType } from '../stock/dto/create-stock-movement.dto';
import { TransactionOriginType } from '@prisma/client';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => StockService))
    private stockService: StockService,
    @Inject(forwardRef(() => AccountPayableService))
    private accountPayableService: AccountPayableService,
  ) {}

  private async getNextNumber(branchId: string): Promise<string> {
    const last = await this.prisma.purchaseOrder.findFirst({
      where: { branchId, deletedAt: null },
      orderBy: { number: 'desc' },
    });
    let seq = 1;
    if (last) {
      const match = last.number.match(/PC-(\d+)/);
      if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `PC-${seq.toString().padStart(3, '0')}`;
  }

  async create(
    dto: CreatePurchaseOrderDto,
    userId?: string,
    user?: any,
  ): Promise<PurchaseOrderResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;
    if (user) {
      validateBranchAccess(user.branchId, user.role, dto.branchId, undefined);
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, companyId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Filial não encontrada');

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, branchId: dto.branchId, deletedAt: null },
    });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');

    if (!dto.items?.length) {
      throw new BadRequestException('Pedido deve ter ao menos um item');
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId,
        branchId: dto.branchId,
        deletedAt: null,
      },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Um ou mais produtos não encontrados');
    }

    const number = await this.getNextNumber(dto.branchId);

    const po = await this.prisma.purchaseOrder.create({
      data: {
        number,
        supplierId: dto.supplierId,
        companyId,
        branchId: dto.branchId,
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? new Date(dto.expectedDeliveryDate)
          : null,
        status: PurchaseOrderStatus.DRAFT,
        notes: dto.notes ?? null,
        createdBy: userId,
        items: {
          create: dto.items.map((item) => {
            const qty = roundQuantity(item.quantity);
            const unitPrice = item.unitPrice !== undefined ? roundCurrency(item.unitPrice) : null;
            const total = unitPrice !== null ? roundCurrency(qty * unitPrice) : null;
            return {
              productId: item.productId,
              quantity: new Prisma.Decimal(qty),
              unitPrice: unitPrice !== null ? new Prisma.Decimal(unitPrice) : null,
              total: total !== null ? new Prisma.Decimal(total) : null,
            };
          }),
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    return this.mapToResponse(po);
  }

  async findAll(
    branchId?: string,
    status?: string,
    supplierId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 15,
    user?: any,
  ): Promise<PaginatedResponseDto<PurchaseOrderResponseDto>> {
    const companyId = DEFAULT_COMPANY_ID;
    const effectiveBranchId = branchId || user?.branchId;
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId,
      deletedAt: null,
    };
    if (effectiveBranchId) where.branchId = effectiveBranchId;
    if (status) where.status = status as PurchaseOrderStatus;
    if (supplierId) where.supplierId = supplierId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        include: { supplier: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.mapToResponse(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user?: any): Promise<PurchaseOrderResponseDto> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: { supplier: true, items: { include: { product: true } } },
    });
    if (!po) throw new NotFoundException('Pedido de compra não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, po.branchId);
    }
    return this.mapToResponse(po);
  }

  async update(
    id: string,
    dto: UpdatePurchaseOrderDto,
    userId?: string,
    user?: any,
  ): Promise<PurchaseOrderResponseDto> {
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Pedido de compra não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, existing.branchId);
    }
    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Só é possível editar pedidos em status Rascunho',
      );
    }

    const updateData: Prisma.PurchaseOrderUpdateInput = {};
    if (dto.supplierId !== undefined && dto.supplierId != null) {
      updateData.supplier = { connect: { id: dto.supplierId } };
    }
    if (dto.expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = dto.expectedDeliveryDate
        ? new Date(dto.expectedDeliveryDate)
        : null;
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.items && dto.items.length > 0) {
      await this.prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });
      updateData.items = {
        create: dto.items.map((item) => {
          const qty = roundQuantity(item.quantity);
          const unitPrice =
            item.unitPrice !== undefined ? roundCurrency(item.unitPrice) : null;
          const total = unitPrice !== null ? roundCurrency(qty * unitPrice) : null;
          return {
            productId: item.productId,
            quantity: new Prisma.Decimal(qty),
            unitPrice: unitPrice !== null ? new Prisma.Decimal(unitPrice) : null,
            total: total !== null ? new Prisma.Decimal(total) : null,
          };
        }),
      };
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { supplier: true, items: { include: { product: true } } },
    });
    return this.mapToResponse(updated);
  }

  async remove(id: string, user?: any): Promise<void> {
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Pedido de compra não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, existing.branchId);
    }
    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Só é possível excluir pedidos em status Rascunho',
      );
    }
    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    userId?: string,
    user?: any,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: { supplier: true, items: { include: { product: true } } },
    });
    if (!po) throw new NotFoundException('Pedido de compra não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, po.branchId);
    }
    if (po.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Pedido está cancelado');
    }

    const itemMap = new Map(po.items.map((i) => [i.id, i]));
    let totalReceivedValue = 0;

    for (const rec of dto.items) {
      if (rec.quantityReceived <= 0) continue;
      const item = itemMap.get(rec.itemId);
      if (!item) throw new BadRequestException(`Item não encontrado: ${rec.itemId}`);
      const requested = Number(item.quantity);
      const alreadyReceived = Number(item.quantityReceived);
      const pending = requested - alreadyReceived;
      const toReceive = Math.min(rec.quantityReceived, pending);
      if (toReceive <= 0) continue;

      const unitPrice = item.unitPrice ? Number(item.unitPrice) : 0;
      totalReceivedValue += toReceive * unitPrice;

      await this.stockService.createStockMovement(
        {
          type: StockMovementType.ENTRY,
          productId: item.productId,
          quantity: toReceive,
          unitCost: unitPrice || undefined,
          documentNumber: po.number,
          notes: `Recebimento pedido de compra ${po.number}`,
          purchaseOrderId: id,
          companyId: po.companyId,
          branchId: po.branchId,
        } as CreateStockMovementDto,
        userId,
        user,
      );

      const newQuantityReceived = roundQuantity(alreadyReceived + toReceive);
      await this.prisma.purchaseOrderItem.update({
        where: { id: item.id },
        data: { quantityReceived: new Prisma.Decimal(newQuantityReceived) },
      });
    }

    const allItems = await this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id },
    });
    const totalRequested = allItems.reduce((s, i) => s + Number(i.quantity), 0);
    const totalReceived = allItems.reduce((s, i) => s + Number(i.quantityReceived), 0);
    let newStatus: PurchaseOrderStatus = po.status;
    if (totalReceived >= totalRequested) {
      newStatus = PurchaseOrderStatus.RECEIVED;
    } else if (totalReceived > 0) {
      newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    }
    if (po.status === PurchaseOrderStatus.DRAFT) {
      newStatus = newStatus === PurchaseOrderStatus.RECEIVED
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.SENT;
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
    });

    if (dto.createAccountPayable && totalReceivedValue > 0) {
      await this.accountPayableService.create(
        {
          description: `Pedido de compra ${po.number} - ${po.supplier.name}`,
          amount: roundCurrency(totalReceivedValue),
          dueDate: new Date().toISOString(),
          originType: TransactionOriginType.PURCHASE_ORDER,
          originId: id,
          documentNumber: po.number,
          notes: `Recebimento pedido de compra ${po.number}`,
          supplierId: po.supplierId,
          companyId: po.companyId,
          branchId: po.branchId,
        },
        userId,
        user,
      );
    }

    return this.findOne(id, user);
  }

  private mapToResponse(po: any): PurchaseOrderResponseDto {
    const items: PurchaseOrderItemResponseDto[] = (po.items || []).map(
      (i: any) => ({
        id: i.id,
        purchaseOrderId: i.purchaseOrderId,
        productId: i.productId,
        productName: i.product?.name,
        productCode: i.product?.code,
        quantity: Number(i.quantity),
        quantityReceived: Number(i.quantityReceived),
        unitPrice: i.unitPrice != null ? Number(i.unitPrice) : undefined,
        total: i.total != null ? Number(i.total) : undefined,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }),
    );
    const totalAmount = items.reduce(
      (s, i) => s + (i.total ?? 0),
      0,
    );
    return {
      id: po.id,
      number: po.number,
      supplierId: po.supplierId,
      supplierName: po.supplier?.name,
      companyId: po.companyId,
      branchId: po.branchId,
      expectedDeliveryDate: po.expectedDeliveryDate ?? undefined,
      status: po.status,
      notes: po.notes ?? undefined,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      createdBy: po.createdBy,
      items,
      totalAmount,
    };
  }
}
