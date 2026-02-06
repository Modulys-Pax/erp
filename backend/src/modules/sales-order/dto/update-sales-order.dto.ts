import { PartialType } from '@nestjs/swagger';
import { CreateSalesOrderDto } from './create-sales-order.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SalesOrderStatus } from '@prisma/client';

export class UpdateSalesOrderDto extends PartialType(CreateSalesOrderDto) {
  @ApiProperty({
    description: 'Status do pedido',
    enum: SalesOrderStatus,
    required: false,
  })
  @IsEnum(SalesOrderStatus, { message: 'Status inválido' })
  @IsOptional()
  status?: SalesOrderStatus;
}
