import { ApiProperty } from '@nestjs/swagger';

export class AccountReceivableResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Recebimento de frete' })
  description: string;

  @ApiProperty({ example: 5000.0 })
  amount: number;

  @ApiProperty({ example: '2024-02-15T00:00:00.000Z' })
  dueDate: Date;

  @ApiProperty({ example: '2024-02-15T00:00:00.000Z', required: false })
  receiptDate?: Date;

  @ApiProperty({ enum: ['PENDING', 'RECEIVED', 'CANCELLED'], example: 'PENDING' })
  status: string;

  @ApiProperty({ example: 'uuid', required: false })
  originType?: string;

  @ApiProperty({ example: 'uuid', required: false })
  originId?: string;

  @ApiProperty({ example: 'NF-001234', required: false })
  documentNumber?: string;

  @ApiProperty({ example: 'Recebimento parcelado em 3x', required: false })
  notes?: string;

  @ApiProperty({ example: 'uuid', required: false })
  customerId?: string;

  @ApiProperty({ example: 'Cliente XYZ', required: false })
  customerName?: string;

  @ApiProperty({ example: 'uuid', required: false })
  costCenterId?: string;

  @ApiProperty({ example: 'Frota', required: false })
  costCenterName?: string;

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
