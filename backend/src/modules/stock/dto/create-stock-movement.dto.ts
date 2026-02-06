import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StockMovementType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
}

export class CreateStockMovementDto {
  @ApiProperty({
    description: 'Tipo de movimentação (ENTRY para entrada, EXIT para saída)',
    enum: StockMovementType,
    example: 'ENTRY',
    required: false,
  })
  @IsEnum(StockMovementType, { message: 'Tipo de movimentação inválido' })
  @IsOptional()
  type?: StockMovementType;

  @ApiProperty({ description: 'ID do produto', example: 'uuid' })
  @IsUUID('4', { message: 'ID do produto deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do produto é obrigatório' })
  productId: string;

  @ApiProperty({
    description: 'Quantidade movimentada',
    example: 10.5,
  })
  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @IsNotEmpty({ message: 'Quantidade é obrigatória' })
  @IsPositive({ message: 'Quantidade deve ser positiva' })
  quantity: number;

  @ApiProperty({
    description: 'Custo unitário (para entradas)',
    example: 25.5,
    required: false,
  })
  @IsNumber({}, { message: 'Custo unitário deve ser um número' })
  @IsOptional()
  @Min(0, { message: 'Custo unitário não pode ser negativo' })
  unitCost?: number;

  @ApiProperty({
    description: 'Número do documento (NF, etc)',
    example: 'NF-001',
    required: false,
  })
  @IsString({ message: 'Número do documento deve ser uma string' })
  @IsOptional()
  documentNumber?: string;

  @ApiProperty({
    description: 'Observações',
    example: 'Entrada de compra',
    required: false,
  })
  @IsString({ message: 'Observações deve ser uma string' })
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'ID da ordem de manutenção (se aplicável)',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID da ordem de manutenção deve ser um UUID válido' })
  @IsOptional()
  maintenanceOrderId?: string;

  @ApiProperty({
    description: 'ID do pedido de compra (se aplicável)',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID do pedido de compra deve ser um UUID válido' })
  @IsOptional()
  purchaseOrderId?: string;

  @ApiProperty({
    description: 'ID do pedido de venda (se aplicável)',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID do pedido de venda deve ser um UUID válido' })
  @IsOptional()
  salesOrderId?: string;

  @ApiProperty({
    description: 'ID da empresa',
    example: 'uuid',
  })
  @IsUUID('4', { message: 'ID da empresa deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID da empresa é obrigatório' })
  companyId: string;

  @ApiProperty({
    description: 'ID da filial',
    example: 'uuid',
  })
  @IsUUID('4', { message: 'ID da filial deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID da filial é obrigatório' })
  branchId: string;
}
