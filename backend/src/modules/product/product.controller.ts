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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductSummaryResponseDto } from './dto/product-summary-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Criar novo produto' })
  @ApiResponse({
    status: 201,
    description: 'Produto criado com sucesso',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Empresa ou filial não encontrada' })
  @ApiResponse({ status: 409, description: 'Código já cadastrado' })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: any,
  ): Promise<ProductResponseDto> {
    return this.productService.create(createProductDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Listar todos os produtos (com paginação)' })
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
    description: 'Incluir produtos excluídos',
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
    description: 'Lista paginada de produtos',
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
    return this.productService.findAll(branchId, include, pageNum, limitNum);
  }

  @Get('low-stock/list')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Listar produtos com estoque baixo ou crítico' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    type: String,
    description: 'Filtrar por filial',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de produtos com estoque baixo',
    type: [ProductResponseDto],
  })
  findLowStock(@Query('branchId') branchId?: string) {
    return this.productService.findLowStock(branchId);
  }

  @Get('summary/statistics')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Obter resumo estatístico de produtos usados em manutenções' })
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
    description: 'Resumo estatístico de produtos',
    type: ProductSummaryResponseDto,
  })
  getSummary(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ): Promise<ProductSummaryResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 15;
    const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
    const isAdmin = roleName?.toLowerCase() === 'admin';
    const effectiveBranchId = isAdmin ? branchId : (user?.branchId ?? branchId);
    return this.productService.getProductSummary(effectiveBranchId, startDate, endDate, pageNum, limitNum);
  }

  @Get(':id')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Obter produto por ID' })
  @ApiResponse({
    status: 200,
    description: 'Dados do produto',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<ProductResponseDto> {
    return this.productService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('products.update')
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiResponse({
    status: 200,
    description: 'Produto atualizado com sucesso',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 409, description: 'Código já cadastrado' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ): Promise<ProductResponseDto> {
    return this.productService.update(id, updateProductDto, user);
  }

  @Delete(':id')
  @RequirePermission('products.delete')
  @ApiOperation({ summary: 'Excluir produto (soft delete)' })
  @ApiResponse({ status: 200, description: 'Produto excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.productService.remove(id, user);
  }
}
