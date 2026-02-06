import {
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReceivePurchaseOrderItemDto {
  @ApiProperty({ description: 'ID do item do pedido', example: 'uuid' })
  @IsUUID('4', { message: 'ID do item deve ser um UUID válido' })
  itemId: string;

  @ApiProperty({ description: 'Quantidade recebida', example: 5 })
  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @Min(0, { message: 'Quantidade não pode ser negativa' })
  quantityReceived: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({
    description: 'Quantidades recebidas por item',
    type: [ReceivePurchaseOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items: ReceivePurchaseOrderItemDto[];

  @ApiProperty({
    description: 'Criar conta a pagar com o valor recebido',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  createAccountPayable?: boolean;
}
