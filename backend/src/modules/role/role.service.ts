import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RoleResponseDto, PermissionResponseDto } from './dto/role-response.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  PERMISSIONS,
  ALL_PERMISSIONS,
  PermissionModule,
} from '../../shared/constants/permissions.constants';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna todas as permissões disponíveis no sistema (agrupadas por módulo)
   */
  async getAllPermissions(): Promise<PermissionModule[]> {
    return PERMISSIONS;
  }

  /**
   * Sincroniza as permissões do banco com as definidas no código
   * (cria as que não existem)
   */
  async syncPermissions(): Promise<void> {
    for (const permission of ALL_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { name: permission.name },
        update: {
          description: permission.description,
          module: permission.module,
          action: permission.action,
        },
        create: {
          name: permission.name,
          description: permission.description,
          module: permission.module,
          action: permission.action,
        },
      });
    }
  }

  async findAll(includeInactive = false): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: {
        name: 'asc',
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map((role) => this.mapToResponse(role));
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findFirst({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Cargo não encontrado');
    }

    return this.mapToResponse(role);
  }

  async create(createRoleDto: CreateRoleDto, userId?: string): Promise<RoleResponseDto> {
    // Verificar se nome já existe
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: createRoleDto.name,
      },
    });

    if (existingRole) {
      throw new ConflictException('Nome do cargo já cadastrado');
    }

    // Validar permissões: cargo não pode ser cadastrado sem ao menos 1 permissão
    // (exceto o cargo ADMIN, que possui bypass automático de autorização)
    const isAdminRole = createRoleDto.name?.toUpperCase() === 'ADMIN';
    const permissionNames = createRoleDto.permissions || [];
    if (!isAdminRole && permissionNames.length === 0) {
      throw new BadRequestException('Informe ao menos uma permissão para o cargo');
    }
    let permissionIds: string[] = [];

    if (permissionNames.length > 0) {
      // Sincronizar permissões primeiro
      await this.syncPermissions();

      // Buscar IDs das permissões
      const permissions = await this.prisma.permission.findMany({
        where: {
          name: { in: permissionNames },
        },
      });

      if (permissions.length !== permissionNames.length) {
        const foundNames = permissions.map((p) => p.name);
        const notFound = permissionNames.filter((n) => !foundNames.includes(n));
        throw new BadRequestException(`Permissões não encontradas: ${notFound.join(', ')}`);
      }

      permissionIds = permissions.map((p) => p.id);
    }

    const role = await this.prisma.$transaction(async (tx) => {
      // Criar o cargo
      const newRole = await tx.role.create({
        data: {
          name: createRoleDto.name,
          description: createRoleDto.description,
          active: createRoleDto.active ?? true,
          createdBy: userId,
        },
      });

      // Associar permissões
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: newRole.id,
            permissionId,
            createdBy: userId,
          })),
        });
      }

      return newRole;
    });

    return this.findOne(role.id);
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    userId?: string,
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findFirst({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Cargo não encontrado');
    }

    // Se estiver atualizando o nome, verificar se já existe outro com o mesmo nome
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          name: updateRoleDto.name,
          id: { not: id },
        },
      });

      if (existingRole) {
        throw new ConflictException('Nome do cargo já cadastrado');
      }
    }

    // Validar permissões se fornecidas
    const permissionNames = updateRoleDto.permissions;
    let permissionIds: string[] | undefined;

    if (permissionNames !== undefined) {
      const isAdminRole = role?.name?.toUpperCase() === 'ADMIN';
      if (!isAdminRole && permissionNames.length === 0) {
        throw new BadRequestException('Informe ao menos uma permissão para o cargo');
      }
      if (permissionNames.length > 0) {
        // Sincronizar permissões primeiro
        await this.syncPermissions();

        // Buscar IDs das permissões
        const permissions = await this.prisma.permission.findMany({
          where: {
            name: { in: permissionNames },
          },
        });

        if (permissions.length !== permissionNames.length) {
          const foundNames = permissions.map((p) => p.name);
          const notFound = permissionNames.filter((n) => !foundNames.includes(n));
          throw new BadRequestException(`Permissões não encontradas: ${notFound.join(', ')}`);
        }

        permissionIds = permissions.map((p) => p.id);
      } else {
        permissionIds = [];
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Atualizar o cargo
      await tx.role.update({
        where: { id },
        data: {
          name: updateRoleDto.name,
          description: updateRoleDto.description,
          active: updateRoleDto.active,
          updatedAt: new Date(),
        },
      });

      // Atualizar permissões se fornecidas
      if (permissionIds !== undefined) {
        // Remover permissões existentes
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Adicionar novas permissões
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
              createdBy: userId,
            })),
          });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Cargo não encontrado');
    }

    // Não permitir excluir o cargo ADMIN
    if (role.name === 'ADMIN') {
      throw new ConflictException('Não é possível excluir o cargo ADMIN');
    }

    // Verificar se há usuários usando este cargo
    const usersWithRole = await this.prisma.user.count({
      where: {
        roleId: id,
        deletedAt: null,
      },
    });

    if (usersWithRole > 0) {
      throw new ConflictException('Não é possível excluir cargo que está em uso por usuários');
    }

    await this.prisma.$transaction(async (tx) => {
      // Remover permissões do cargo
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Remover o cargo
      await tx.role.delete({
        where: { id },
      });
    });
  }

  private mapToResponse(role: any): RoleResponseDto {
    const permissions: PermissionResponseDto[] = (role.permissions || []).map((rp: any) => ({
      id: rp.permission.id,
      name: rp.permission.name,
      description: rp.permission.description,
      module: rp.permission.module,
      action: rp.permission.action,
    }));

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      active: role.active,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions,
    };
  }
}
