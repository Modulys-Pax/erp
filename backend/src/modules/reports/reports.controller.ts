import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('vehicle-profitability')
  @RequirePermission('reports.view')
  @ApiOperation({ summary: 'Rentabilidade por veículo (receita, despesas viagem, manutenção, lucro, margem)' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200 })
  getVehicleProfitability(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.reportsService.getVehicleProfitabilityReport(
      branchId,
      startDate,
      endDate,
      user,
    );
  }

  @Get('revenue-by-customer')
  @RequirePermission('reports.view')
  @ApiOperation({ summary: 'Receita por cliente (viagens concluídas no período)' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200 })
  getRevenueByCustomer(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.reportsService.getRevenueByCustomerReport(
      branchId,
      startDate,
      endDate,
      user,
    );
  }

  @Get('operational-cost')
  @RequirePermission('reports.view')
  @ApiOperation({ summary: 'Custo operacional por veículo (despesas viagem + manutenção)' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200 })
  getOperationalCost(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.reportsService.getOperationalCostReport(
      branchId,
      startDate,
      endDate,
      user,
    );
  }

  @Get('fleet-margin')
  @RequirePermission('reports.view')
  @ApiOperation({ summary: 'Margem da frota (resumo agregado)' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200 })
  getFleetMargin(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.reportsService.getFleetMarginReport(
      branchId,
      startDate,
      endDate,
      user,
    );
  }

  @Get('by-cost-center')
  @RequirePermission('reports.view')
  @ApiOperation({ summary: 'Receita e despesa por centro de custo no período' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200 })
  getByCostCenter(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.reportsService.getCostCenterReport(
      branchId,
      startDate,
      endDate,
      user,
    );
  }

  @Get('dashboard-rentability')
  @RequirePermission('dashboard.view')
  @ApiOperation({ summary: 'Indicadores de rentabilidade para o dashboard (mês atual)' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200 })
  getDashboardRentability(
    @Query('branchId') branchId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.reportsService.getDashboardRentability(branchId, user);
  }
}
