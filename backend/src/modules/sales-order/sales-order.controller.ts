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
import { SalesOrderService } from './sales-order.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { InvoiceSalesOrderDto } from './dto/invoice-sales-order.dto';
import { SalesOrderResponseDto } from './dto/sales-order-response.dto';
import { PaginatedResponseDto } from '../../shared/dto/paginated-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Sales Orders')
@Controller('sales-orders')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class SalesOrderController {
  constructor(private readonly salesOrderService: SalesOrderService) {}

  @Post()
  @RequirePermission('sales-orders.create')
  @ApiOperation({ summary: 'Criar pedido de venda' })
  @ApiResponse({ status: 201, description: 'Pedido criado', type: SalesOrderResponseDto })
  create(
    @Body() createDto: CreateSalesOrderDto,
    @CurrentUser() user: any,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrderService.create(createDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('sales-orders.view')
  @ApiOperation({ summary: 'Listar pedidos de venda' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('branchId') branchId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('customerId') customerId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: any,
  ): Promise<PaginatedResponseDto<SalesOrderResponseDto>> {
    return this.salesOrderService.findAll(
      branchId,
      status,
      customerId,
      startDate,
      endDate,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 15,
      user,
    );
  }

  @Get(':id')
  @RequirePermission('sales-orders.view')
  @ApiOperation({ summary: 'Buscar pedido por ID' })
  @ApiResponse({ status: 200, type: SalesOrderResponseDto })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrderService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('sales-orders.update')
  @ApiOperation({ summary: 'Atualizar pedido (apenas rascunho)' })
  @ApiResponse({ status: 200, type: SalesOrderResponseDto })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSalesOrderDto,
    @CurrentUser() user: any,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrderService.update(id, updateDto, user?.sub, user);
  }

  @Delete(':id')
  @RequirePermission('sales-orders.delete')
  @ApiOperation({ summary: 'Excluir pedido (soft delete, apenas rascunho)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.salesOrderService.remove(id, user);
  }

  @Post(':id/invoice')
  @RequirePermission('sales-orders.invoice')
  @ApiOperation({ summary: 'Faturar pedido (gerar CR e opcionalmente baixa de estoque)' })
  @ApiResponse({ status: 200, type: SalesOrderResponseDto })
  invoice(
    @Param('id') id: string,
    @Body() invoiceDto: InvoiceSalesOrderDto,
    @CurrentUser() user: any,
  ): Promise<SalesOrderResponseDto> {
    return this.salesOrderService.invoice(id, invoiceDto, user?.sub, user);
  }
}
