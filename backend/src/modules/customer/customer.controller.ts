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
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @RequirePermission('customers.create')
  @ApiOperation({ summary: 'Criar novo cliente' })
  @ApiResponse({
    status: 201,
    description: 'Cliente criado com sucesso',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Empresa ou filial não encontrada' })
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: any,
  ): Promise<CustomerResponseDto> {
    return this.customerService.create(createCustomerDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('customers.view')
  @ApiOperation({ summary: 'Listar clientes (com paginação)' })
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
  @ApiResponse({ status: 200, description: 'Lista paginada de clientes' })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const include = includeDeleted === 'true';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.customerService.findAll(branchId, include, pageNum, limitNum);
  }

  @Get(':id')
  @RequirePermission('customers.view')
  @ApiOperation({ summary: 'Obter cliente por ID' })
  @ApiResponse({ status: 200, description: 'Dados do cliente', type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  findOne(@Param('id') id: string): Promise<CustomerResponseDto> {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('customers.update')
  @ApiOperation({ summary: 'Atualizar cliente' })
  @ApiResponse({ status: 200, description: 'Cliente atualizado', type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: any,
  ): Promise<CustomerResponseDto> {
    return this.customerService.update(id, updateCustomerDto, user);
  }

  @Delete(':id')
  @RequirePermission('customers.delete')
  @ApiOperation({ summary: 'Excluir cliente (soft delete)' })
  @ApiResponse({ status: 200, description: 'Cliente excluído' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.customerService.remove(id, user);
  }
}
