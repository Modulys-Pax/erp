import { IsString, IsNotEmpty, IsUUID, IsInt, Min, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVehicleMarkingDto {
  @ApiProperty({
    description: 'IDs dos veículos/placas (1 a 4) que compõem o combo',
    example: ['uuid1', 'uuid2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione pelo menos 1 placa' })
  @ArrayMaxSize(4, { message: 'Selecione no máximo 4 placas' })
  @IsUUID('4', { each: true })
  vehicleIds: string[];

  @ApiProperty({
    description: 'Quilometragem quando o veículo chegou',
    example: 50000,
  })
  @IsInt({ message: 'Quilometragem deve ser um número inteiro' })
  @Min(0, { message: 'Quilometragem não pode ser negativa' })
  @IsNotEmpty({ message: 'Quilometragem é obrigatória' })
  km: number;

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
}
