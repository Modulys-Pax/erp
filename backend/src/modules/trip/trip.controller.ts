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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TripService } from './trip.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripResponseDto } from './dto/trip-response.dto';
import { TripDetailResponseDto } from './dto/trip-detail-response.dto';
import { CreateTripExpenseTypeDto } from './dto/create-trip-expense-type.dto';
import { TripExpenseTypeResponseDto } from './dto/trip-expense-type-response.dto';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { TripExpenseResponseDto } from './dto/trip-expense-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Trips')
@Controller('trips')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @RequirePermission('trips.create')
  @ApiOperation({ summary: 'Cadastrar nova viagem (gera CR Prevista)' })
  @ApiResponse({ status: 201, description: 'Viagem criada', type: TripResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente, veículo ou motorista não encontrado' })
  create(
    @Body() createDto: CreateTripDto,
    @CurrentUser() user: any,
  ): Promise<TripResponseDto> {
    return this.tripService.create(createDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('trips.view')
  @ApiOperation({ summary: 'Listar viagens com filtros' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filtrar por filial' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filtrar por veículo' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filtrar por cliente' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    description: 'Filtrar por status',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Início do período (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fim do período (ISO)' })
  @ApiResponse({ status: 200, type: [TripResponseDto] })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ): Promise<TripResponseDto[]> {
    return this.tripService.findAll(
      branchId,
      vehicleId,
      customerId,
      status,
      startDate,
      endDate,
      user,
    );
  }

  @Get('expense-types')
  @RequirePermission('trips.view')
  @ApiOperation({ summary: 'Listar tipos de despesa de viagem' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filtrar por filial' })
  @ApiResponse({ status: 200, type: [TripExpenseTypeResponseDto] })
  findAllExpenseTypes(
    @Query('branchId') branchId?: string,
    @CurrentUser() user?: any,
  ): Promise<TripExpenseTypeResponseDto[]> {
    return this.tripService.findAllExpenseTypes(branchId, user);
  }

  @Post('expense-types')
  @RequirePermission('trips.create')
  @ApiOperation({ summary: 'Criar tipo de despesa de viagem' })
  @ApiResponse({ status: 201, type: TripExpenseTypeResponseDto })
  createExpenseType(
    @Body() dto: CreateTripExpenseTypeDto,
    @CurrentUser() user: any,
  ): Promise<TripExpenseTypeResponseDto> {
    return this.tripService.createExpenseType(dto, user?.sub, user);
  }

  @Get('vehicle-profit')
  @RequirePermission('trips.view')
  @ApiOperation({ summary: 'Lucro acumulado por veículo (viagens concluídas - despesas - manutenção)' })
  @ApiQuery({ name: 'vehicleId', required: true, description: 'ID do veículo' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Início do período (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fim do período (ISO)' })
  @ApiResponse({ status: 200 })
  getVehicleProfit(
    @Query('vehicleId') vehicleId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.tripService.getVehicleProfit(vehicleId, startDate, endDate, user);
  }

  @Get(':id')
  @RequirePermission('trips.view')
  @ApiOperation({ summary: 'Buscar viagem por ID (com despesas, total de despesas, lucro e margem)' })
  @ApiResponse({ status: 200, type: TripDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Viagem não encontrada' })
  findOne(@Param('id') id: string, @CurrentUser() user?: any): Promise<TripDetailResponseDto> {
    return this.tripService.findOne(id, user);
  }

  @Get(':id/expenses')
  @RequirePermission('trips.view')
  @ApiOperation({ summary: 'Listar despesas da viagem' })
  @ApiResponse({ status: 200, type: [TripExpenseResponseDto] })
  findExpensesByTrip(
    @Param('id') tripId: string,
    @CurrentUser() user?: any,
  ): Promise<TripExpenseResponseDto[]> {
    return this.tripService.findExpensesByTrip(tripId, user);
  }

  @Post(':id/expenses')
  @RequirePermission('trips.create')
  @ApiOperation({ summary: 'Adicionar despesa à viagem (gera Conta a Pagar vinculada ao veículo)' })
  @ApiResponse({ status: 201, type: TripExpenseResponseDto })
  @ApiResponse({ status: 404, description: 'Viagem ou tipo de despesa não encontrado' })
  createExpense(
    @Param('id') tripId: string,
    @Body() dto: CreateTripExpenseDto,
    @CurrentUser() user: any,
  ): Promise<TripExpenseResponseDto> {
    return this.tripService.createExpense(tripId, dto, user?.sub, user);
  }

  @Delete(':id/expenses/:expenseId')
  @RequirePermission('trips.update')
  @ApiOperation({ summary: 'Remover despesa da viagem (desvincula a CP da viagem)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Viagem ou despesa não encontrada' })
  removeExpense(
    @Param('id') tripId: string,
    @Param('expenseId') expenseId: string,
    @CurrentUser() user?: any,
  ): Promise<void> {
    return this.tripService.removeExpense(tripId, expenseId, user);
  }

  @Patch(':id')
  @RequirePermission('trips.update')
  @ApiOperation({ summary: 'Atualizar viagem (ao marcar Concluída, CR vira Realizada)' })
  @ApiResponse({ status: 200, type: TripResponseDto })
  @ApiResponse({ status: 404, description: 'Viagem não encontrada' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTripDto,
    @CurrentUser() user: any,
  ): Promise<TripResponseDto> {
    return this.tripService.update(id, updateDto, user?.sub, user);
  }

  @Delete(':id')
  @RequirePermission('trips.delete')
  @ApiOperation({ summary: 'Excluir viagem (soft delete)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Viagem não encontrada' })
  remove(@Param('id') id: string, @CurrentUser() user?: any): Promise<void> {
    return this.tripService.remove(id, user);
  }
}
