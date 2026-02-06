import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReconcileItemDto {
  @ApiProperty({ description: 'ID da transação financeira para vincular' })
  @IsUUID('4')
  financialTransactionId: string;
}
