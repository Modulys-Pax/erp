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
import { CostCenterService } from './cost-center.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { CostCenterResponseDto } from './dto/cost-center-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Cost Centers')
@Controller('cost-centers')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class CostCenterController {
  constructor(private readonly costCenterService: CostCenterService) {}

  @Post()
  @RequirePermission('cost-centers.create')
  @ApiOperation({ summary: 'Criar novo centro de custo' })
  @ApiResponse({
    status: 201,
    description: 'Centro de custo criado com sucesso',
    type: CostCenterResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Empresa ou filial não encontrada' })
  @ApiResponse({ status: 409, description: 'Código já cadastrado para esta filial' })
  create(
    @Body() createCostCenterDto: CreateCostCenterDto,
    @CurrentUser() user: any,
  ): Promise<CostCenterResponseDto> {
    return this.costCenterService.create(createCostCenterDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('cost-centers.view')
  @ApiOperation({ summary: 'Listar centros de custo (com paginação)' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    type: String,
    description: 'Filtrar por filial',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de centros de custo' })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.costCenterService.findAll(branchId, pageNum, limitNum);
  }

  @Get(':id')
  @RequirePermission('cost-centers.view')
  @ApiOperation({ summary: 'Obter centro de custo por ID' })
  @ApiResponse({ status: 200, description: 'Dados do centro de custo', type: CostCenterResponseDto })
  @ApiResponse({ status: 404, description: 'Centro de custo não encontrado' })
  findOne(@Param('id') id: string): Promise<CostCenterResponseDto> {
    return this.costCenterService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('cost-centers.update')
  @ApiOperation({ summary: 'Atualizar centro de custo' })
  @ApiResponse({ status: 200, description: 'Centro de custo atualizado', type: CostCenterResponseDto })
  @ApiResponse({ status: 404, description: 'Centro de custo não encontrado' })
  @ApiResponse({ status: 409, description: 'Código já cadastrado para esta filial' })
  update(
    @Param('id') id: string,
    @Body() updateCostCenterDto: UpdateCostCenterDto,
    @CurrentUser() user: any,
  ): Promise<CostCenterResponseDto> {
    return this.costCenterService.update(id, updateCostCenterDto, user);
  }

  @Delete(':id')
  @RequirePermission('cost-centers.delete')
  @ApiOperation({ summary: 'Excluir centro de custo' })
  @ApiResponse({ status: 200, description: 'Centro de custo excluído' })
  @ApiResponse({ status: 404, description: 'Centro de custo não encontrado' })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.costCenterService.remove(id, user);
  }
}
