import { Module, forwardRef } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { StockModule } from '../stock/stock.module';
import { AccountPayableModule } from '../account-payable/account-payable.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => StockModule),
    forwardRef(() => AccountPayableModule),
  ],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
