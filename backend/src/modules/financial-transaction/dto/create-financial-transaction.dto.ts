import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType, TransactionOriginType } from '@prisma/client';

export { TransactionType, TransactionOriginType };

export class CreateFinancialTransactionDto {
  @ApiProperty({
    description: 'Tipo de transação',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType, { message: 'Tipo de transação inválido' })
  @IsNotEmpty({ message: 'Tipo de transação é obrigatório' })
  type: TransactionType;

  @ApiProperty({
    description: 'Valor da transação',
    example: 1500.5,
  })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @IsNotEmpty({ message: 'Valor é obrigatório' })
  amount: number;

  @ApiProperty({
    description: 'Descrição da transação',
    example: 'Pagamento de manutenção de veículo',
    required: false,
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Data da transação',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'Data da transação deve ser uma data válida' })
  @IsNotEmpty({ message: 'Data da transação é obrigatória' })
  transactionDate: string;

  @ApiProperty({
    description: 'Tipo de origem da transação',
    enum: TransactionOriginType,
    example: TransactionOriginType.MAINTENANCE,
    required: false,
  })
  @IsEnum(TransactionOriginType, { message: 'Tipo de origem inválido' })
  @IsOptional()
  originType?: TransactionOriginType;

  @ApiProperty({
    description: 'ID da origem (ex: maintenanceOrderId)',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID da origem deve ser um UUID válido' })
  @IsOptional()
  originId?: string;

  @ApiProperty({
    description: 'Número do documento (NF, etc)',
    example: 'NF-001234',
    required: false,
  })
  @IsString({ message: 'Número do documento deve ser uma string' })
  @IsOptional()
  documentNumber?: string;

  @ApiProperty({
    description: 'Observações',
    example: 'Pagamento realizado via PIX',
    required: false,
  })
  @IsString({ message: 'Observações deve ser uma string' })
  @IsOptional()
  notes?: string;

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

  @ApiProperty({
    description: 'ID do centro de custo',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID do centro de custo deve ser um UUID válido' })
  @IsOptional()
  costCenterId?: string;
}
