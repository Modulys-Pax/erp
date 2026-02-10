import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceLabelProductResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  productId: string;

  @ApiProperty({ example: 'Óleo Motor 15W40' })
  productName: string;

  @ApiProperty({ example: 10000, required: false })
  replaceEveryKm?: number;

  @ApiProperty({ example: 50000 })
  lastChangeKm: number;

  @ApiProperty({ example: 60000 })
  nextChangeKm: number;

  @ApiProperty({
    description: 'Indica se o produto foi trocado nesta etiqueta (true) ou apenas exibido com valor atual (false)',
    example: true,
  })
  updatedInThisLabel: boolean;
}

export class MaintenanceLabelResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  vehicleId: string;

  @ApiProperty({ example: 'ABC-1234' })
  vehiclePlate: string;

  @ApiProperty({ example: 'uuid' })
  companyId: string;

  @ApiProperty({ example: 'uuid' })
  branchId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty({ type: [MaintenanceLabelProductResponseDto] })
  products: MaintenanceLabelProductResponseDto[];
}
