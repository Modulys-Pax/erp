import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTripExpenseDto {
  @ApiProperty({ description: 'ID do tipo de despesa', example: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  tripExpenseTypeId: string;

  @ApiProperty({ description: 'Valor da despesa', example: 150.5 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Descrição opcional', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Data da despesa', example: '2024-02-20' })
  @IsDateString()
  @IsNotEmpty()
  expenseDate: string;

  @ApiProperty({ description: 'ID do centro de custo', required: false })
  @IsUUID('4')
  @IsOptional()
  costCenterId?: string;
}
