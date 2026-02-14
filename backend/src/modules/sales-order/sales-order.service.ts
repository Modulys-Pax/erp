import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { InvoiceSalesOrderDto } from './dto/invoice-sales-order.dto';
import { SalesOrderResponseDto } from './dto/sales-order-response.dto';
import { SalesOrderItemResponseDto } from './dto/sales-order-item-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { Prisma, SalesOrderStatus } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../shared/constants/company.constants';
import { validateBranchAccess } from '../../shared/utils/branch-access.util';
import { roundCurrency, roundQuantity } from '../../shared/utils/decimal.util';
import { StockService } from '../stock/stock.service';
import { AccountReceivableService } from '../account-receivable/account-receivable.service';
import { CreateStockMovementDto, StockMovementType } from '../stock/dto/create-stock-movement.dto';
import { TransactionOriginType } from '@prisma/client';

@Injectable()
export class SalesOrderService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => StockService))
    private stockService: StockService,
    @Inject(forwardRef(() => AccountReceivableService))
    private accountReceivableService: AccountReceivableService,
  ) {}

  private async getNextNumber(branchId: string): Promise<string> {
    const last = await this.prisma.salesOrder.findFirst({
      where: { branchId, deletedAt: null },
      orderBy: { number: 'desc' },
    });
    let seq = 1;
    if (last) {
      const match = last.number.match(/PV-(\d+)/);
      if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `PV-${seq.toString().padStart(3, '0')}`;
  }

  async create(
    dto: CreateSalesOrderDto,
    userId?: string,
    user?: any,
  ): Promise<SalesOrderResponseDto> {
    const companyId = DEFAULT_COMPANY_ID;
    if (user) {
      validateBranchAccess(user.branchId, user.role, dto.branchId, undefined);
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, companyId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Filial não encontrada');

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, branchId: dto.branchId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

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

    const so = await this.prisma.salesOrder.create({
      data: {
        number,
        customerId: dto.customerId,
        companyId,
        branchId: dto.branchId,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : null,
        status: SalesOrderStatus.DRAFT,
        notes: dto.notes ?? null,
        createdBy: userId,
        items: {
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
        },
      },
      include: {
        customer: true,
        items: { include: { product: { include: { unitOfMeasurement: true } } } },
      },
    });

    return this.mapToResponse(so);
  }

  async findAll(
    branchId?: string,
    status?: string,
    customerId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 15,
    user?: any,
  ): Promise<PaginatedResponseDto<SalesOrderResponseDto>> {
    const companyId = DEFAULT_COMPANY_ID;
    const where: Prisma.SalesOrderWhereInput = {
      companyId,
      deletedAt: null,
    };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status as SalesOrderStatus;
    if (customerId) where.customerId = customerId;
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
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take: limit,
        include: { customer: true, items: { include: { product: { include: { unitOfMeasurement: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.mapToResponse(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user?: any): Promise<SalesOrderResponseDto> {
    const so = await this.prisma.salesOrder.findFirst({
      where: { id, deletedAt: null },
      include: { customer: true, items: { include: { product: { include: { unitOfMeasurement: true } } } } },
    });
    if (!so) throw new NotFoundException('Pedido de venda não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, so.branchId);
    }
    return this.mapToResponse(so);
  }

  async update(
    id: string,
    dto: UpdateSalesOrderDto,
    userId?: string,
    user?: any,
  ): Promise<SalesOrderResponseDto> {
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Pedido de venda não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, existing.branchId);
    }
    if (existing.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Só é possível editar pedidos em status Rascunho',
      );
    }

    const updateData: Prisma.SalesOrderUpdateInput = {};
    if (dto.customerId !== undefined && dto.customerId != null) {
      updateData.customer = { connect: { id: dto.customerId } };
    }
    if (dto.orderDate !== undefined) {
      updateData.orderDate = dto.orderDate ? new Date(dto.orderDate) : null;
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.items && dto.items.length > 0) {
      await this.prisma.salesOrderItem.deleteMany({
        where: { salesOrderId: id },
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

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: updateData,
      include: { customer: true, items: { include: { product: { include: { unitOfMeasurement: true } } } } },
    });
    return this.mapToResponse(updated);
  }

  async remove(id: string, user?: any): Promise<void> {
    const existing = await this.prisma.salesOrder.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Pedido de venda não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, existing.branchId);
    }
    if (existing.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Só é possível excluir pedidos em status Rascunho',
      );
    }
    await this.prisma.salesOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async invoice(
    id: string,
    dto: InvoiceSalesOrderDto,
    userId?: string,
    user?: any,
  ): Promise<SalesOrderResponseDto> {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, deletedAt: null },
      include: { customer: true, items: { include: { product: { include: { unitOfMeasurement: true } } } } },
    });
    if (!order) throw new NotFoundException('Pedido de venda não encontrado');
    if (user) {
      validateBranchAccess(user.branchId, user.role, undefined, order.branchId);
    }
    if (order.status === SalesOrderStatus.CANCELLED) {
      throw new BadRequestException('Pedido está cancelado');
    }
    if (order.status === SalesOrderStatus.DELIVERED) {
      throw new BadRequestException('Pedido já foi faturado');
    }

    const totalAmount = order.items.reduce(
      (s, i) => s + Number(i.total ?? 0),
      0,
    );
    if (totalAmount <= 0) {
      throw new BadRequestException('Pedido sem valor para faturar');
    }

    const createCr = dto.createAccountReceivable !== false;
    const deductStock = dto.deductStock === true;

    if (deductStock) {
      const warehouse = await this.stockService.getCompanyDefaultWarehouse(
        order.companyId,
      );
      for (const item of order.items) {
        const qty = Number(item.quantity);
        if (qty <= 0) continue;
        const stock = await this.prisma.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: warehouse.id,
            },
          },
        });
        const available = stock ? Number(stock.quantity) : 0;
        if (available < qty) {
          throw new BadRequestException(
            `Estoque insuficiente para o produto ${item.product?.name ?? item.productId}. Disponível: ${available}, necessário: ${qty}`,
          );
        }
      }
    }

    if (createCr) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      await this.accountReceivableService.create(
        {
          description: `Pedido de venda ${order.number} - ${order.customer.name}`,
          amount: roundCurrency(totalAmount),
          dueDate: dueDate.toISOString(),
          originType: TransactionOriginType.SALE_ORDER,
          originId: id,
          documentNumber: order.number,
          notes: `Faturamento pedido de venda ${order.number}`,
          customerId: order.customerId,
          companyId: order.companyId,
          branchId: order.branchId,
        },
        userId,
        user,
      );
    }

    if (deductStock) {
      for (const item of order.items) {
        const qty = Number(item.quantity);
        if (qty <= 0) continue;
        await this.stockService.createStockMovement(
          {
            type: StockMovementType.EXIT,
            productId: item.productId,
            quantity: qty,
            documentNumber: order.number,
            notes: `Faturamento pedido de venda ${order.number}`,
            salesOrderId: id,
            companyId: order.companyId,
            branchId: order.branchId,
          } as CreateStockMovementDto,
          userId,
          user,
        );
        await this.prisma.salesOrderItem.update({
          where: { id: item.id },
          data: {
            quantityInvoiced: new Prisma.Decimal(
              roundQuantity(Number(item.quantityInvoiced) + qty),
            ),
          },
        });
      }
    }

    await this.prisma.salesOrder.update({
      where: { id },
      data: { status: SalesOrderStatus.DELIVERED },
    });

    return this.findOne(id, user);
  }

  private mapToResponse(so: any): SalesOrderResponseDto {
    const items: SalesOrderItemResponseDto[] = (so.items || []).map(
      (i: any) => ({
        id: i.id,
        salesOrderId: i.salesOrderId,
        productId: i.productId,
        productName: i.product?.name,
        productCode: i.product?.code,
        productUnit: i.product?.unitOfMeasurement?.code ?? i.product?.unit ?? undefined,
        quantity: Number(i.quantity),
        quantityInvoiced: Number(i.quantityInvoiced),
        unitPrice: i.unitPrice != null ? Number(i.unitPrice) : undefined,
        total: i.total != null ? Number(i.total) : undefined,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }),
    );
    const totalAmount = items.reduce((s, i) => s + (i.total ?? 0), 0);
    return {
      id: so.id,
      number: so.number,
      customerId: so.customerId,
      customerName: so.customer?.name,
      companyId: so.companyId,
      branchId: so.branchId,
      orderDate: so.orderDate ?? undefined,
      status: so.status,
      notes: so.notes ?? undefined,
      createdAt: so.createdAt,
      updatedAt: so.updatedAt,
      createdBy: so.createdBy,
      items,
      totalAmount,
    };
  }
}
