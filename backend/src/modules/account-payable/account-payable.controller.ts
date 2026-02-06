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
import { AccountPayableService } from './account-payable.service';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/update-account-payable.dto';
import { PayAccountPayableDto } from './dto/pay-account-payable.dto';
import { AccountPayableResponseDto } from './dto/account-payable-response.dto';
import { FinancialAccountsSummaryResponseDto } from './dto/financial-accounts-summary-response.dto';
import { AccountPayableSummaryResponseDto } from './dto/account-payable-summary-response.dto';
import { ReportBySupplierResponseDto } from './dto/report-by-supplier-response.dto';
import {
  ProcessPayrollDto,
  ProcessPayrollResultDto,
  PayrollEmployeeDetail,
} from './dto/process-payroll.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Accounts Payable')
@Controller('accounts-payable')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AccountPayableController {
  constructor(private readonly accountPayableService: AccountPayableService) {}

  @Post()
  @RequirePermission('accounts-payable.create')
  @ApiOperation({ summary: 'Criar nova conta a pagar' })
  @ApiResponse({
    status: 201,
    description: 'Conta a pagar criada com sucesso',
    type: AccountPayableResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa ou filial não encontrado',
  })
  create(
    @Body() createDto: CreateAccountPayableDto,
    @CurrentUser() user: any,
  ): Promise<AccountPayableResponseDto> {
    return this.accountPayableService.create(createDto, user?.sub, user);
  }

  @Get('summary/payable')
  @RequirePermission('accounts-payable.view-summary')
  @ApiOperation({ summary: 'Obter resumo de contas a pagar' })
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
    enum: ['PENDING', 'PAID', 'CANCELLED'],
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
  @ApiQuery({
    name: 'originType',
    required: false,
    enum: ['STOCK', 'MAINTENANCE', 'SALARY', 'VACATION', 'BENEFIT', 'MANUAL'],
    description: 'Filtrar por tipo de origem',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo de contas a pagar',
    type: AccountPayableSummaryResponseDto,
  })
  getPayableSummary(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('originType') originType?: string,
    @CurrentUser() user?: any,
  ): Promise<AccountPayableSummaryResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 15;
    return this.accountPayableService.getAccountPayableSummary(
      branchId,
      startDate,
      endDate,
      status,
      pageNum,
      limitNum,
      user,
      originType,
    );
  }

  @Get('summary')
  @RequirePermission('accounts-payable.view-summary')
  @ApiOperation({ summary: 'Obter dashboard de resumo financeiro (contas a pagar e receber)' })
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
    name: 'payablePage',
    required: false,
    type: Number,
    description: 'Página de contas a pagar (padrão: 1)',
  })
  @ApiQuery({
    name: 'receivablePage',
    required: false,
    type: Number,
    description: 'Página de contas a receber (padrão: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 15)',
  })
  @ApiQuery({
    name: 'filterDateType',
    required: false,
    enum: ['dueDate', 'createdAt'],
    description: 'Tipo de filtro de data: dueDate (vencimento) ou createdAt (cadastro)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard de resumo financeiro',
    type: FinancialAccountsSummaryResponseDto,
  })
  getSummary(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('payablePage') payablePage?: string,
    @Query('receivablePage') receivablePage?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
    @Query('filterDateType') filterDateType?: 'dueDate' | 'createdAt',
  ): Promise<FinancialAccountsSummaryResponseDto> {
    const payablePageNum = payablePage ? parseInt(payablePage, 10) : 1;
    const receivablePageNum = receivablePage ? parseInt(receivablePage, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 15;
    return this.accountPayableService.getFinancialAccountsSummary(
      branchId,
      startDate,
      endDate,
      payablePageNum,
      receivablePageNum,
      limitNum,
      user,
      filterDateType === 'createdAt' ? 'createdAt' : 'dueDate',
    );
  }

  @Post('payroll/process')
  @RequirePermission('payroll.process')
  @ApiOperation({
    summary: 'Processar folha de pagamento (gera contas a pagar para funcionários)',
  })
  @ApiResponse({
    status: 201,
    description: 'Folha de pagamento processada com sucesso',
    type: ProcessPayrollResultDto,
  })
  @ApiResponse({ status: 404, description: 'Filial não encontrada' })
  @ApiResponse({ status: 400, description: 'Período inválido' })
  processPayroll(
    @Body() processDto: ProcessPayrollDto,
    @CurrentUser() user: any,
  ): Promise<ProcessPayrollResultDto> {
    return this.accountPayableService.processPayroll(processDto, user?.sub, user);
  }

  @Get('payroll/preview')
  @RequirePermission('payroll.view')
  @ApiOperation({ summary: 'Obter prévia da folha de pagamento (sem criar contas)' })
  @ApiQuery({
    name: 'referenceMonth',
    required: true,
    type: Number,
    description: 'Mês de referência (1-12)',
  })
  @ApiQuery({
    name: 'referenceYear',
    required: true,
    type: Number,
    description: 'Ano de referência',
  })
  @ApiQuery({
    name: 'branchId',
    required: true,
    type: String,
    description: 'ID da filial',
  })
  @ApiResponse({
    status: 200,
    description: 'Prévia da folha de pagamento',
    type: [PayrollEmployeeDetail],
  })
  getPayrollPreview(
    @Query('referenceMonth') referenceMonth: string,
    @Query('referenceYear') referenceYear: string,
    @Query('branchId') branchId: string,
  ): Promise<PayrollEmployeeDetail[]> {
    return this.accountPayableService.getPayrollPreview(
      parseInt(referenceMonth, 10),
      parseInt(referenceYear, 10),
      branchId,
    );
  }

  @Get()
  @RequirePermission('accounts-payable.view')
  @ApiOperation({ summary: 'Listar todas as contas a pagar' })
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
    enum: ['PENDING', 'PAID', 'CANCELLED'],
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
    description: 'Lista de contas a pagar',
    type: [AccountPayableResponseDto],
  })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AccountPayableResponseDto[]> {
    return this.accountPayableService.findAll(companyId, branchId, status, startDate, endDate);
  }

  @Get(':id')
  @RequirePermission('accounts-payable.view')
  @ApiOperation({ summary: 'Obter conta a pagar por ID' })
  @ApiResponse({
    status: 200,
    description: 'Dados da conta a pagar',
    type: AccountPayableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Conta a pagar não encontrada' })
  findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<AccountPayableResponseDto> {
    // Prevenir que 'summary' seja tratado como ID
    if (id === 'summary' || id === 'report') {
      throw new NotFoundException('Conta a pagar não encontrada');
    }
    return this.accountPayableService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('accounts-payable.update')
  @ApiOperation({ summary: 'Atualizar conta a pagar' })
  @ApiResponse({
    status: 200,
    description: 'Conta a pagar atualizada com sucesso',
    type: AccountPayableResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Conta a pagar não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Conta a pagar já foi paga',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountPayableDto,
    @CurrentUser() user: any,
  ): Promise<AccountPayableResponseDto> {
    return this.accountPayableService.update(id, updateDto, user);
  }

  @Put(':id/pay')
  @RequirePermission('accounts-payable.pay')
  @ApiOperation({ summary: 'Pagar conta a pagar' })
  @ApiResponse({
    status: 200,
    description: 'Conta a pagar paga com sucesso',
    type: AccountPayableResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conta a pagar não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Conta a pagar já foi paga ou está cancelada',
  })
  pay(
    @Param('id') id: string,
    @Body() payDto: PayAccountPayableDto,
    @CurrentUser() user: any,
  ): Promise<AccountPayableResponseDto> {
    return this.accountPayableService.pay(id, payDto, user?.sub);
  }

  @Put(':id/cancel')
  @RequirePermission('accounts-payable.update')
  @ApiOperation({ summary: 'Cancelar conta a pagar' })
  @ApiResponse({
    status: 200,
    description: 'Conta a pagar cancelada com sucesso',
    type: AccountPayableResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conta a pagar não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Conta a pagar já foi paga ou está cancelada',
  })
  cancel(@Param('id') id: string): Promise<AccountPayableResponseDto> {
    return this.accountPayableService.cancel(id);
  }

  @Delete(':id')
  @RequirePermission('accounts-payable.delete')
  @ApiOperation({ summary: 'Excluir conta a pagar (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Conta a pagar excluída com sucesso',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Conta a pagar não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Conta a pagar já foi paga',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.accountPayableService.remove(id, user);
  }
}
