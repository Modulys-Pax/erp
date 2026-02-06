import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseOrderItemDto {
  @ApiProperty({ description: 'ID do produto', example: 'uuid' })
  @IsUUID('4', { message: 'ID do produto deve ser um UUID válido' })
  @IsNotEmpty({ message: 'Produto é obrigatório' })
  productId: string;

  @ApiProperty({ description: 'Quantidade', example: 10 })
  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @Min(0.01, { message: 'Quantidade deve ser maior que zero' })
  @IsNotEmpty({ message: 'Quantidade é obrigatória' })
  quantity: number;

  @ApiProperty({ description: 'Preço unitário', example: 25.5, required: false })
  @IsNumber({}, { message: 'Preço unitário deve ser um número' })
  @Min(0, { message: 'Preço unitário não pode ser negativo' })
  @IsOptional()
  unitPrice?: number;
}
