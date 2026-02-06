import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'ID do fornecedor', example: 'uuid' })
  @IsUUID('4', { message: 'ID do fornecedor deve ser um UUID válido' })
  @IsNotEmpty({ message: 'Fornecedor é obrigatório' })
  supplierId: string;

  @ApiProperty({ description: 'ID da filial', example: 'uuid' })
  @IsUUID('4', { message: 'ID da filial deve ser um UUID válido' })
  @IsNotEmpty({ message: 'Filial é obrigatória' })
  branchId: string;

  @ApiProperty({
    description: 'Data prevista de entrega',
    example: '2024-03-15',
    required: false,
  })
  @IsDateString({}, { message: 'Data prevista deve ser uma data válida' })
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Itens do pedido',
    type: [CreatePurchaseOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
