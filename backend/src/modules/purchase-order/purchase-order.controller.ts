import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { PurchaseOrderResponseDto } from './dto/purchase-order-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Post()
  @RequirePermission('purchase-orders.create')
  @ApiOperation({ summary: 'Criar pedido de compra' })
  @ApiResponse({ status: 201, description: 'Pedido criado', type: PurchaseOrderResponseDto })
  create(
    @Body() createDto: CreatePurchaseOrderDto,
    @CurrentUser() user: any,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.create(createDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('purchase-orders.view')
  @ApiOperation({ summary: 'Listar pedidos de compra' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('branchId') branchId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('supplierId') supplierId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: any,
  ): Promise<PaginatedResponseDto<PurchaseOrderResponseDto>> {
    return this.purchaseOrderService.findAll(
      branchId,
      status,
      supplierId,
      startDate,
      endDate,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 15,
      user,
    );
  }

  @Get(':id')
  @RequirePermission('purchase-orders.view')
  @ApiOperation({ summary: 'Buscar pedido por ID' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('purchase-orders.update')
  @ApiOperation({ summary: 'Atualizar pedido (apenas rascunho)' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePurchaseOrderDto,
    @CurrentUser() user: any,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.update(id, updateDto, user?.sub, user);
  }

  @Delete(':id')
  @RequirePermission('purchase-orders.delete')
  @ApiOperation({ summary: 'Excluir pedido (soft delete, apenas rascunho)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.purchaseOrderService.remove(id, user);
  }

  @Post(':id/receive')
  @RequirePermission('purchase-orders.receive')
  @ApiOperation({ summary: 'Registrar recebimento de itens' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  receive(
    @Param('id') id: string,
    @Body() receiveDto: ReceivePurchaseOrderDto,
    @CurrentUser() user: any,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.receive(id, receiveDto, user?.sub, user);
  }
}
