import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BankStatementItemTypeEnum {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export class CreateBankStatementItemDto {
  @ApiProperty({ description: 'Data do lançamento no extrato' })
  @IsString()
  transactionDate: string; // ISO date

  @ApiProperty({ description: 'Valor (sempre positivo)' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Descrição' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Tipo (CREDIT ou DEBIT)', enum: BankStatementItemTypeEnum })
  @IsEnum(BankStatementItemTypeEnum)
  type: BankStatementItemTypeEnum;
}
