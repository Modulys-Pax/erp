import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../shared/dto/paginated-response.dto';

export class EmployeeCostDetailDto {
  @ApiProperty({ example: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'João Silva' })
  employeeName: string;

  @ApiProperty({ example: 'Motorista', required: false })
  position?: string;

  @ApiProperty({ example: 'Operação', required: false })
  department?: string;

  @ApiProperty({ example: 3500.0, description: 'Salário mensal base' })
  monthlySalary: number;

  @ApiProperty({
    example: 455.0,
    description: 'Valor do adicional de risco (insalubridade ou periculosidade)',
    required: false,
  })
  riskAdditionAmount?: number;

  @ApiProperty({
    example: 'Periculosidade',
    description: 'Nome para exibição: "Periculosidade" ou "Insalubridade (Mínimo/Médio/Máximo)"',
    required: false,
  })
  riskAdditionLabel?: string;

  @ApiProperty({ example: 150.0, description: 'Total de benefícios mensais' })
  totalBenefits: number;

  @ApiProperty({ example: 700.0, description: 'Total de impostos mensais (INSS, FGTS, etc)' })
  totalTaxes: number;

  @ApiProperty({
    example: 4350.0,
    description: 'Custo total mensal (salário + benefícios + impostos)',
  })
  totalMonthlyCost: number;

  @ApiProperty({ example: 52200.0, description: 'Custo total anual' })
  totalAnnualCost: number;
}

export class EmployeeCostsSummaryDto {
  @ApiProperty({ example: 50, description: 'Total de funcionários ativos' })
  totalEmployees: number;

  @ApiProperty({ example: 175000.0, description: 'Total de salários mensais' })
  totalMonthlySalaries: number;

  @ApiProperty({ example: 7500.0, description: 'Total de benefícios mensais' })
  totalMonthlyBenefits: number;

  @ApiProperty({ example: 35000.0, description: 'Total de impostos mensais' })
  totalMonthlyTaxes: number;

  @ApiProperty({ example: 217500.0, description: 'Custo total mensal' })
  totalMonthlyCost: number;

  @ApiProperty({ example: 2610000.0, description: 'Custo total anual' })
  totalAnnualCost: number;
}

export class EmployeeCostsResponseDto {
  @ApiProperty({ type: EmployeeCostsSummaryDto })
  summary: EmployeeCostsSummaryDto;

  @ApiProperty({ type: PaginatedResponseDto })
  employees: PaginatedResponseDto<EmployeeCostDetailDto>;
}
