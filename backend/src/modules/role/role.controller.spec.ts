import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

describe('RoleController', () => {
  let controller: RoleController;
  let roleService: RoleService;

  const mockRoleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getAllPermissions: jest.fn(),
    syncPermissions: jest.fn(),
  };

  const mockRole = {
    id: 'role-1',
    name: 'Admin',
    description: 'Administrator',
    permissions: ['users.view', 'users.create'],
  };

  const mockCurrentUser = { sub: 'admin-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [{ provide: RoleService, useValue: mockRoleService }],
    }).compile();

    controller = module.get<RoleController>(RoleController);
    roleService = module.get<RoleService>(RoleService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getAllPermissions', () => {
    it('deve retornar todas as permissões', async () => {
      const permissions = [{ module: 'users', permissions: ['view', 'create'] }];
      mockRoleService.getAllPermissions.mockResolvedValue(permissions);

      const result = await controller.getAllPermissions();

      expect(result).toEqual(permissions);
    });
  });

  describe('syncPermissions', () => {
    it('deve sincronizar permissões', async () => {
      mockRoleService.syncPermissions.mockResolvedValue(undefined);

      const result = await controller.syncPermissions();

      expect(result).toEqual({ message: 'Permissões sincronizadas com sucesso' });
    });
  });

  describe('findAll', () => {
    it('deve retornar todos os cargos', async () => {
      mockRoleService.findAll.mockResolvedValue([mockRole]);

      const result = await controller.findAll();

      expect(result).toEqual([mockRole]);
      expect(roleService.findAll).toHaveBeenCalledWith(false);
    });

    it('deve incluir inativos quando solicitado', async () => {
      mockRoleService.findAll.mockResolvedValue([]);

      await controller.findAll('true');

      expect(roleService.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('findOne', () => {
    it('deve retornar um cargo', async () => {
      mockRoleService.findOne.mockResolvedValue(mockRole);

      const result = await controller.findOne('role-1');

      expect(result).toEqual(mockRole);
    });
  });

  describe('create', () => {
    it('deve criar um cargo', async () => {
      const createDto = { name: 'New Role', permissions: [] };
      mockRoleService.create.mockResolvedValue(mockRole);

      const result = await controller.create(createDto, mockCurrentUser);

      expect(result).toEqual(mockRole);
      expect(roleService.create).toHaveBeenCalledWith(createDto, 'admin-1');
    });
  });

  describe('update', () => {
    it('deve atualizar um cargo', async () => {
      const updateDto = { name: 'Updated' };
      mockRoleService.update.mockResolvedValue({ ...mockRole, ...updateDto });

      const result = await controller.update('role-1', updateDto, mockCurrentUser);

      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('deve remover um cargo', async () => {
      mockRoleService.remove.mockResolvedValue(undefined);

      await controller.remove('role-1');

      expect(roleService.remove).toHaveBeenCalledWith('role-1');
    });
  });
});
