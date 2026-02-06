import { ApiProperty } from '@nestjs/swagger';

export class PurchaseOrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  purchaseOrderId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty({ description: 'Nome do produto' })
  productName?: string;

  @ApiProperty({ description: 'Código do produto' })
  productCode?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  quantityReceived: number;

  @ApiProperty({ required: false })
  unitPrice?: number;

  @ApiProperty({ required: false })
  total?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
