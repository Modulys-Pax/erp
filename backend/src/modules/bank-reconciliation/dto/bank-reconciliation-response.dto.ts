import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BankStatementItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bankStatementId: string;

  @ApiProperty()
  transactionDate: Date;

  @ApiProperty()
  amount: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: ['CREDIT', 'DEBIT'] })
  type: string;

  @ApiPropertyOptional()
  financialTransactionId?: string;

  @ApiProperty({ description: 'Indica se o item está conciliado' })
  reconciled: boolean;

  @ApiPropertyOptional({ description: 'Descrição da transação vinculada' })
  financialTransactionDescription?: string;

  @ApiProperty()
  createdAt: Date;
}

export class BankStatementResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  branchId: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  referenceMonth: number;

  @ApiProperty()
  referenceYear: number;

  @ApiPropertyOptional()
  uploadedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiProperty({ description: 'Quantidade de itens' })
  itemCount: number;

  @ApiProperty({ description: 'Quantidade de itens conciliados' })
  reconciledCount: number;
}
