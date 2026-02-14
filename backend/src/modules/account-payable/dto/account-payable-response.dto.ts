import { ApiProperty } from '@nestjs/swagger';

export class AccountPayableResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Pagamento de fornecedor de peças' })
  description: string;

  @ApiProperty({ example: 2500.0 })
  amount: number;

  @ApiProperty({ example: '2024-02-15T00:00:00.000Z' })
  dueDate: Date;

  @ApiProperty({ example: '2024-02-15T00:00:00.000Z', required: false })
  paymentDate?: Date;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'CANCELLED'], example: 'PENDING' })
  status: string;

  @ApiProperty({ example: 'uuid', required: false })
  originType?: string;

  @ApiProperty({ example: 'uuid', required: false })
  originId?: string;

  @ApiProperty({ example: 'NF-001234', required: false })
  documentNumber?: string;

  @ApiProperty({ example: 'Pagamento parcelado em 3x', required: false })
  notes?: string;

  /** Para contas de folha (HR): nome do adicional para exibição ("Periculosidade" ou "Insalubridade (Médio)") */
  @ApiProperty({ required: false })
  riskAdditionLabel?: string;

  @ApiProperty({ example: 'uuid', required: false })
  supplierId?: string;

  @ApiProperty({ example: 'Fornecedor ABC', required: false })
  supplierName?: string;

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
