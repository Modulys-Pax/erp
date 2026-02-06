import { ApiProperty } from '@nestjs/swagger';

export class SupplierResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Fornecedor ABC Ltda' })
  name: string;

  @ApiProperty({ example: '12.345.678/0001-90', required: false })
  document?: string;

  @ApiProperty({ example: 'contato@fornecedor.com.br', required: false })
  email?: string;

  @ApiProperty({ example: '(11) 98765-4321', required: false })
  phone?: string;

  @ApiProperty({ example: 'Rua das Flores, 123', required: false })
  address?: string;

  @ApiProperty({ example: 'São Paulo', required: false })
  city?: string;

  @ApiProperty({ example: 'SP', required: false })
  state?: string;

  @ApiProperty({ example: '01234-567', required: false })
  zipCode?: string;

  @ApiProperty({ example: 'uuid' })
  companyId: string;

  @ApiProperty({ example: 'uuid' })
  branchId: string;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty({ required: false })
  deletedAt?: Date;
}
