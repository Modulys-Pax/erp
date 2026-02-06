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
  Put,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AccountReceivableService } from './account-receivable.service';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/update-account-receivable.dto';
import { ReceiveAccountReceivableDto } from './dto/receive-account-receivable.dto';
import { AccountReceivableResponseDto } from './dto/account-receivable-response.dto';
import { AccountReceivableSummaryResponseDto } from './dto/account-receivable-summary-response.dto';
import { ReportByCustomerResponseDto } from './dto/report-by-customer-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Accounts Receivable')
@Controller('accounts-receivable')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AccountReceivableController {
  constructor(private readonly accountReceivableService: AccountReceivableService) {}

  @Post()
  @RequirePermission('accounts-receivable.create')
  @ApiOperation({ summary: 'Criar nova conta a receber' })
  @ApiResponse({
    status: 201,
    description: 'Conta a receber criada com sucesso',
    type: AccountReceivableResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa ou filial não encontrado',
  })
  create(
    @Body() createDto: CreateAccountReceivableDto,
    @CurrentUser() user: any,
  ): Promise<AccountReceivableResponseDto> {
    return this.accountReceivableService.create(createDto, user?.sub, user);
  }

  @Get('summary')
  @RequirePermission('accounts-receivable.view')
  @ApiOperation({ summary: 'Obter resumo de contas a receber' })
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
    description: 'Data inicial de vencimento (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Data final de vencimento (ISO string)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'RECEIVED', 'CANCELLED'],
    description: 'Filtrar por status',
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
    description: 'Resumo de contas a receber',
    type: AccountReceivableSummaryResponseDto,
  })
  getSummary(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ): Promise<AccountReceivableSummaryResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 15;
    return this.accountReceivableService.getAccountReceivableSummary(
      branchId,
      startDate,
      endDate,
      status,
      pageNum,
      limitNum,
      user,
    );
  }

  @Get('report/by-customer')
  @RequirePermission('accounts-receivable.view')
  @ApiOperation({ summary: 'Relatório de contas a receber por cliente' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Relatório agrupado por cliente' })
  getReportByCustomer(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ): Promise<ReportByCustomerResponseDto> {
    return this.accountReceivableService.getReportByCustomer(
      branchId,
      startDate,
      endDate,
      user,
    );
  }

  @Get()
  @RequirePermission('accounts-receivable.view')
  @ApiOperation({ summary: 'Listar todas as contas a receber' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    type: String,
    description: 'Filtrar por empresa',
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    type: String,
    description: 'Filtrar por filial',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'RECEIVED', 'CANCELLED'],
    description: 'Filtrar por status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Data inicial de vencimento (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Data final de vencimento (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de contas a receber',
    type: [AccountReceivableResponseDto],
  })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AccountReceivableResponseDto[]> {
    return this.accountReceivableService.findAll(companyId, branchId, status, startDate, endDate);
  }

  @Get(':id')
  @RequirePermission('accounts-receivable.view')
  @ApiOperation({ summary: 'Obter conta a receber por ID' })
  @ApiResponse({
    status: 200,
    description: 'Dados da conta a receber',
    type: AccountReceivableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<AccountReceivableResponseDto> {
    if (id === 'summary' || id === 'report') {
      throw new NotFoundException('Conta a receber não encontrada');
    }
    return this.accountReceivableService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('accounts-receivable.update')
  @ApiOperation({ summary: 'Atualizar conta a receber' })
  @ApiResponse({
    status: 200,
    description: 'Conta a receber atualizada com sucesso',
    type: AccountReceivableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Conta a receber já foi recebida',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountReceivableDto,
    @CurrentUser() user: any,
  ): Promise<AccountReceivableResponseDto> {
    return this.accountReceivableService.update(id, updateDto, user);
  }

  @Put(':id/receive')
  @RequirePermission('accounts-receivable.receive')
  @ApiOperation({ summary: 'Receber conta a receber' })
  @ApiResponse({
    status: 200,
    description: 'Conta a receber recebida com sucesso',
    type: AccountReceivableResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Conta a receber já foi recebida ou está cancelada',
  })
  receive(
    @Param('id') id: string,
    @Body() receiveDto: ReceiveAccountReceivableDto,
    @CurrentUser() user: any,
  ): Promise<AccountReceivableResponseDto> {
    return this.accountReceivableService.receive(id, receiveDto, user?.sub);
  }

  @Put(':id/cancel')
  @RequirePermission('accounts-receivable.update')
  @ApiOperation({ summary: 'Cancelar conta a receber' })
  @ApiResponse({
    status: 200,
    description: 'Conta a receber cancelada com sucesso',
    type: AccountReceivableResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Conta a receber já foi recebida ou está cancelada',
  })
  cancel(@Param('id') id: string): Promise<AccountReceivableResponseDto> {
    return this.accountReceivableService.cancel(id);
  }

  @Delete(':id')
  @RequirePermission('accounts-receivable.delete')
  @ApiOperation({ summary: 'Excluir conta a receber (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Conta a receber excluída com sucesso',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Conta a receber não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Conta a receber já foi recebida',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.accountReceivableService.remove(id, user);
  }
}
