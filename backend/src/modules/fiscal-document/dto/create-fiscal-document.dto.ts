import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FiscalDocumentTypeEnum {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
}

export enum FiscalDocumentStatusEnum {
  REGISTERED = 'REGISTERED',
  CANCELLED = 'CANCELLED',
}

export class CreateFiscalDocumentDto {
  @ApiProperty({ description: 'Tipo do documento', enum: FiscalDocumentTypeEnum })
  @IsEnum(FiscalDocumentTypeEnum, { message: 'Tipo deve ser ENTRY ou EXIT' })
  type: FiscalDocumentTypeEnum;

  @ApiProperty({ description: 'Número do documento', example: '000001234' })
  @IsString()
  @IsNotEmpty({ message: 'Número é obrigatório' })
  number: string;

  @ApiPropertyOptional({ description: 'Série do documento', example: '1' })
  @IsString()
  @IsOptional()
  series?: string;

  @ApiProperty({ description: 'Data de emissão', example: '2025-02-06' })
  @IsDateString()
  @IsNotEmpty({ message: 'Data de emissão é obrigatória' })
  issueDate: string;

  @ApiProperty({ description: 'Valor total', example: 1500.5 })
  @IsNumber()
  @Min(0, { message: 'Valor total deve ser maior ou igual a zero' })
  totalAmount: number;

  @ApiPropertyOptional({
    description: 'Status do documento',
    enum: FiscalDocumentStatusEnum,
    default: FiscalDocumentStatusEnum.REGISTERED,
  })
  @IsEnum(FiscalDocumentStatusEnum)
  @IsOptional()
  status?: FiscalDocumentStatusEnum;

  @ApiProperty({ description: 'ID da empresa' })
  @IsUUID('4')
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: 'ID da filial' })
  @IsUUID('4')
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ description: 'ID do fornecedor (entrada)' })
  @IsUUID('4')
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'ID do cliente (saída)' })
  @IsUUID('4')
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'ID da conta a pagar vinculada' })
  @IsUUID('4')
  @IsOptional()
  accountPayableId?: string;

  @ApiPropertyOptional({ description: 'ID da conta a receber vinculada' })
  @IsUUID('4')
  @IsOptional()
  accountReceivableId?: string;

  @ApiPropertyOptional({ description: 'ID da transação financeira vinculada' })
  @IsUUID('4')
  @IsOptional()
  financialTransactionId?: string;

  @ApiPropertyOptional({ description: 'Observações' })
  @IsString()
  @IsOptional()
  notes?: string;
}
