import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResultByPeriodBreakdownItemDto {
  @ApiProperty({ description: 'Origem ou centro de custo' })
  key: string;

  @ApiProperty({ description: 'Label (ex: MANUAL, Frota)' })
  label: string;

  @ApiProperty({ description: 'Valor' })
  amount: number;
}

export class ResultByPeriodResponseDto {
  @ApiProperty({ description: 'ID da filial' })
  branchId: string;

  @ApiProperty({ description: 'Mês (1-12)' })
  month: number;

  @ApiProperty({ description: 'Ano' })
  year: number;

  @ApiPropertyOptional({ description: 'ID do centro de custo (se filtrado)' })
  costCenterId?: string;

  @ApiProperty({ description: 'Total receitas (FT INCOME no período)' })
  totalIncome: number;

  @ApiProperty({ description: 'Total despesas (FT EXPENSE no período)' })
  totalExpense: number;

  @ApiProperty({ description: 'Resultado (receitas - despesas)' })
  result: number;

  @ApiPropertyOptional({
    description: 'Quebra de receitas por originType',
    type: [ResultByPeriodBreakdownItemDto],
  })
  incomeByOrigin?: ResultByPeriodBreakdownItemDto[];

  @ApiPropertyOptional({
    description: 'Quebra de despesas por originType',
    type: [ResultByPeriodBreakdownItemDto],
  })
  expenseByOrigin?: ResultByPeriodBreakdownItemDto[];

  @ApiPropertyOptional({
    description: 'Quebra por centro de custo (quando não filtrado por centro)',
    type: [ResultByPeriodBreakdownItemDto],
  })
  byCostCenter?: ResultByPeriodBreakdownItemDto[];
}
