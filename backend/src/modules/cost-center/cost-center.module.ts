import { Module } from '@nestjs/common';
import { CostCenterService } from './cost-center.service';
import { CostCenterController } from './cost-center.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CostCenterController],
  providers: [CostCenterService],
  exports: [CostCenterService],
})
export class CostCenterModule {}
