import { ApiProperty } from '@nestjs/swagger';

export class BalanceAdjustmentResponseDto {
  @ApiProperty({ description: 'ID do ajuste' })
  id: string;

  @ApiProperty({ description: 'Saldo anterior' })
  previousBalance: number;

  @ApiProperty({ description: 'Novo saldo' })
  newBalance: number;

  @ApiProperty({ description: 'Tipo do ajuste' })
  adjustmentType: string;

  @ApiProperty({ description: 'Motivo do ajuste', nullable: true })
  reason: string | null;

  @ApiProperty({ description: 'Data do ajuste' })
  createdAt: Date;

  @ApiProperty({ description: 'Usuário que fez o ajuste', nullable: true })
  createdBy: string | null;
}

export class MonthlyMovementDto {
  @ApiProperty({ description: 'ID da movimentação' })
  id: string;

  @ApiProperty({ description: 'Descrição' })
  description: string;

  @ApiProperty({ description: 'Valor' })
  amount: number;

  @ApiProperty({ description: 'Data de vencimento' })
  dueDate: Date;

  @ApiProperty({ description: 'Data de pagamento/recebimento' })
  paymentDate?: Date;

  @ApiProperty({ description: 'Status (PENDING, PAID, RECEIVED, etc)' })
  status: string;

  @ApiProperty({ description: 'Tipo de origem (MAINTENANCE, STOCK, HR, MANUAL)' })
  originType?: string;

  @ApiProperty({ description: 'Número do documento' })
  documentNumber?: string;

  @ApiProperty({ description: 'Tipo (payable ou receivable)' })
  type: 'payable' | 'receivable';
}

export class WalletSummaryDto {
  @ApiProperty({ description: 'ID da filial' })
  branchId: string;

  @ApiProperty({ description: 'Nome da filial' })
  branchName: string;

  @ApiProperty({ description: 'Saldo atual em caixa' })
  currentBalance: number;

  @ApiProperty({ description: 'Total de entradas realizadas no período' })
  totalIncome: number;

  @ApiProperty({ description: 'Total de saídas realizadas no período' })
  totalExpense: number;

  @ApiProperty({ description: 'Total de contas a receber pendentes no período' })
  pendingReceivables: number;

  @ApiProperty({ description: 'Total de contas a pagar pendentes no período' })
  pendingPayables: number;

  @ApiProperty({
    description: 'Projeção de saldo (saldo atual + pendentes a receber - pendentes a pagar)',
  })
  projectedBalance: number;

  @ApiProperty({ description: 'Lucro/Prejuízo do período (entradas - saídas realizadas)' })
  periodProfit: number;

  @ApiProperty({ description: 'Movimentações do período', type: [MonthlyMovementDto] })
  movements: MonthlyMovementDto[];

  @ApiProperty({ description: 'Mês de referência' })
  referenceMonth: number;

  @ApiProperty({ description: 'Ano de referência' })
  referenceYear: number;
}

export class CashFlowProjectionMonthDto {
  @ApiProperty({ description: 'Ano e mês (YYYY-MM)' })
  yearMonth: string;

  @ApiProperty({ description: 'Saldo inicial do mês' })
  initialBalance: number;

  @ApiProperty({ description: 'Total de recebimentos previstos (CR pendentes com vencimento no mês)' })
  totalExpectedReceipts: number;

  @ApiProperty({ description: 'Total de pagamentos previstos (CP pendentes com vencimento no mês)' })
  totalExpectedPayments: number;

  @ApiProperty({ description: 'Saldo projetado no fim do mês' })
  projectedEndBalance: number;
}

export class CashFlowProjectionDto {
  @ApiProperty({ description: 'ID da filial' })
  branchId: string;

  @ApiProperty({ description: 'Projeção por mês', type: [CashFlowProjectionMonthDto] })
  months: CashFlowProjectionMonthDto[];
}

export class WalletBalanceDto {
  @ApiProperty({ description: 'ID do saldo' })
  id: string;

  @ApiProperty({ description: 'ID da filial' })
  branchId: string;

  @ApiProperty({ description: 'Saldo atual' })
  balance: number;

  @ApiProperty({ description: 'Data da última atualização' })
  updatedAt: Date;

  @ApiProperty({ description: 'Histórico de ajustes', type: [BalanceAdjustmentResponseDto] })
  adjustments?: BalanceAdjustmentResponseDto[];
}
