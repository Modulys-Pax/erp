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
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @RequirePermission('suppliers.create')
  @ApiOperation({ summary: 'Criar novo fornecedor' })
  @ApiResponse({
    status: 201,
    description: 'Fornecedor criado com sucesso',
    type: SupplierResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Empresa ou filial não encontrada' })
  create(
    @Body() createSupplierDto: CreateSupplierDto,
    @CurrentUser() user: any,
  ): Promise<SupplierResponseDto> {
    return this.supplierService.create(createSupplierDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('suppliers.view')
  @ApiOperation({ summary: 'Listar fornecedores (com paginação)' })
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
    description: 'Incluir excluídos',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de fornecedores' })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const include = includeDeleted === 'true';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.supplierService.findAll(branchId, include, pageNum, limitNum);
  }

  @Get(':id')
  @RequirePermission('suppliers.view')
  @ApiOperation({ summary: 'Obter fornecedor por ID' })
  @ApiResponse({ status: 200, description: 'Dados do fornecedor', type: SupplierResponseDto })
  @ApiResponse({ status: 404, description: 'Fornecedor não encontrado' })
  findOne(@Param('id') id: string): Promise<SupplierResponseDto> {
    return this.supplierService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('suppliers.update')
  @ApiOperation({ summary: 'Atualizar fornecedor' })
  @ApiResponse({ status: 200, description: 'Fornecedor atualizado', type: SupplierResponseDto })
  @ApiResponse({ status: 404, description: 'Fornecedor não encontrado' })
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @CurrentUser() user: any,
  ): Promise<SupplierResponseDto> {
    return this.supplierService.update(id, updateSupplierDto, user);
  }

  @Delete(':id')
  @RequirePermission('suppliers.delete')
  @ApiOperation({ summary: 'Excluir fornecedor (soft delete)' })
  @ApiResponse({ status: 200, description: 'Fornecedor excluído' })
  @ApiResponse({ status: 404, description: 'Fornecedor não encontrado' })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.supplierService.remove(id, user);
  }
}
