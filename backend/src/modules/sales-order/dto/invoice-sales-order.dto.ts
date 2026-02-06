import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceSalesOrderDto {
  @ApiProperty({
    description: 'Gerar conta a receber com o valor do pedido',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  createAccountReceivable?: boolean;

  @ApiProperty({
    description: 'Dar baixa no estoque (saída) por item',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  deductStock?: boolean;
}
