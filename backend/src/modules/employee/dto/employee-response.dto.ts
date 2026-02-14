import { ApiProperty } from '@nestjs/swagger';

export class EmployeeResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ example: '123.456.789-00', required: false })
  cpf?: string;

  @ApiProperty({ example: 'joao.silva@transportesabc.com.br', required: false })
  email?: string;

  @ApiProperty({ example: '(11) 98765-4321', required: false })
  phone?: string;

  @ApiProperty({ example: 'Motorista', required: false })
  position?: string;

  @ApiProperty({ example: 'Operações', required: false })
  department?: string;

  @ApiProperty({ example: '2024-01-15', required: false })
  hireDate?: Date;

  @ApiProperty({
    example: 3500.0,
    required: false,
    description: 'Salário mensal base do funcionário',
  })
  monthlySalary?: number;

  @ApiProperty({ example: 'uuid' })
  companyId: string;

  @ApiProperty({ example: 'uuid' })
  branchId: string;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty({ required: false })
  deletedAt?: Date;

  @ApiProperty({
    description: 'Tipo de adicional de risco (insalubridade ou periculosidade - não acumulam)',
    enum: ['INSALUBRIDADE', 'PERICULOSIDADE'],
    required: false,
  })
  riskAdditionType?: 'INSALUBRIDADE' | 'PERICULOSIDADE';

  @ApiProperty({
    description: 'Grau de insalubridade (quando riskAdditionType = INSALUBRIDADE)',
    enum: ['MINIMO', 'MEDIO', 'MAXIMO'],
    required: false,
  })
  insalubrityDegree?: 'MINIMO' | 'MEDIO' | 'MAXIMO';
}
