import { ApiProperty } from '@nestjs/swagger';
import { AccountPayableResponseDto } from './account-payable-response.dto';

export class AccountPayableBySupplierGroupDto {
  @ApiProperty({ description: 'ID do fornecedor (null = sem fornecedor)' })
  supplierId: string | null;

  @ApiProperty({ description: 'Nome do fornecedor' })
  supplierName: string;

  @ApiProperty({ description: 'Total em valor' })
  total: number;

  @ApiProperty({ description: 'Quantidade de contas' })
  count: number;

  @ApiProperty({ type: [AccountPayableResponseDto], description: 'Contas do grupo' })
  items: AccountPayableResponseDto[];
}

export class ReportBySupplierResponseDto {
  @ApiProperty({ type: [AccountPayableBySupplierGroupDto] })
  groups: AccountPayableBySupplierGroupDto[];

  @ApiProperty({ description: 'Soma total de todos os grupos' })
  totalAmount: number;
}
