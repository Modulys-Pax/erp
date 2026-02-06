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

export enum ExpenseType {
  TRANSPORT = 'TRANSPORT',
  MEAL = 'MEAL',
  ACCOMMODATION = 'ACCOMMODATION',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @ApiProperty({
    description: 'ID do funcionário',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID do funcionário deve ser um UUID válido' })
  @IsOptional()
  employeeId?: string;

  @ApiProperty({
    description: 'Tipo de despesa',
    enum: ExpenseType,
    example: ExpenseType.TRANSPORT,
  })
  @IsEnum(ExpenseType, { message: 'Tipo de despesa inválido' })
  @IsNotEmpty({ message: 'Tipo de despesa é obrigatório' })
  type: ExpenseType;

  @ApiProperty({
    description: 'Valor da despesa',
    example: 150.0,
  })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  @IsNotEmpty({ message: 'Valor é obrigatório' })
  amount: number;

  @ApiProperty({
    description: 'Descrição da despesa',
    example: 'Passagem aérea para reunião em São Paulo',
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description: string;

  @ApiProperty({
    description: 'Data da despesa',
    example: '2024-01-15T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'Data da despesa deve ser uma data válida' })
  @IsNotEmpty({ message: 'Data da despesa é obrigatória' })
  expenseDate: string;

  @ApiProperty({
    description: 'Número do documento (recibo, etc)',
    example: 'REC-001234',
    required: false,
  })
  @IsString({ message: 'Número do documento deve ser uma string' })
  @IsOptional()
  documentNumber?: string;

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
