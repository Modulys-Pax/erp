import { ApiProperty } from '@nestjs/swagger';

export class BenefitInfoDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Vale Transporte' })
  name: string;

  @ApiProperty({ example: 6.0, description: 'Custo diário para a empresa' })
  dailyCost: number;

  @ApiProperty({ example: 5.0, description: 'Valor que o funcionário recebe por dia' })
  employeeValue: number;

  @ApiProperty({ example: false, description: 'Se conta sábados e domingos' })
  includeWeekends: boolean;

  @ApiProperty({ example: 'Vale transporte diário', required: false })
  description?: string;
}

export class EmployeeBenefitCostDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  benefitId: string;

  @ApiProperty({ type: BenefitInfoDto })
  benefit: BenefitInfoDto;

  @ApiProperty({ example: 150.0, description: 'Custo mensal calculado (baseado em dias úteis)' })
  monthlyCost: number;

  @ApiProperty({ example: true })
  active: boolean;
}

export class EmployeeTaxCostDto {
  @ApiProperty({ example: 'INSS' })
  type: string;

  @ApiProperty({ example: 'INSS Patronal' })
  name: string;

  @ApiProperty({ example: 20.0, description: 'Alíquota em percentual' })
  rate: number;

  @ApiProperty({ example: 700.0, description: 'Valor calculado do imposto' })
  amount: number;
}

export class EmployeeDetailCostsResponseDto {
  @ApiProperty({ example: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'João Silva' })
  employeeName: string;

  @ApiProperty({ example: 'Motorista', required: false })
  position?: string;

  @ApiProperty({ example: 'Operação', required: false })
  department?: string;

  @ApiProperty({ example: 3500.0 })
  monthlySalary: number;

  @ApiProperty({
    example: 455.0,
    description: 'Valor do adicional de risco',
    required: false,
  })
  riskAdditionAmount?: number;

  @ApiProperty({
    example: 'Insalubridade (Médio)',
    description: 'Nome para exibição: "Periculosidade" ou "Insalubridade (Mínimo/Médio/Máximo)"',
    required: false,
  })
  riskAdditionLabel?: string;

  @ApiProperty({ type: [EmployeeBenefitCostDto] })
  benefits: EmployeeBenefitCostDto[];

  @ApiProperty({ example: 150.0 })
  totalBenefits: number;

  @ApiProperty({ type: [EmployeeTaxCostDto] })
  taxes: EmployeeTaxCostDto[];

  @ApiProperty({ example: 700.0 })
  totalTaxes: number;

  @ApiProperty({
    example: 350.0,
    description: 'INSS descontado do funcionário (tabela progressiva)',
    required: false,
  })
  employeeINSS?: number;

  @ApiProperty({
    example: 10.0,
    description:
      'Porcentagem efetiva de INSS descontada do funcionário (baseada na tabela progressiva)',
    required: false,
  })
  employeeINSSRate?: number;

  @ApiProperty({
    example: 9.0,
    description: 'Alíquota da faixa usada no cálculo (7,5, 9, 12 ou 14%)',
    required: false,
  })
  employeeINSSBracketRate?: number;

  @ApiProperty({
    example: 3150.0,
    description: 'Salário líquido após desconto do INSS',
    required: false,
  })
  netSalary?: number;

  @ApiProperty({ example: 4350.0 })
  totalMonthlyCost: number;

  @ApiProperty({ example: 52200.0 })
  totalAnnualCost: number;
}
