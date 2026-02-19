import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  IsEnum,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const TripStatusEnum = [
  'DRAFT',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type TripStatus = (typeof TripStatusEnum)[number];

export class CreateTripDto {
  @ApiProperty({ description: 'ID do cliente', example: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'IDs das placas do combo (1 a 4: cavalo, carretas, dolly)',
    example: ['uuid1', 'uuid2'],
    type: [String],
    minItems: 1,
    maxItems: 4,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione pelo menos 1 placa' })
  @ArrayMaxSize(4, { message: 'Selecione no máximo 4 placas' })
  @IsUUID('4', { each: true })
  vehicleIds: string[];

  @ApiProperty({ description: 'ID do motorista (Employee)', example: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  driverId: string;

  @ApiProperty({ description: 'Origem', example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ description: 'Destino', example: 'Curitiba' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ description: 'Valor do frete (R$)', example: 5000 })
  @IsNumber()
  @Min(0)
  freightValue: number;

  @ApiProperty({
    description: 'Status da viagem',
    enum: TripStatusEnum,
    required: false,
    default: 'DRAFT',
  })
  @IsEnum(TripStatusEnum)
  @IsOptional()
  status?: TripStatus;

  @ApiProperty({
    description: 'Data/hora prevista de saída',
    example: '2024-02-20T08:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledDepartureAt?: string;

  @ApiProperty({
    description: 'Data/hora prevista de chegada',
    example: '2024-02-20T18:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledArrivalAt?: string;

  @ApiProperty({
    description: 'Data/hora real de saída',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  actualDepartureAt?: string;

  @ApiProperty({
    description: 'Data/hora real de chegada',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  actualArrivalAt?: string;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'ID da filial', example: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  branchId: string;
}
