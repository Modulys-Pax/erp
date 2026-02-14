import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RISK_ADDITION_TYPES, INSALUBRITY_DEGREES } from '../../../shared/constants/risk-addition.constants';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Nome do funcionário', example: 'João Silva' })
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({
    description: 'CPF do funcionário',
    example: '123.456.789-00',
    required: false,
  })
  @IsString({ message: 'CPF deve ser uma string' })
  @IsOptional()
  cpf?: string;

  @ApiProperty({
    description: 'Email do funcionário',
    example: 'joao.silva@transportesabc.com.br',
    required: false,
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Telefone do funcionário',
    example: '(11) 98765-4321',
    required: false,
  })
  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Cargo do funcionário',
    example: 'Motorista',
    required: false,
  })
  @IsString({ message: 'Cargo deve ser uma string' })
  @IsOptional()
  position?: string;

  @ApiProperty({
    description: 'Departamento do funcionário',
    example: 'Operações',
    required: false,
  })
  @IsString({ message: 'Departamento deve ser uma string' })
  @IsOptional()
  department?: string;

  @ApiProperty({
    description: 'Data de admissão',
    example: '2024-01-15',
    required: false,
  })
  @IsDateString({}, { message: 'Data de admissão inválida' })
  @IsOptional()
  hireDate?: string;

  @ApiProperty({
    description: 'Salário mensal base do funcionário (R$)',
    example: 3500.0,
    required: false,
    default: 0,
  })
  @IsNumber({}, { message: 'Salário mensal deve ser um número' })
  @Min(0, { message: 'Salário mensal não pode ser negativo' })
  @IsOptional()
  @Type(() => Number)
  monthlySalary?: number;

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
    description: 'Funcionário ativo',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  @IsOptional()
  active?: boolean;

  @ApiProperty({
    description: 'Tipo de adicional de risco (apenas um: insalubridade OU periculosidade, não acumulam)',
    enum: RISK_ADDITION_TYPES,
    required: false,
  })
  @IsIn(RISK_ADDITION_TYPES, { message: 'Tipo de adicional deve ser INSALUBRIDADE ou PERICULOSIDADE' })
  @IsOptional()
  riskAdditionType?: 'INSALUBRIDADE' | 'PERICULOSIDADE';

  @ApiProperty({
    description: 'Grau de insalubridade (obrigatório quando riskAdditionType = INSALUBRIDADE)',
    enum: INSALUBRITY_DEGREES,
    required: false,
  })
  @ValidateIf((o) => o.riskAdditionType === 'INSALUBRIDADE')
  @IsIn(INSALUBRITY_DEGREES, { message: 'Grau de insalubridade deve ser MINIMO, MEDIO ou MAXIMO' })
  @IsNotEmpty({ message: 'Grau de insalubridade é obrigatório quando o tipo é Insalubridade' })
  insalubrityDegree?: 'MINIMO' | 'MEDIO' | 'MAXIMO';
}
