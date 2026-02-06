import { ApiProperty } from '@nestjs/swagger';

export class FinancialTransactionResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'], example: 'EXPENSE' })
  type: string;

  @ApiProperty({ example: 1500.5 })
  amount: number;

  @ApiProperty({ example: 'Pagamento de manutenção de veículo', required: false })
  description?: string;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  transactionDate: Date;

  @ApiProperty({ example: 'uuid', required: false })
  originType?: string;

  @ApiProperty({ example: 'uuid', required: false })
  originId?: string;

  @ApiProperty({ example: 'NF-001234', required: false })
  documentNumber?: string;

  @ApiProperty({ example: 'Pagamento realizado via PIX', required: false })
  notes?: string;

  @ApiProperty({ example: 'uuid', required: false })
  costCenterId?: string;

  @ApiProperty({ example: 'uuid' })
  companyId: string;

  @ApiProperty({ example: 'uuid' })
  branchId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;
}
