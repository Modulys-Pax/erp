import { IsString, IsOptional, IsArray, ValidateNested, IsUUID, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  CreateMaintenanceWorkerDto,
  CreateMaintenanceServiceDto,
  CreateMaintenanceMaterialDto,
} from './create-maintenance-order.dto';

/** Funcionário que executou um serviço (informado antes de fechar a ordem). */
export class UpdateMaintenanceServiceWorkerDto {
  @ApiProperty({ description: 'ID do serviço da ordem', example: 'uuid' })
  @IsUUID('4', { message: 'ID do serviço deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do serviço é obrigatório' })
  maintenanceServiceId: string;

  @ApiProperty({ description: 'ID do funcionário', example: 'uuid' })
  @IsUUID('4', { message: 'ID do funcionário deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do funcionário é obrigatório' })
  employeeId: string;
}

export class UpdateMaintenanceOrderDto {
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
    description: 'Funcionários por serviço (quem executou cada serviço, informado antes de fechar)',
    type: [UpdateMaintenanceServiceWorkerDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateMaintenanceServiceWorkerDto)
  @IsOptional()
  serviceWorkers?: UpdateMaintenanceServiceWorkerDto[];
}
