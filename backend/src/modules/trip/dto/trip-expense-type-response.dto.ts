import { ApiProperty } from '@nestjs/swagger';

export class TripExpenseTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string | null;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
