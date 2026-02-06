import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BankReconciliationService } from './bank-reconciliation.service';
import { CreateBankStatementDto } from './dto/create-bank-statement.dto';
import { CreateBankStatementItemDto } from './dto/create-bank-statement-item.dto';
import { ReconcileItemDto } from './dto/reconcile-item.dto';
import {
  BankStatementResponseDto,
  BankStatementItemResponseDto,
} from './dto/bank-reconciliation-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { getBranchId } from '../../shared/utils/branch-access.util';

@ApiTags('Bank Reconciliation')
@Controller('bank-statements')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  @Post()
  @RequirePermission('bank-reconciliation.manage')
  @ApiOperation({ summary: 'Criar extrato bancário' })
  @ApiResponse({ status: 201, description: 'Extrato criado' })
  create(
    @Body() dto: CreateBankStatementDto,
    @CurrentUser() user: any,
  ): Promise<BankStatementResponseDto> {
    return this.service.createStatement(dto, user?.sub, user);
  }

  @Get()
  @RequirePermission('bank-reconciliation.view')
  @ApiOperation({ summary: 'Listar extratos por filial' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'referenceMonth', required: false, type: Number })
  @ApiQuery({ name: 'referenceYear', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de extratos' })
  findAll(
    @Query('branchId') branchId: string | undefined,
    @Query('referenceMonth') referenceMonth?: string,
    @Query('referenceYear') referenceYear?: string,
    @CurrentUser() user?: any,
  ): Promise<BankStatementResponseDto[]> {
    const effectiveBranchId = getBranchId(branchId, user);
    const month = referenceMonth ? parseInt(referenceMonth, 10) : undefined;
    const year = referenceYear ? parseInt(referenceYear, 10) : undefined;
    return this.service.findAllStatements(effectiveBranchId, month, year, user);
  }

  @Get(':id')
  @RequirePermission('bank-reconciliation.view')
  @ApiOperation({ summary: 'Obter extrato por ID' })
  @ApiResponse({ status: 200, description: 'Extrato' })
  findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<BankStatementResponseDto> {
    return this.service.findOneStatement(id, user);
  }

  @Post(':id/items')
  @RequirePermission('bank-reconciliation.manage')
  @ApiOperation({ summary: 'Adicionar item ao extrato' })
  @ApiResponse({ status: 201, description: 'Item criado' })
  addItem(
    @Param('id') id: string,
    @Body() dto: CreateBankStatementItemDto,
    @CurrentUser() user: any,
  ): Promise<BankStatementItemResponseDto> {
    return this.service.addItem(id, dto, user);
  }

  @Get(':id/items')
  @RequirePermission('bank-reconciliation.view')
  @ApiOperation({ summary: 'Listar itens do extrato' })
  @ApiQuery({ name: 'reconciled', required: false, enum: ['true', 'false'] })
  @ApiResponse({ status: 200, description: 'Lista de itens' })
  getItems(
    @Param('id') id: string,
    @Query('reconciled') reconciled?: string,
    @CurrentUser() user?: any,
  ): Promise<BankStatementItemResponseDto[]> {
    const reconciledOnly =
      reconciled === 'true' ? true : reconciled === 'false' ? false : undefined;
    return this.service.getItems(id, reconciledOnly, user);
  }

  @Patch('items/:itemId/reconcile')
  @RequirePermission('bank-reconciliation.manage')
  @ApiOperation({ summary: 'Conciliar item com transação financeira' })
  @ApiResponse({ status: 200, description: 'Item conciliado' })
  reconcileItem(
    @Param('itemId') itemId: string,
    @Body() dto: ReconcileItemDto,
    @CurrentUser() user: any,
  ): Promise<BankStatementItemResponseDto> {
    return this.service.reconcileItem(itemId, dto, user);
  }

  @Patch('items/:itemId/unreconcile')
  @RequirePermission('bank-reconciliation.manage')
  @ApiOperation({ summary: 'Desfazer conciliação do item' })
  @ApiResponse({ status: 200, description: 'Conciliação removida' })
  unreconcileItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ): Promise<BankStatementItemResponseDto> {
    return this.service.unreconcileItem(itemId, user);
  }
}
