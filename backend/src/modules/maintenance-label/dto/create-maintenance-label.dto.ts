import { IsNotEmpty, IsUUID, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaintenanceLabelDto {
  @ApiProperty({
    description: 'ID do veículo',
    example: 'uuid',
  })
  @IsUUID('4', { message: 'ID do veículo deve ser um UUID válido' })
  @IsNotEmpty({ message: 'ID do veículo é obrigatório' })
  vehicleId: string;

  @ApiProperty({
    description:
      'IDs dos itens de troca por KM (vehicleReplacementItemId). Se omitido ou vazio, todos os itens configurados no veículo serão incluídos.',
    example: ['uuid1', 'uuid2'],
    type: [String],
    required: false,
  })
  @IsArray({ message: 'Produtos deve ser um array' })
  @IsUUID('4', { each: true, message: 'Cada ID deve ser um UUID válido' })
  @IsOptional()
  productIds?: string[];

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
