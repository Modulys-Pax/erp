import { PartialType } from '@nestjs/swagger';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {
  @ApiProperty({
    description: 'Status do pedido',
    enum: PurchaseOrderStatus,
    required: false,
  })
  @IsEnum(PurchaseOrderStatus, { message: 'Status inválido' })
  @IsOptional()
  status?: PurchaseOrderStatus;
}
