import { ApiProperty } from '@nestjs/swagger';
import { StockMovementType } from './create-stock-movement.dto';

export class StockMovementResponseDto {
  @ApiProperty({ description: 'ID da movimentação' })
  id: string;

  @ApiProperty({ description: 'Tipo de movimentação', enum: StockMovementType })
  type: StockMovementType;

  @ApiProperty({ description: 'ID do produto' })
  productId: string;

  @ApiProperty({ description: 'Nome do produto', required: false })
  productName?: string;

  @ApiProperty({ description: 'Código do produto', required: false })
  productCode?: string;

  @ApiProperty({ description: 'Unidade de medida do produto', required: false })
  productUnit?: string;

  @ApiProperty({ description: 'Quantidade movimentada' })
  quantity: number;

  @ApiProperty({ description: 'Custo unitário', required: false })
  unitCost?: number;

  @ApiProperty({ description: 'Custo total', required: false })
  totalCost?: number;

  @ApiProperty({ description: 'Número do documento', required: false })
  documentNumber?: string;

  @ApiProperty({ description: 'Observações', required: false })
  notes?: string;

  @ApiProperty({ description: 'ID da ordem de manutenção', required: false })
  maintenanceOrderId?: string;

  @ApiProperty({ description: 'ID da empresa' })
  companyId: string;

  @ApiProperty({ description: 'ID da filial' })
  branchId: string;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'ID do usuário que criou', required: false })
  createdBy?: string;
}
