import { ApiProperty } from '@nestjs/swagger';

export class TripExpenseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tripId: string;

  @ApiProperty()
  tripExpenseTypeId: string;

  @ApiProperty({ required: false })
  tripExpenseTypeName?: string;

  @ApiProperty({ example: 150.5 })
  amount: number;

  @ApiProperty({ required: false })
  description?: string | null;

  @ApiProperty()
  expenseDate: Date;

  @ApiProperty()
  vehicleId: string;

  @ApiProperty({ required: false })
  accountPayableId?: string | null;

  @ApiProperty({ required: false })
  costCenterId?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
