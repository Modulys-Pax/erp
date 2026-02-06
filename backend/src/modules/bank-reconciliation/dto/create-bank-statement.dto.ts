import { IsString, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBankStatementDto {
  @ApiProperty({ description: 'ID da filial' })
  @IsUUID('4')
  branchId: string;

  @ApiPropertyOptional({ description: 'Descrição do extrato' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Mês de referência (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  referenceMonth: number;

  @ApiProperty({ description: 'Ano de referência' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  referenceYear: number;
}
