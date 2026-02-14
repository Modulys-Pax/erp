import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsDecimal,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaintenanceWorkerDto {
  @ApiProperty({ description: 'ID do funcionário', example: 'uuid' })
  @IsUUID('4', { message: 'ID do funcionário deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do funcionário é obrigatório' })
  employeeId: string;

  @ApiProperty({
    description: 'É o responsável pela ordem',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean({ message: 'isResponsible deve ser um booleano' })
  @IsOptional()
  isResponsible?: boolean;
}

export class CreateMaintenanceServiceDto {
  @ApiProperty({
    description: 'Descrição do serviço (apenas descritivo, sem valor)',
    example: 'Troca de óleo e filtro',
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  description: string;
}

export class CreateMaintenanceMaterialDto {
  @ApiProperty({ description: 'ID do produto', example: 'uuid' })
  @IsUUID('4', { message: 'ID do produto deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do produto é obrigatório' })
  productId: string;

  @ApiProperty({
    description: 'ID do serviço ao qual este material está vinculado (opcional)',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID do serviço deve ser um UUID válido' })
  @IsOptional()
  maintenanceServiceId?: string;

  @ApiProperty({
    description: 'ID do item de troca por KM ao qual este material está vinculado (opcional)',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID do item de troca deve ser um UUID válido' })
  @IsOptional()
  vehicleReplacementItemId?: string;

  @ApiProperty({
    description: 'Quantidade consumida',
    example: 2.5,
  })
  @IsNotEmpty({ message: 'Quantidade é obrigatória' })
  quantity: number;

  @ApiProperty({
    description: 'Custo unitário no momento do consumo',
    example: 25.5,
    required: false,
  })
  @IsOptional()
  unitCost?: number;
}

export class CreateMaintenanceOrderDto {
  @ApiProperty({
    description: 'IDs dos veículos/placas (1 a 4) que compõem o combo nesta manutenção',
    example: ['uuid1', 'uuid2'],
    type: [String],
  })
  @IsArray({ message: 'vehicleIds deve ser um array' })
  @ArrayMinSize(1, { message: 'Selecione pelo menos 1 placa' })
  @ArrayMaxSize(4, { message: 'Selecione no máximo 4 placas' })
  @IsUUID('4', { each: true, message: 'Cada ID de veículo deve ser um UUID válido' })
  vehicleIds: string[];

  @ApiProperty({
    description: 'Tipo de manutenção',
    example: 'PREVENTIVE',
    enum: ['PREVENTIVE', 'CORRECTIVE'],
  })
  @IsEnum(['PREVENTIVE', 'CORRECTIVE'], {
    message: 'Tipo de manutenção inválido',
  })
  @IsNotEmpty({ message: 'Tipo de manutenção é obrigatório' })
  type: 'PREVENTIVE' | 'CORRECTIVE';

  @ApiProperty({
    description: 'Quilometragem na entrada',
    example: 50000,
    required: true,
  })
  @Transform(({ value }) =>
    value != null && !Number.isNaN(Number(value)) ? Math.round(Number(value)) : value,
  )
  @IsInt({ message: 'KM deve ser um número inteiro' })
  @Min(0, { message: 'KM não pode ser negativo' })
  @IsNotEmpty({ message: 'Quilometragem na entrada é obrigatória' })
  kmAtEntry: number;

  @ApiProperty({
    description: 'Descrição do problema/serviço',
    example: 'Troca de óleo preventiva',
    required: false,
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Observações gerais',
    example: 'Veículo apresentou ruído no motor',
    required: false,
  })
  @IsString({ message: 'Observações devem ser uma string' })
  @IsOptional()
  observations?: string;

  @ApiProperty({
    description: 'ID da empresa',
    example: 'uuid',
  })
  @IsUUID('4', { message: 'ID da empresa deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID da empresa é obrigatório' })
  companyId: string;

  @ApiProperty({
    description: 'ID da filial',
    example: 'uuid',
  })
  @IsUUID('4', { message: 'ID da filial deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID da filial é obrigatório' })
  branchId: string;

  @ApiProperty({
    description: 'Funcionários alocados na ordem',
    type: [CreateMaintenanceWorkerDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaintenanceWorkerDto)
  @IsOptional()
  workers?: CreateMaintenanceWorkerDto[];

  @ApiProperty({
    description: 'Serviços a serem realizados',
    type: [CreateMaintenanceServiceDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaintenanceServiceDto)
  @IsOptional()
  services?: CreateMaintenanceServiceDto[];

  @ApiProperty({
    description: 'Materiais a serem consumidos',
    type: [CreateMaintenanceMaterialDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaintenanceMaterialDto)
  @IsOptional()
  materials?: CreateMaintenanceMaterialDto[];

  @ApiProperty({
    description:
      'IDs dos itens de troca por KM que foram trocados nesta ordem (atualiza última troca)',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  replacementItemsChanged?: string[];
}
