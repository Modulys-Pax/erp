import { PartialType } from '@nestjs/swagger';
import { CreateFiscalDocumentDto } from './create-fiscal-document.dto';

export class UpdateFiscalDocumentDto extends PartialType(CreateFiscalDocumentDto) {}
