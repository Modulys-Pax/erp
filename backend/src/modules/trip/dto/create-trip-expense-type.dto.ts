import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTripExpenseTypeDto {
  @ApiProperty({ description: 'Nome do tipo', example: 'Combustível' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Código opcional', example: 'COMB', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'ID da filial', example: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  branchId: string;
}
