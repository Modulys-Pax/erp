import { IsNotEmpty, IsUUID, IsInt, Min, Max, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessPayrollDto {
  @ApiProperty({
    description: 'Mês de referência (1-12)',
    example: 1,
  })
  @IsInt({ message: 'Mês deve ser um número inteiro' })
  @Min(1, { message: 'Mês deve ser entre 1 e 12' })
  @Max(12, { message: 'Mês deve ser entre 1 e 12' })
  @IsNotEmpty({ message: 'Mês de referência é obrigatório' })
  referenceMonth: number;

  @ApiProperty({
    description: 'Ano de referência',
    example: 2024,
  })
  @IsInt({ message: 'Ano deve ser um número inteiro' })
  @Min(2000, { message: 'Ano inválido' })
  @IsNotEmpty({ message: 'Ano de referência é obrigatório' })
  referenceYear: number;

  @ApiProperty({
    description: 'Data de vencimento das contas a pagar (opcional, padrão: dia 5 do próximo mês)',
    example: '2024-02-05',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de vencimento deve ser válida' })
  dueDate?: string;

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

export class PayrollEmployeeBenefitDetail {
  @ApiProperty({ description: 'Nome do benefício' })
  benefitName: string;

  @ApiProperty({ description: 'Valor do benefício no mês' })
  amount: number;
}

export class PayrollEmployeeDetail {
  @ApiProperty({ description: 'ID do funcionário' })
  employeeId: string;

  @ApiProperty({ description: 'Nome do funcionário' })
  employeeName: string;

  @ApiProperty({ description: 'Salário base' })
  baseSalary: number;

  @ApiProperty({
    description: 'Adicional de insalubridade ou periculosidade',
    required: false,
  })
  riskAdditionAmount?: number;

  @ApiProperty({
    description: 'Nome do adicional para exibição: "Periculosidade" ou "Insalubridade (Mínimo/Médio/Máximo)"',
    required: false,
  })
  riskAdditionLabel?: string;

  @ApiProperty({ description: 'Total de benefícios' })
  totalBenefits: number;

  @ApiProperty({ description: 'Total a pagar (salário + adicional de risco + benefícios)' })
  totalAmount: number;

  @ApiProperty({ description: 'Detalhes dos benefícios' })
  benefits: PayrollEmployeeBenefitDetail[];

  @ApiProperty({
    description: 'Status: created, already_exists, skipped_no_salary',
  })
  status: 'created' | 'already_exists' | 'skipped_no_salary';

  @ApiProperty({ description: 'ID da conta a pagar (se criada)', required: false })
  accountPayableId?: string;
}

export class ProcessPayrollResultDto {
  @ApiProperty({ description: 'Total de funcionários ativos' })
  totalEmployees: number;

  @ApiProperty({ description: 'Contas a pagar criadas' })
  created: number;

  @ApiProperty({ description: 'Já existentes (não criadas novamente)' })
  alreadyExists: number;

  @ApiProperty({ description: 'Ignorados (sem salário base)' })
  skippedNoSalary: number;

  @ApiProperty({ description: 'Valor total processado' })
  totalAmount: number;

  @ApiProperty({ description: 'Detalhes por funcionário' })
  details: PayrollEmployeeDetail[];
}
