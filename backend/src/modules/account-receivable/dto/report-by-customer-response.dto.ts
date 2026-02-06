import { ApiProperty } from '@nestjs/swagger';
import { AccountReceivableResponseDto } from './account-receivable-response.dto';

export class AccountReceivableByCustomerGroupDto {
  @ApiProperty({ description: 'ID do cliente (null = sem cliente)' })
  customerId: string | null;

  @ApiProperty({ description: 'Nome do cliente' })
  customerName: string;

  @ApiProperty({ description: 'Total em valor' })
  total: number;

  @ApiProperty({ description: 'Quantidade de contas' })
  count: number;

  @ApiProperty({ type: [AccountReceivableResponseDto], description: 'Contas do grupo' })
  items: AccountReceivableResponseDto[];
}

export class ReportByCustomerResponseDto {
  @ApiProperty({ type: [AccountReceivableByCustomerGroupDto] })
  groups: AccountReceivableByCustomerGroupDto[];

  @ApiProperty({ description: 'Soma total de todos os grupos' })
  totalAmount: number;
}
