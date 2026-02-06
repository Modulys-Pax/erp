import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionOriginType } from '../../financial-transaction/dto/create-financial-transaction.dto';

export enum AccountReceivableStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export class CreateAccountReceivableDto {
  @ApiProperty({
    description: 'Descrição da conta a receber',
    example: 'Recebimento de frete',
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description: string;

  @ApiProperty({
    description: 'Valor a receber',
    example: 5000.0,
  })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @IsNotEmpty({ message: 'Valor é obrigatório' })
  amount: number;

  @ApiProperty({
    description: 'Data de vencimento',
    example: '2024-02-15T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'Data de vencimento deve ser uma data válida' })
  @IsNotEmpty({ message: 'Data de vencimento é obrigatória' })
  dueDate: string;

  @ApiProperty({
    description: 'Tipo de origem',
    enum: TransactionOriginType,
    example: TransactionOriginType.MANUAL,
    required: false,
  })
  @IsEnum(TransactionOriginType, { message: 'Tipo de origem inválido' })
  @IsOptional()
  originType?: TransactionOriginType;

  @ApiProperty({
    description: 'ID da origem',
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
    example: 'Recebimento parcelado em 3x',
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
    description: 'ID do cliente',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID do cliente deve ser um UUID válido' })
  @IsOptional()
  customerId?: string;

  @ApiProperty({
    description: 'ID do centro de custo',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID do centro de custo deve ser um UUID válido' })
  @IsOptional()
  costCenterId?: string;
}
