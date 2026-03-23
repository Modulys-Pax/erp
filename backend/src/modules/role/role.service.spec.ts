import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RoleService } from './role.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { createMockPrismaService, PrismaMock } from '../../shared/testing/prisma.mock';

// Mock das constantes de permissões
jest.mock('../../shared/constants/permissions.constants', () => ({
  PERMISSIONS: [
    {
      module: 'users',
      label: 'Usuários',
      permissions: [
        { name: 'users.view', description: 'Visualizar usuários', module: 'users', action: 'view' },
        { name: 'users.create', description: 'Criar usuários', module: 'users', action: 'create' },
      ],
    },
  ],
  ALL_PERMISSIONS: [
    { name: 'users.view', description: 'Visualizar usuários', module: 'users', action: 'view' },
    { name: 'users.create', description: 'Criar usuários', module: 'users', action: 'create' },
  ],
}));

describe('RoleService', () => {
  let service: RoleService;
  let prisma: PrismaMock;

  const mockRole = {
    id: 'role-123',
    name: 'ADMIN',
    description: 'Administrador do sistema',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-123',
    permissions: [
      {
        id: 'rp-123',
        roleId: 'role-123',
        permissionId: 'perm-123',
        permission: {
          id: 'perm-123',
          name: 'users.view',
          description: 'Visualizar usuários',
          module: 'users',
          action: 'view',
        },
      },
    ],
  };

  const mockPermission = {
    id: 'perm-123',
    name: 'users.view',
    description: 'Visualizar usuários',
    module: 'users',
    action: 'view',
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPermissions', () => {
    it('deve retornar todas as permissões disponíveis', async () => {
      const result = await service.getAllPermissions();

      expect(result).toHaveLength(1);
      expect(result[0].module).toBe('users');
    });
  });

  describe('syncPermissions', () => {
    it('deve sincronizar permissões', async () => {
      prisma.permission.upsert.mockResolvedValue(mockPermission);

      await service.syncPermissions();

      expect(prisma.permission.upsert).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve retornar lista de cargos ativos', async () => {
      prisma.role.findMany.mockResolvedValue([mockRole]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ADMIN');
      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
    });

    it('deve incluir inativos quando solicitado', async () => {
      prisma.role.findMany.mockResolvedValue([
        mockRole,
        { ...mockRole, id: 'role-456', active: false },
      ]);

      const result = await service.findAll(true);

      expect(result).toHaveLength(2);
      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('deve retornar permissões do cargo', async () => {
      prisma.role.findMany.mockResolvedValue([mockRole]);

      const result: any[] = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].permissions).toHaveLength(1);
      expect(result[0].permissions[0].name).toBe('users.view');
    });
  });

  describe('findOne', () => {
    it('deve retornar cargo por ID', async () => {
      prisma.role.findFirst.mockResolvedValue(mockRole);

      const result = await service.findOne('role-123');

      expect(result.id).toBe(mockRole.id);
      expect(result.name).toBe(mockRole.name);
    });

    it('deve lançar NotFoundException quando cargo não existe', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-id')).rejects.toThrow('Cargo não encontrado');
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'MANAGER',
      description: 'Gerente',
      permissions: ['users.view'],
    };

    it('deve criar cargo com sucesso', async () => {
      prisma.role.findFirst.mockResolvedValue(null); // Nome não existe
      prisma.permission.upsert.mockResolvedValue(mockPermission);
      prisma.permission.findMany.mockResolvedValue([mockPermission]);
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          role: {
            create: jest.fn().mockResolvedValue({ ...mockRole, name: 'MANAGER' }),
          },
          rolePermission: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });
      prisma.role.findFirst
        .mockResolvedValueOnce(null) // Verificação de nome
        .mockResolvedValueOnce({ ...mockRole, name: 'MANAGER', permissions: [] }); // findOne após criar

      const result = await service.create(createDto);

      expect(result.name).toBe('MANAGER');
    });

    it('deve lançar ConflictException quando nome já existe', async () => {
      prisma.role.findFirst.mockResolvedValue(mockRole);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow('Nome do cargo já cadastrado');
    });

    it('deve lançar BadRequestException quando permissão não existe', async () => {
      prisma.role.findFirst.mockResolvedValue(null);
      prisma.permission.upsert.mockResolvedValue(mockPermission);
      prisma.permission.findMany.mockResolvedValue([]); // Nenhuma permissão encontrada

      await expect(
        service.create({ ...createDto, permissions: ['invalid.permission'] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...createDto, permissions: ['invalid.permission'] }),
      ).rejects.toThrow(/Permissões não encontradas/);
    });

    it('deve lançar BadRequestException quando cargo não tiver permissões', async () => {
      const dtoSemPermissoes = { name: 'VIEWER', description: 'Apenas visualização' };

      prisma.role.findFirst.mockResolvedValueOnce(null); // Verificação de nome

      await expect(service.create(dtoSemPermissoes)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoSemPermissoes)).rejects.toThrow(
        'Informe ao menos uma permissão para o cargo',
      );
    });
  });

  describe('update', () => {
    it('deve atualizar cargo com sucesso', async () => {
      prisma.role.findFirst
        .mockResolvedValueOnce(mockRole) // Busca inicial
        .mockResolvedValueOnce({ ...mockRole, description: 'Nova descrição', permissions: [] }); // findOne após update
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
      prisma.role.update.mockResolvedValue({ ...mockRole, description: 'Nova descrição' });

      const result = await service.update('role-123', { description: 'Nova descrição' });

      expect(result.description).toBe('Nova descrição');
    });

    it('deve lançar NotFoundException quando cargo não existe', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException quando novo nome já existe', async () => {
      prisma.role.findFirst
        .mockResolvedValueOnce(mockRole) // Cargo atual
        .mockResolvedValueOnce({ ...mockRole, id: 'other-role' }); // Outro cargo com mesmo nome

      await expect(service.update('role-123', { name: 'EXISTING_NAME' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve atualizar permissões', async () => {
      prisma.role.findFirst
        .mockResolvedValueOnce(mockRole)
        .mockResolvedValueOnce({ ...mockRole, permissions: [] });
      prisma.permission.upsert.mockResolvedValue(mockPermission);
      prisma.permission.findMany.mockResolvedValue([mockPermission]);
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          role: { update: jest.fn() },
          rolePermission: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.update('role-123', { permissions: ['users.view'] });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('deve remover todas permissões quando array vazio', async () => {
      prisma.role.findFirst
        .mockResolvedValueOnce(mockRole)
        .mockResolvedValueOnce({ ...mockRole, permissions: [] });
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          role: { update: jest.fn() },
          rolePermission: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.update('role-123', { permissions: [] });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve remover cargo com sucesso', async () => {
      const nonAdminRole = { ...mockRole, name: 'MANAGER' };
      prisma.role.findFirst.mockResolvedValue(nonAdminRole);
      prisma.user.count.mockResolvedValue(0);
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          rolePermission: { deleteMany: jest.fn() },
          role: { delete: jest.fn() },
        };
        return callback(tx);
      });

      await service.remove('role-123');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando cargo não existe', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException ao tentar excluir cargo ADMIN', async () => {
      prisma.role.findFirst.mockResolvedValue(mockRole); // name = 'ADMIN'

      await expect(service.remove('role-123')).rejects.toThrow(ConflictException);
      await expect(service.remove('role-123')).rejects.toThrow(
        'Não é possível excluir o cargo ADMIN',
      );
    });

    it('deve lançar ConflictException quando cargo está em uso', async () => {
      const nonAdminRole = { ...mockRole, name: 'MANAGER' };
      prisma.role.findFirst.mockResolvedValue(nonAdminRole);
      prisma.user.count.mockResolvedValue(5); // 5 usuários usando este cargo

      await expect(service.remove('role-123')).rejects.toThrow(ConflictException);
      await expect(service.remove('role-123')).rejects.toThrow(
        'Não é possível excluir cargo que está em uso por usuários',
      );
    });
  });
});
