import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceWorkerResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  maintenanceOrderId: string;

  @ApiProperty({ example: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'João Silva' })
  employeeName?: string;

  @ApiProperty({ example: false })
  isResponsible: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;
}

export class MaintenanceServiceWorkerResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  maintenanceServiceId: string;

  @ApiProperty({ example: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'João Silva' })
  employeeName?: string;
}

export class MaintenanceServiceResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  maintenanceOrderId: string;

  @ApiProperty({ example: 'Troca de óleo e filtro' })
  description: string;

  @ApiProperty({ type: [MaintenanceServiceWorkerResponseDto], required: false })
  serviceWorkers?: MaintenanceServiceWorkerResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;
}

export class MaintenanceMaterialResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  maintenanceOrderId: string;

  @ApiProperty({ example: 'uuid', required: false })
  maintenanceServiceId?: string;

  @ApiProperty({ example: 'uuid' })
  productId: string;

  @ApiProperty({ example: 'Óleo Motor 15W40' })
  productName?: string;

  @ApiProperty({ example: 'L' })
  productUnit?: string;

  @ApiProperty({
    example: 'uuid',
    required: false,
    description: 'Item de troca por KM ao qual este material está vinculado',
  })
  vehicleReplacementItemId?: string;

  @ApiProperty({
    example: 'Óleo Motor',
    required: false,
    description: 'Nome do item de troca por KM',
  })
  replacementItemName?: string;

  @ApiProperty({ example: 2.5 })
  quantity: number;

  @ApiProperty({ example: 25.5, required: false })
  unitCost?: number;

  @ApiProperty({ example: 63.75, required: false })
  totalCost?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;
}

export class ReplacementItemSummaryDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Óleo Motor' })
  name: string;
}

export class MaintenanceTimelineResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  maintenanceOrderId: string;

  @ApiProperty({
    example: 'STARTED',
    enum: ['STARTED', 'PAUSED', 'RESUMED', 'COMPLETED', 'CANCELLED'],
  })
  event: string;

  @ApiProperty({ example: 'Ordem iniciada', required: false })
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;
}

export class MaintenanceOrderResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'OM-2024-001' })
  orderNumber: string;

  @ApiProperty({ example: 'uuid' })
  vehicleId: string;

  @ApiProperty({ example: 'ABC-1234' })
  vehiclePlate?: string;

  @ApiProperty({
    example: 'PREVENTIVE',
    enum: ['PREVENTIVE', 'CORRECTIVE'],
  })
  type: string;

  @ApiProperty({
    example: 'OPEN',
    enum: ['OPEN', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  })
  status: string;

  @ApiProperty({ example: 50000, required: false })
  kmAtEntry?: number;

  @ApiProperty({
    example: '2026-01-28',
    required: false,
    description: 'Data em que o serviço foi realizado (ex.: troca na estrada)',
  })
  serviceDate?: Date;

  @ApiProperty({ example: 'Troca de óleo preventiva', required: false })
  description?: string;

  @ApiProperty({ example: 'Veículo apresentou ruído', required: false })
  observations?: string;

  @ApiProperty({ example: 500.0, required: false })
  totalCost?: number;

  @ApiProperty({ example: 120, required: false })
  totalTimeMinutes?: number;

  @ApiProperty({
    example: 'nota_terceiro.pdf',
    required: false,
    description: 'Nome do anexo (ex.: nota fiscal de terceiro)',
  })
  attachmentFileName?: string;

  @ApiProperty({
    example: 'uploads/maintenance-orders/uuid/nota.pdf',
    required: false,
    description: 'Caminho do anexo',
  })
  attachmentFilePath?: string;

  @ApiProperty({ example: 'uuid' })
  companyId: string;

  @ApiProperty({ example: 'uuid' })
  branchId: string;

  @ApiProperty({
    type: [MaintenanceWorkerResponseDto],
    required: false,
  })
  workers?: MaintenanceWorkerResponseDto[];

  @ApiProperty({
    type: [MaintenanceServiceResponseDto],
    required: false,
  })
  services?: MaintenanceServiceResponseDto[];

  @ApiProperty({
    type: [MaintenanceMaterialResponseDto],
    required: false,
  })
  materials?: MaintenanceMaterialResponseDto[];

  @ApiProperty({
    type: [MaintenanceTimelineResponseDto],
    required: false,
  })
  timeline?: MaintenanceTimelineResponseDto[];

  @ApiProperty({
    type: [ReplacementItemSummaryDto],
    required: false,
    description: 'Itens de troca por KM que foram trocados nesta ordem',
  })
  replacementItemsSummary?: ReplacementItemSummaryDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;

  @ApiProperty({ required: false })
  deletedAt?: Date;
}
