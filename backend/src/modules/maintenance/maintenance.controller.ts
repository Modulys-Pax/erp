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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceOrderDto } from './dto/create-maintenance-order.dto';
import { UpdateMaintenanceOrderDto } from './dto/update-maintenance-order.dto';
import { MaintenanceOrderResponseDto } from './dto/maintenance-order-response.dto';
import { MaintenanceActionDto } from './dto/maintenance-action.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @RequirePermission('maintenance.create')
  @ApiOperation({ summary: 'Criar nova ordem de manutenção' })
  @ApiResponse({
    status: 201,
    description: 'Ordem de manutenção criada com sucesso',
    type: MaintenanceOrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recurso não encontrado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(
    @Body() createDto: CreateMaintenanceOrderDto,
    @CurrentUser() user: any,
  ): Promise<MaintenanceOrderResponseDto> {
    return this.maintenanceService.create(createDto, user?.sub, user);
  }

  @Get()
  @RequirePermission('maintenance.view')
  @ApiOperation({ summary: 'Listar todas as ordens de manutenção (com paginação)' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    type: String,
    description: 'Filtrar por filial',
  })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    type: String,
    description: 'Filtrar por veículo',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filtrar por status',
    enum: ['OPEN', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Incluir ordens excluídas',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página (padrão: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de ordens de manutenção',
  })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const include = includeDeleted === 'true';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.maintenanceService.findAll(branchId, vehicleId, status, startDate, endDate, include, pageNum, limitNum);
  }

  @Get('vehicle/:vehicleId')
  @RequirePermission('maintenance.view')
  @ApiOperation({ summary: 'Obter histórico de manutenções de um veículo' })
  @ApiResponse({
    status: 200,
    description: 'Histórico de manutenções',
    type: [MaintenanceOrderResponseDto],
  })
  getByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.maintenanceService.findAll(undefined, vehicleId, undefined, undefined, undefined, false, 1, 50);
  }

  @Get(':id')
  @RequirePermission('maintenance.view')
  @ApiOperation({ summary: 'Obter ordem de manutenção por ID' })
  @ApiResponse({
    status: 200,
    description: 'Dados da ordem de manutenção',
    type: MaintenanceOrderResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Ordem não encontrada' })
  findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<MaintenanceOrderResponseDto> {
    return this.maintenanceService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('maintenance.update')
  @ApiOperation({ summary: 'Atualizar ordem de manutenção' })
  @ApiResponse({
    status: 200,
    description: 'Ordem atualizada com sucesso',
    type: MaintenanceOrderResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Ordem não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Não é possível atualizar ordem concluída ou cancelada',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateMaintenanceOrderDto,
    @CurrentUser() user: any,
  ): Promise<MaintenanceOrderResponseDto> {
    return this.maintenanceService.update(id, updateDto, user?.sub, user);
  }

  @Post(':id/start')
  @RequirePermission('maintenance.update')
  @ApiOperation({ summary: 'Iniciar execução da ordem de manutenção' })
  @ApiResponse({
    status: 200,
    description: 'Ordem iniciada com sucesso',
    type: MaintenanceOrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ordem não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Apenas ordens abertas ou pausadas podem ser iniciadas',
  })
  start(
    @Param('id') id: string,
    @Body() actionDto: MaintenanceActionDto,
    @CurrentUser() user: any,
  ): Promise<MaintenanceOrderResponseDto> {
    return this.maintenanceService.start(id, actionDto, user?.sub);
  }

  @Post(':id/pause')
  @RequirePermission('maintenance.update')
  @ApiOperation({ summary: 'Pausar execução da ordem de manutenção' })
  @ApiResponse({
    status: 200,
    description: 'Ordem pausada com sucesso',
    type: MaintenanceOrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ordem não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Apenas ordens em execução podem ser pausadas',
  })
  pause(
    @Param('id') id: string,
    @Body() actionDto: MaintenanceActionDto,
    @CurrentUser() user: any,
  ): Promise<MaintenanceOrderResponseDto> {
    return this.maintenanceService.pause(id, actionDto, user?.sub);
  }

  @Post(':id/complete')
  @RequirePermission('maintenance.complete')
  @ApiOperation({ summary: 'Concluir ordem de manutenção' })
  @ApiResponse({
    status: 200,
    description: 'Ordem concluída com sucesso',
    type: MaintenanceOrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ordem não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Ordem já foi concluída ou cancelada',
  })
  complete(
    @Param('id') id: string,
    @Body() actionDto: MaintenanceActionDto,
    @CurrentUser() user: any,
  ): Promise<MaintenanceOrderResponseDto> {
    return this.maintenanceService.complete(id, actionDto, user?.sub);
  }

  @Post(':id/cancel')
  @RequirePermission('maintenance.cancel')
  @ApiOperation({ summary: 'Cancelar ordem de manutenção' })
  @ApiResponse({
    status: 200,
    description: 'Ordem cancelada com sucesso',
    type: MaintenanceOrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ordem não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Ordem já foi concluída ou cancelada',
  })
  cancel(
    @Param('id') id: string,
    @Body() actionDto: MaintenanceActionDto,
    @CurrentUser() user: any,
  ): Promise<MaintenanceOrderResponseDto> {
    return this.maintenanceService.cancel(id, actionDto, user?.sub);
  }

  @Post(':id/attachment')
  @RequirePermission('maintenance.upload-attachment')
  @ApiOperation({
    summary: 'Anexar nota/documento à ordem (ex.: nota de terceiro - troca na estrada)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Arquivo (PDF ou imagem)' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Anexo enviado com sucesso',
    type: MaintenanceOrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ordem não encontrada' })
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(pdf|image\/.*)/ }),
        ],
      }),
    )
    file: any,
    @CurrentUser() user: any,
  ): Promise<MaintenanceOrderResponseDto> {
    return this.maintenanceService.uploadAttachment(id, file, user?.sub);
  }

  @Get(':id/attachment')
  @RequirePermission('maintenance.view')
  @ApiOperation({ summary: 'Baixar/visualizar anexo da ordem (nota de terceiro)' })
  @ApiResponse({ status: 200, description: 'Arquivo do anexo' })
  @ApiResponse({ status: 404, description: 'Ordem ou anexo não encontrado' })
  async getAttachment(@Param('id') id: string): Promise<StreamableFile> {
    const { stream, fileName, mimeType } = await this.maintenanceService.getAttachmentStream(id);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `inline; filename="${fileName}"`,
    });
  }

  @Delete(':id')
  @RequirePermission('maintenance.delete')
  @ApiOperation({ summary: 'Excluir ordem de manutenção (soft delete)' })
  @ApiResponse({ status: 200, description: 'Ordem excluída com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Ordem não encontrada' })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.maintenanceService.remove(id, user);
  }
}
