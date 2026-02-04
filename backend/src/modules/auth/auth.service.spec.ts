import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { createMockPrismaService, PrismaMock } from '../../shared/testing/prisma.mock';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    active: true,
    companyId: 'company-123',
    branchId: 'branch-123',
    roleId: 'role-123',
    role: {
      id: 'role-123',
      name: 'Admin',
      description: 'Administrador',
      permissions: [
        { permission: { name: 'users.view' } },
        { permission: { name: 'users.create' } },
      ],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRefreshToken = {
    id: 'refresh-token-123',
    token: 'valid-refresh-token',
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    revoked: false,
    user: mockUser,
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('deve fazer login com sucesso', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Credenciais inválidas');
    });

    it('deve lançar UnauthorizedException quando usuário está inativo', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, active: false });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Usuário inativo');
    });

    it('deve lançar UnauthorizedException quando senha está incorreta', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Credenciais inválidas');
    });

    it('deve gerar tokens JWT corretamente', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role.name,
        companyId: mockUser.companyId,
        branchId: mockUser.branchId,
      });
    });
  });

  describe('refresh', () => {
    const refreshTokenDto = { refreshToken: 'valid-refresh-token' };

    it('deve renovar tokens com sucesso', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.refreshToken.update.mockResolvedValue({ ...mockRefreshToken, revoked: true });
      prisma.refreshToken.create.mockResolvedValue({ ...mockRefreshToken, token: 'new-token' });

      const result = await service.refresh(refreshTokenDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: mockRefreshToken.id },
        data: { revoked: true },
      });
    });

    it('deve lançar UnauthorizedException quando token não existe', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh(refreshTokenDto)).rejects.toThrow('Refresh token inválido');
    });

    it('deve lançar UnauthorizedException quando token está revogado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        revoked: true,
      });

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh(refreshTokenDto)).rejects.toThrow('Refresh token revogado');
    });

    it('deve lançar UnauthorizedException quando token está expirado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // Expirado
      });

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh(refreshTokenDto)).rejects.toThrow('Refresh token expirado');
    });

    it('deve lançar UnauthorizedException quando usuário está inativo', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        user: { ...mockUser, active: false },
      });

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh(refreshTokenDto)).rejects.toThrow('Usuário inativo');
    });
  });

  describe('me', () => {
    it('deve retornar dados do usuário com permissões', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.me(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.name).toBe(mockUser.name);
      expect(result.permissions).toEqual(['users.view', 'users.create']);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('invalid-id')).rejects.toThrow(NotFoundException);
      await expect(service.me('invalid-id')).rejects.toThrow('Usuário não encontrado');
    });

    it('deve retornar array vazio de permissões quando role não tem permissões', async () => {
      const userWithoutPermissions = {
        ...mockUser,
        role: {
          ...mockUser.role,
          permissions: [],
        },
      };
      prisma.user.findUnique.mockResolvedValue(userWithoutPermissions);

      const result = await service.me(mockUser.id);

      expect(result.permissions).toEqual([]);
    });

    it('deve retornar dados completos do role', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.me(mockUser.id);

      expect(result.role).toEqual({
        id: mockUser.role.id,
        name: mockUser.role.name,
        description: mockUser.role.description,
      });
    });
  });

  describe('login - edge cases', () => {
    it('deve salvar refresh token no banco ao fazer login', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({ email: 'test@example.com', password: 'password123' });

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: expect.any(String),
          userId: mockUser.id,
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('deve retornar estrutura correta do usuário na resposta', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        companyId: mockUser.companyId,
        branchId: mockUser.branchId,
        permissions: ['users.view', 'users.create'],
        role: {
          id: mockUser.role.id,
          name: mockUser.role.name,
        },
      });
    });
  });

  describe('refresh - edge cases', () => {
    it('deve revogar token antigo e criar novo ao fazer refresh', async () => {
      const oldToken = { ...mockRefreshToken };
      prisma.refreshToken.findUnique.mockResolvedValue(oldToken);
      prisma.refreshToken.update.mockResolvedValue({ ...oldToken, revoked: true });
      prisma.refreshToken.create.mockResolvedValue({ ...oldToken, token: 'new-token' });

      await service.refresh({ refreshToken: 'valid-refresh-token' });

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: oldToken.id },
        data: { revoked: true },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('deve gerar novo access token com payload correto ao fazer refresh', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.refreshToken.update.mockResolvedValue({ ...mockRefreshToken, revoked: true });
      prisma.refreshToken.create.mockResolvedValue({ ...mockRefreshToken, token: 'new-token' });

      await service.refresh({ refreshToken: 'valid-refresh-token' });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role.name,
        companyId: mockUser.companyId,
        branchId: mockUser.branchId,
      });
    });

    it('deve retornar estrutura correta do usuário na resposta do refresh', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.refreshToken.update.mockResolvedValue({ ...mockRefreshToken, revoked: true });
      prisma.refreshToken.create.mockResolvedValue({ ...mockRefreshToken, token: 'new-token' });

      const result = await service.refresh({ refreshToken: 'valid-refresh-token' });

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        companyId: mockUser.companyId,
        branchId: mockUser.branchId,
        permissions: expect.any(Array),
        role: {
          id: mockUser.role.id,
          name: mockUser.role.name,
        },
      });
    });
  });

  describe('me - edge cases', () => {
    it('deve retornar múltiplas permissões corretamente', async () => {
      const userWithManyPermissions = {
        ...mockUser,
        role: {
          ...mockUser.role,
          permissions: [
            { permission: { name: 'users.view' } },
            { permission: { name: 'users.create' } },
            { permission: { name: 'users.edit' } },
            { permission: { name: 'users.delete' } },
          ],
        },
      };
      prisma.user.findUnique.mockResolvedValue(userWithManyPermissions);

      const result = await service.me(mockUser.id);

      expect(result.permissions).toEqual([
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
      ]);
      expect(result.permissions).toHaveLength(4);
    });

    it('deve retornar companyId e branchId do usuário', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.me(mockUser.id);

      expect(result.companyId).toBe(mockUser.companyId);
      expect(result.branchId).toBe(mockUser.branchId);
    });
  });
});
