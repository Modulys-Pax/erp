import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { ResultByPeriodResponseDto } from './dto/result-by-period-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { getBranchId } from '../../shared/utils/branch-access.util';

@ApiTags('Financial')
@Controller('financial')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get('result-by-period')
  @RequirePermission('wallet.view')
  @ApiOperation({ summary: 'Resultado por período (DRE simplificada)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'ID da filial' })
  @ApiQuery({ name: 'month', required: true, description: 'Mês (1-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Ano' })
  @ApiQuery({ name: 'costCenterId', required: false, description: 'Filtrar por centro de custo' })
  @ApiResponse({ status: 200, description: 'Receitas, despesas e resultado do período' })
  async getResultByPeriod(
    @Query('branchId') branchId: string | undefined,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('costCenterId') costCenterId: string | undefined,
    @CurrentUser() user: any,
  ): Promise<ResultByPeriodResponseDto> {
    const effectiveBranchId = getBranchId(branchId, user);
    return this.financialService.getResultByPeriod(
      effectiveBranchId,
      month,
      year,
      costCenterId,
    );
  }
}
