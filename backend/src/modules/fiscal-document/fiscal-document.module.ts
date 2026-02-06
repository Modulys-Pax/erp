import { Module } from '@nestjs/common';
import { FiscalDocumentService } from './fiscal-document.service';
import { FiscalDocumentController } from './fiscal-document.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FiscalDocumentController],
  providers: [FiscalDocumentService],
  exports: [FiscalDocumentService],
})
export class FiscalDocumentModule {}
