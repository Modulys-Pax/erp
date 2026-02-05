import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { VehiclePlateItemDto } from './vehicle-plate-item.dto';
import { VehicleReplacementItemDto } from './vehicle-replacement-item.dto';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Placa do veículo (uma por registro). Tipo: CAVALO, PRIMEIRA_CARRETA, DOLLY ou SEGUNDA_CARRETA.',
    type: VehiclePlateItemDto,
    example: { type: 'CAVALO', plate: 'ABC1D23' },
  })
  @ValidateNested()
  @Type(() => VehiclePlateItemDto)
  @IsNotEmpty({ message: 'Informe a placa' })
  plate: VehiclePlateItemDto;

  @ApiProperty({
    description: 'Produtos para troca a cada X KM neste veículo (opcional)',
    type: [VehicleReplacementItemDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VehicleReplacementItemDto)
  replacementItems?: VehicleReplacementItemDto[];

  @ApiProperty({
    description: 'ID da marca do veículo',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID da marca deve ser um UUID válido' })
  @IsOptional()
  brandId?: string;

  @ApiProperty({
    description: 'ID do modelo do veículo',
    example: 'uuid',
    required: false,
  })
  @IsUUID('4', { message: 'ID do modelo deve ser um UUID válido' })
  @IsOptional()
  modelId?: string;

  @ApiProperty({
    description: 'Ano do veículo',
    example: 2020,
    required: false,
  })
  @IsInt({ message: 'Ano deve ser um número inteiro' })
  @Min(1900, { message: 'Ano inválido' })
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Cor do veículo',
    example: 'Branco',
    required: false,
  })
  @IsString({ message: 'Cor deve ser uma string' })
  @IsOptional()
  color?: string;

  @ApiProperty({
    description: 'Chassi do veículo',
    example: '9BWZZZ377VT004251',
    required: false,
  })
  @IsString({ message: 'Chassi deve ser uma string' })
  @IsOptional()
  chassis?: string;

  @ApiProperty({
    description: 'RENAVAM do veículo',
    example: '12345678901',
    required: false,
  })
  @IsString({ message: 'RENAVAM deve ser uma string' })
  @IsOptional()
  renavam?: string;

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
    description: 'Quilometragem atual do veículo',
    example: 50000,
    required: false,
  })
  @IsInt({ message: 'Quilometragem deve ser um número inteiro' })
  @Min(0, { message: 'Quilometragem não pode ser negativa' })
  @IsOptional()
  currentKm?: number;

  @ApiProperty({
    description: 'Status do veículo',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'MAINTENANCE', 'STOPPED'],
    required: false,
    default: 'ACTIVE',
  })
  @IsString({ message: 'Status deve ser uma string' })
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'Veículo ativo',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  @IsOptional()
  active?: boolean;
}
