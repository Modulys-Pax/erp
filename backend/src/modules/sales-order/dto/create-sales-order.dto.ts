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
import { CreateSalesOrderItemDto } from './create-sales-order-item.dto';

export class CreateSalesOrderDto {
  @ApiProperty({ description: 'ID do cliente', example: 'uuid' })
  @IsUUID('4', { message: 'ID do cliente deve ser um UUID válido' })
  @IsNotEmpty({ message: 'Cliente é obrigatório' })
  customerId: string;

  @ApiProperty({ description: 'ID da filial', example: 'uuid' })
  @IsUUID('4', { message: 'ID da filial deve ser um UUID válido' })
  @IsNotEmpty({ message: 'Filial é obrigatória' })
  branchId: string;

  @ApiProperty({
    description: 'Data do pedido',
    example: '2024-03-15',
    required: false,
  })
  @IsDateString({}, { message: 'Data do pedido deve ser uma data válida' })
  @IsOptional()
  orderDate?: string;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Itens do pedido',
    type: [CreateSalesOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items: CreateSalesOrderItemDto[];
}
