import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Buscar usuário por email com permissões do cargo
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
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

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Gerar tokens
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      companyId: user.companyId,
      branchId: user.branchId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Extrair permissões do cargo
    const permissions = (user.role as { permissions?: { permission: { name: string } }[] }).permissions
      ?.map((rp) => rp.permission.name) ?? [];

    // Retornar resposta com permissões
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: user.companyId,
        branchId: user.branchId,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
        permissions,
      },
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    // Buscar refresh token
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenDto.refreshToken },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (refreshToken.revoked) {
      throw new UnauthorizedException('Refresh token revogado');
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const user = refreshToken.user;

    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Buscar role com permissões para refresh
    const userWithPermissions = await this.prisma.user.findUnique({
      where: { id: user.id },
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

    const permissions = userWithPermissions?.role
      ? (userWithPermissions.role as { permissions?: { permission: { name: string } }[] }).permissions
        ?.map((rp) => rp.permission.name) ?? []
      : [];

    // Gerar novos tokens
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      companyId: user.companyId,
      branchId: user.branchId,
    };

    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(user.id);

    // Revogar refresh token antigo
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { revoked: true },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: user.companyId,
        branchId: user.branchId,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
        permissions,
      },
    };
  }

  async me(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Extrair nomes das permissões
    const permissions = user.role.permissions.map((rp) => rp.permission.name);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      companyId: user.companyId,
      branchId: user.branchId,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
      },
      permissions,
    };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    // Gerar token aleatório
    const token = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: '30d', // Refresh token expira em 30 dias
      },
    );

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Salvar no banco
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }
}
