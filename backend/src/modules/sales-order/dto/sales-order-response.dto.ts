import { ApiProperty } from '@nestjs/swagger';
import { SalesOrderItemResponseDto } from './sales-order-item-response.dto';
import { SalesOrderStatus } from '@prisma/client';

export class SalesOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  number: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty({ description: 'Nome do cliente' })
  customerName?: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty({ required: false })
  orderDate?: Date;

  @ApiProperty({ enum: SalesOrderStatus })
  status: SalesOrderStatus;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty({ type: [SalesOrderItemResponseDto] })
  items: SalesOrderItemResponseDto[];

  @ApiProperty({ description: 'Valor total do pedido (soma dos itens)' })
  totalAmount?: number;
}
