import { ApiProperty } from '@nestjs/swagger';

export class SalesOrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  salesOrderId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty({ description: 'Nome do produto' })
  productName?: string;

  @ApiProperty({ description: 'Código do produto' })
  productCode?: string;

  @ApiProperty({ description: 'Unidade de medida do produto (ex: UN, L, KG)', required: false })
  productUnit?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  quantityInvoiced: number;

  @ApiProperty({ required: false })
  unitPrice?: number;

  @ApiProperty({ required: false })
  total?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
