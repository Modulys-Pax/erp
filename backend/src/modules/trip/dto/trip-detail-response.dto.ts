import { ApiProperty } from '@nestjs/swagger';
import { TripExpenseResponseDto } from './trip-expense-response.dto';

export class TripDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty()
  vehicleId: string;

  @ApiProperty({ required: false, description: 'IDs de todas as placas do combo (1 a 4)' })
  vehicleIds?: string[];

  @ApiProperty({ required: false })
  vehiclePlate?: string;

  @ApiProperty({ required: false, description: 'Placas do combo para exibição' })
  vehiclePlates?: string[];

  @ApiProperty()
  driverId: string;

  @ApiProperty({ required: false })
  driverName?: string;

  @ApiProperty()
  origin: string;

  @ApiProperty()
  destination: string;

  @ApiProperty({ example: 5000 })
  freightValue: number;

  @ApiProperty({ enum: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ required: false })
  scheduledDepartureAt?: Date | null;

  @ApiProperty({ required: false })
  scheduledArrivalAt?: Date | null;

  @ApiProperty({ required: false })
  actualDepartureAt?: Date | null;

  @ApiProperty({ required: false })
  actualArrivalAt?: Date | null;

  @ApiProperty({ required: false })
  accountReceivableId?: string | null;

  @ApiProperty({ required: false })
  notes?: string | null;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  /** Soma das despesas da viagem */
  @ApiProperty({ example: 1200 })
  totalExpenses: number;

  /** Lucro = valor do frete - total das despesas */
  @ApiProperty({ example: 3800 })
  profit: number;

  /** Margem % = (lucro / valor do frete) * 100 */
  @ApiProperty({ example: 76 })
  marginPercent: number;

  @ApiProperty({ type: [TripExpenseResponseDto], required: false })
  expenses?: TripExpenseResponseDto[];
}
