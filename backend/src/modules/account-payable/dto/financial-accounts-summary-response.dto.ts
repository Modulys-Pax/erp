import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../shared/dto/paginated-response.dto';

export class AccountPayableDetailDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Fornecedor ABC' })
  description: string;

  @ApiProperty({ example: 5000.0 })
  amount: number;

  @ApiProperty({ example: '2024-01-15' })
  dueDate: Date;

  @ApiProperty({ example: '2024-01-10', required: false })
  paymentDate?: Date;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'CANCELLED'] })
  status: string;

  @ApiProperty({ example: 'NF-001', required: false })
  documentNumber?: string;

  @ApiProperty({ example: '2024-01-01T10:00:00Z', description: 'Data de cadastro da conta', required: false })
  createdAt?: Date;
}

export class AccountReceivableDetailDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Cliente XYZ' })
  description: string;

  @ApiProperty({ example: 8000.0 })
  amount: number;

  @ApiProperty({ example: '2024-01-20' })
  dueDate: Date;

  @ApiProperty({ example: '2024-01-18', required: false })
  receiptDate?: Date;

  @ApiProperty({ enum: ['PENDING', 'RECEIVED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ example: 'NF-002', required: false })
  documentNumber?: string;

  @ApiProperty({ example: '2024-01-01T10:00:00Z', description: 'Data de cadastro da conta', required: false })
  createdAt?: Date;
}

export class FinancialAccountsSummaryDto {
  @ApiProperty({ example: 50000.0, description: 'Total de contas a pagar pendentes' })
  totalPayablePending: number;

  @ApiProperty({ example: 30000.0, description: 'Total de contas a pagar pagas' })
  totalPayablePaid: number;

  @ApiProperty({ example: 5000.0, description: 'Total de contas a pagar canceladas' })
  totalPayableCancelled: number;

  @ApiProperty({ example: 85000.0, description: 'Total geral de contas a pagar' })
  totalPayable: number;

  @ApiProperty({ example: 25, description: 'Quantidade de contas a pagar pendentes' })
  countPayablePending: number;

  @ApiProperty({ example: 15, description: 'Quantidade de contas a pagar pagas' })
  countPayablePaid: number;

  @ApiProperty({ example: 2, description: 'Quantidade de contas a pagar canceladas' })
  countPayableCancelled: number;

  @ApiProperty({ example: 80000.0, description: 'Total de contas a receber pendentes' })
  totalReceivablePending: number;

  @ApiProperty({ example: 60000.0, description: 'Total de contas a receber recebidas' })
  totalReceivableReceived: number;

  @ApiProperty({ example: 3000.0, description: 'Total de contas a receber canceladas' })
  totalReceivableCancelled: number;

  @ApiProperty({ example: 143000.0, description: 'Total geral de contas a receber' })
  totalReceivable: number;

  @ApiProperty({ example: 20, description: 'Quantidade de contas a receber pendentes' })
  countReceivablePending: number;

  @ApiProperty({ example: 18, description: 'Quantidade de contas a receber recebidas' })
  countReceivableReceived: number;

  @ApiProperty({ example: 1, description: 'Quantidade de contas a receber canceladas' })
  countReceivableCancelled: number;

  @ApiProperty({ example: 58000.0, description: 'Saldo líquido (receber - pagar)' })
  netBalance: number;
}

export class FinancialAccountsSummaryResponseDto {
  @ApiProperty({ type: FinancialAccountsSummaryDto })
  summary: FinancialAccountsSummaryDto;

  @ApiProperty({ type: PaginatedResponseDto })
  accountsPayable: PaginatedResponseDto<AccountPayableDetailDto>;

  @ApiProperty({ type: PaginatedResponseDto })
  accountsReceivable: PaginatedResponseDto<AccountReceivableDetailDto>;
}
