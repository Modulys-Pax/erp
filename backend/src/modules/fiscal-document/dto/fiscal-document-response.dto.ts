import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FiscalDocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['ENTRY', 'EXIT'] })
  type: string;

  @ApiProperty()
  number: string;

  @ApiPropertyOptional()
  series?: string;

  @ApiProperty()
  issueDate: Date;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ enum: ['REGISTERED', 'CANCELLED'] })
  status: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  branchId: string;

  @ApiPropertyOptional()
  supplierId?: string;

  @ApiPropertyOptional()
  supplierName?: string;

  @ApiPropertyOptional()
  customerId?: string;

  @ApiPropertyOptional()
  customerName?: string;

  @ApiPropertyOptional()
  accountPayableId?: string;

  @ApiPropertyOptional()
  accountReceivableId?: string;

  @ApiPropertyOptional()
  financialTransactionId?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  externalKey?: string;

  @ApiPropertyOptional()
  issuedAt?: Date;

  @ApiPropertyOptional()
  xmlPath?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  createdBy?: string;
}
