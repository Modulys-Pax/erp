import { Module, forwardRef } from '@nestjs/common';
import { SalesOrderService } from './sales-order.service';
import { SalesOrderController } from './sales-order.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { StockModule } from '../stock/stock.module';
import { AccountReceivableModule } from '../account-receivable/account-receivable.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => StockModule),
    forwardRef(() => AccountReceivableModule),
  ],
  controllers: [SalesOrderController],
  providers: [SalesOrderService],
  exports: [SalesOrderService],
})
export class SalesOrderModule {}
