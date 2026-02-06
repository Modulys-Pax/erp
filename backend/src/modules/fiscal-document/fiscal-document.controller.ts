import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FiscalDocumentService } from './fiscal-document.service';
import { CreateFiscalDocumentDto } from './dto/create-fiscal-document.dto';
import { UpdateFiscalDocumentDto } from './dto/update-fiscal-document.dto';
import { FiscalDocumentResponseDto } from './dto/fiscal-document-response.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { FiscalDocumentType, FiscalDocumentStatus } from '@prisma/client';

@ApiTags('Fiscal Documents')
@Controller('fiscal-documents')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class FiscalDocumentController {
  constructor(private readonly fiscalDocumentService: FiscalDocumentService) {}

  @Post()
  @RequirePermission('fiscal-documents.create')
  @ApiOperation({ summary: 'Criar documento fiscal' })
  @ApiResponse({
    status: 201,
    description: 'Documento fiscal criado',
    type: FiscalDocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Empresa ou filial não encontrada' })
  create(
    @Body() createDto: CreateFiscalDocumentDto,
    @CurrentUser() user: any,
  ): Promise<FiscalDocumentResponseDto> {
    return this.fiscalDocumentService.create(createDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('fiscal-documents.view')
  @ApiOperation({ summary: 'Listar documentos fiscais (paginado, com filtros)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filtrar por filial' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Data início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Data fim (YYYY-MM-DD)' })
  @ApiQuery({ name: 'type', required: false, enum: ['ENTRY', 'EXIT'] })
  @ApiQuery({ name: 'status', required: false, enum: ['REGISTERED', 'CANCELLED'] })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de documentos fiscais' })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: FiscalDocumentType,
    @Query('status') status?: FiscalDocumentStatus,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 15;
    const includeDeletedBool = includeDeleted === 'true';
    return this.fiscalDocumentService.findAll(
      branchId,
      startDate,
      endDate,
      type,
      status,
      includeDeletedBool,
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  @RequirePermission('fiscal-documents.view')
  @ApiOperation({ summary: 'Obter documento fiscal por ID' })
  @ApiResponse({
    status: 200,
    description: 'Documento fiscal',
    type: FiscalDocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Documento fiscal não encontrado' })
  findOne(@Param('id') id: string): Promise<FiscalDocumentResponseDto> {
    return this.fiscalDocumentService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('fiscal-documents.update')
  @ApiOperation({ summary: 'Atualizar documento fiscal' })
  @ApiResponse({
    status: 200,
    description: 'Documento fiscal atualizado',
    type: FiscalDocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Documento fiscal não encontrado' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFiscalDocumentDto,
    @CurrentUser() user: any,
  ): Promise<FiscalDocumentResponseDto> {
    return this.fiscalDocumentService.update(id, updateDto, user);
  }

  @Delete(':id')
  @RequirePermission('fiscal-documents.delete')
  @ApiOperation({ summary: 'Excluir documento fiscal (soft delete)' })
  @ApiResponse({ status: 200, description: 'Documento fiscal excluído' })
  @ApiResponse({ status: 404, description: 'Documento fiscal não encontrado' })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.fiscalDocumentService.remove(id, user);
  }
}
