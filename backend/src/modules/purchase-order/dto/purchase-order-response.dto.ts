import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderItemResponseDto } from './purchase-order-item-response.dto';
import { PurchaseOrderStatus } from '@prisma/client';

export class PurchaseOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  number: string;

  @ApiProperty()
  supplierId: string;

  @ApiProperty({ description: 'Nome do fornecedor' })
  supplierName?: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty({ required: false })
  expectedDeliveryDate?: Date;

  @ApiProperty({ enum: PurchaseOrderStatus })
  status: PurchaseOrderStatus;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty({ type: [PurchaseOrderItemResponseDto] })
  items: PurchaseOrderItemResponseDto[];

  @ApiProperty({ description: 'Valor total do pedido (soma dos itens)' })
  totalAmount?: number;
}
