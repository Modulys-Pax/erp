import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import {
  WalletSummaryDto,
  WalletBalanceDto,
  BalanceAdjustmentResponseDto,
  CashFlowProjectionDto,
} from './dto/wallet-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { getBranchId } from '../../shared/utils/branch-access.util';

@ApiTags('Carteira')
@Controller('wallet')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('summary')
  @RequirePermission('wallet.view')
  @ApiOperation({ summary: 'Obter resumo da carteira para um mês/ano' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'ID da filial (admin pode especificar)',
  })
  @ApiQuery({ name: 'month', required: true, description: 'Mês (1-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Ano' })
  @ApiResponse({ status: 200, description: 'Resumo da carteira', type: WalletSummaryDto })
  async getSummary(
    @Query('branchId') branchId: string | undefined,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
    @CurrentUser() user: any,
  ): Promise<WalletSummaryDto> {
    const effectiveBranchId = getBranchId(branchId, user);
    return this.walletService.getWalletSummary(effectiveBranchId, month, year);
  }

  @Get('balance')
  @RequirePermission('wallet.view')
  @ApiOperation({ summary: 'Obter saldo atual da filial' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'ID da filial (admin pode especificar)',
  })
  @ApiResponse({ status: 200, description: 'Saldo da filial', type: WalletBalanceDto })
  async getBalance(
    @Query('branchId') branchId: string | undefined,
    @CurrentUser() user: any,
  ): Promise<WalletBalanceDto> {
    const effectiveBranchId = getBranchId(branchId, user);
    return this.walletService.getOrCreateBranchBalance(effectiveBranchId);
  }

  @Post('adjust')
  @RequirePermission('wallet.adjust')
  @ApiOperation({ summary: 'Ajustar saldo manualmente (apenas admin)' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'ID da filial (admin pode especificar)',
  })
  @ApiResponse({ status: 200, description: 'Saldo ajustado', type: WalletBalanceDto })
  async adjustBalance(
    @Query('branchId') branchId: string | undefined,
    @Body() adjustDto: AdjustBalanceDto,
    @CurrentUser() user: any,
  ): Promise<WalletBalanceDto> {
    const effectiveBranchId = getBranchId(branchId, user);
    const isAdmin = user?.role?.name === 'ADMIN' || user?.role?.name === 'admin';
    return this.walletService.adjustBalance(effectiveBranchId, adjustDto, user?.sub, isAdmin);
  }

  @Get('check-balance')
  @RequirePermission('wallet.view')
  @ApiOperation({ summary: 'Verificar se há saldo suficiente para um valor' })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID da filial' })
  @ApiQuery({ name: 'amount', required: true, description: 'Valor a verificar' })
  @ApiResponse({ status: 200, description: 'Resultado da verificação' })
  async checkBalance(
    @Query('branchId') branchId: string | undefined,
    @Query('amount') amount: string,
    @CurrentUser() user: any,
  ): Promise<{ sufficient: boolean; currentBalance: number; requiredAmount: number }> {
    const effectiveBranchId = getBranchId(branchId, user);
    const amountNumber = parseFloat(amount);
    const result = await this.walletService.checkSufficientBalance(effectiveBranchId, amountNumber);
    return {
      ...result,
      requiredAmount: amountNumber,
    };
  }

  @Get('cash-flow-projection')
  @RequirePermission('wallet.view')
  @ApiOperation({ summary: 'Fluxo de caixa projetado (próximos N meses)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID da filial' })
  @ApiQuery({ name: 'months', required: false, description: 'Número de meses (default 6)' })
  @ApiResponse({ status: 200, description: 'Projeção por mês', type: CashFlowProjectionDto })
  async getCashFlowProjection(
    @Query('branchId') branchId: string | undefined,
    @Query('months') monthsStr: string | undefined,
    @CurrentUser() user: any,
  ): Promise<CashFlowProjectionDto> {
    const effectiveBranchId = getBranchId(branchId, user);
    const months = monthsStr ? parseInt(monthsStr, 10) : 6;
    return this.walletService.getCashFlowProjection(effectiveBranchId, Math.min(Math.max(months, 1), 24));
  }

  @Get('history')
  @RequirePermission('wallet.view-history')
  @ApiOperation({ summary: 'Obter histórico de ajustes de saldo' })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID da filial' })
  @ApiQuery({ name: 'page', required: false, description: 'Página', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite por página', type: Number })
  @ApiResponse({ status: 200, description: 'Histórico de ajustes' })
  async getHistory(
    @Query('branchId') branchId: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: any,
  ): Promise<{
    data: BalanceAdjustmentResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const effectiveBranchId = getBranchId(branchId, user);
    return this.walletService.getBalanceHistory(effectiveBranchId, page, limit);
  }
}
