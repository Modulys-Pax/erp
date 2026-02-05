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
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { UpdateVehicleKmDto } from './dto/update-vehicle-km.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { VehicleStatusHistoryResponseDto } from './dto/vehicle-status-history-response.dto';
import { VehicleCostsResponseDto } from './dto/vehicle-costs-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @RequirePermission('vehicles.create')
  @ApiOperation({ summary: 'Criar novo veículo' })
  @ApiResponse({
    status: 201,
    description: 'Veículo criado com sucesso',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Empresa ou filial não encontrada' })
  @ApiResponse({ status: 409, description: 'Placa já cadastrada' })
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser() user: any,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.create(createVehicleDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('vehicles.view')
  @ApiOperation({ summary: 'Listar todos os veículos (com paginação)' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    type: String,
    description: 'Filtrar por filial',
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Incluir veículos excluídos',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página (padrão: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de veículos',
  })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const include = includeDeleted === 'true';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.vehicleService.findAll(branchId, include, pageNum, limitNum);
  }

  @Get('costs/summary')
  @RequirePermission('vehicles.view-costs')
  @ApiOperation({ summary: 'Obter dashboard de custos com veículos' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    type: String,
    description: 'Filtrar por filial',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Data inicial (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Data final (ISO string)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página (padrão: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 15)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard de custos com veículos',
    type: VehicleCostsResponseDto,
  })
  getCosts(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<VehicleCostsResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 15;
    return this.vehicleService.getVehicleCosts(branchId, startDate, endDate, pageNum, limitNum);
  }

  @Get('plates/by-branch')
  @RequirePermission('vehicles.view')
  @ApiOperation({ summary: 'Listar placas da filial (para seleção de composição)' })
  @ApiQuery({
    name: 'branchId',
    required: true,
    type: String,
    description: 'ID da filial',
  })
  @ApiResponse({ status: 200, description: 'Lista de placas (plate, type) da filial' })
  getPlatesByBranch(
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.vehicleService.getPlatesByBranch(branchId, user);
  }

  @Get(':id')
  @RequirePermission('vehicles.view')
  @ApiOperation({ summary: 'Obter veículo por ID' })
  @ApiResponse({
    status: 200,
    description: 'Dados do veículo',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<VehicleResponseDto> {
    return this.vehicleService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('vehicles.update')
  @ApiOperation({ summary: 'Atualizar veículo' })
  @ApiResponse({
    status: 200,
    description: 'Veículo atualizado com sucesso',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @ApiResponse({ status: 409, description: 'Placa já cadastrada' })
  update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: any,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.update(id, updateVehicleDto, user?.sub, user);
  }

  @Patch(':id/km')
  @RequirePermission('vehicles.update-km')
  @ApiOperation({ summary: 'Atualizar quilometragem do veículo' })
  @ApiResponse({
    status: 200,
    description: 'Quilometragem atualizada com sucesso',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @ApiResponse({
    status: 400,
    description: 'Quilometragem inválida (menor que a anterior)',
  })
  updateKm(
    @Param('id') id: string,
    @Body() updateKmDto: UpdateVehicleKmDto,
    @CurrentUser() user: any,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.updateKm(id, updateKmDto, user?.sub);
  }

  @Patch(':id/status')
  @RequirePermission('vehicles.update-status')
  @ApiOperation({ summary: 'Atualizar status do veículo' })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @ApiResponse({ status: 400, description: 'Status inválido' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateVehicleStatusDto,
    @CurrentUser() user: any,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.updateStatus(id, updateStatusDto, user?.sub);
  }

  @Get(':id/history')
  @RequirePermission('vehicles.view')
  @ApiOperation({ summary: 'Obter histórico de status do veículo' })
  @ApiResponse({
    status: 200,
    description: 'Histórico de status',
    type: [VehicleStatusHistoryResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  getStatusHistory(@Param('id') id: string): Promise<VehicleStatusHistoryResponseDto[]> {
    return this.vehicleService.getStatusHistory(id);
  }

  @Delete(':id')
  @RequirePermission('vehicles.delete')
  @ApiOperation({ summary: 'Excluir veículo (soft delete)' })
  @ApiResponse({ status: 200, description: 'Veículo excluído com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.vehicleService.remove(id, user);
  }
}
