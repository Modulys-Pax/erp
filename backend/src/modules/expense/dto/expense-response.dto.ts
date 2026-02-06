import { ApiProperty } from '@nestjs/swagger';
import { ExpenseType } from './create-expense.dto';

export class ExpenseResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid', required: false })
  employeeId?: string;

  @ApiProperty({ example: 'João Silva', required: false })
  employeeName?: string;

  @ApiProperty({ enum: ExpenseType, example: ExpenseType.TRANSPORT })
  type: ExpenseType;

  @ApiProperty({ example: 150.0 })
  amount: number;

  @ApiProperty({ example: 'Passagem aérea para reunião em São Paulo' })
  description: string;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  expenseDate: Date;

  @ApiProperty({ example: 'REC-001234', required: false })
  documentNumber?: string;

  @ApiProperty({ example: 'uuid', required: false })
  costCenterId?: string;

  @ApiProperty({ example: 'uuid' })
  companyId: string;

  @ApiProperty({ example: 'uuid' })
  branchId: string;

  @ApiProperty({ example: 'uuid', required: false })
  financialTransactionId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty({ required: false })
  deletedAt?: Date;
}
