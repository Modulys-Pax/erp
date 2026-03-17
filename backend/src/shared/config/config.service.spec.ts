import { ConfigService, databaseConfig, jwtConfig, appConfig } from './config.service';

describe('ConfigService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('load', () => {
    it('deve carregar configurações com valores padrão', () => {
      const config = ConfigService.load();

      expect(config.database).toBeDefined();
      expect(config.jwt).toBeDefined();
      expect(config.app).toBeDefined();
    });

    it('deve ter url de database padrão', () => {
      delete process.env.DATABASE_URL;
      const config = ConfigService.load();

      expect(config.database.url).toContain('postgresql://');
    });

    it('deve usar DATABASE_URL do ambiente', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      const config = ConfigService.load();

      expect(config.database.url).toBe('postgresql://test:test@localhost:5432/test');
    });

    it('deve ter secret JWT padrão', () => {
      delete process.env.JWT_SECRET;
      const config = ConfigService.load();

      expect(config.jwt.secret).toBe('change-me-in-production');
    });

    it('deve ter expiração JWT padrão de 7d', () => {
      delete process.env.JWT_EXPIRES_IN;
      delete process.env.JWT_EXPIRATION;
      const config = ConfigService.load();

      expect(config.jwt.expiresIn).toBe('7d');
    });

    it('deve aceitar JWT_EXPIRATION como alias quando JWT_EXPIRES_IN ausente', () => {
      delete process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRATION = '1h';
      const config = ConfigService.load();

      expect(config.jwt.expiresIn).toBe('1h');
    });

    it('deve ter porta padrão 3001', () => {
      delete process.env.PORT;
      const config = ConfigService.load();

      expect(config.app.port).toBe(3001);
    });

    it('deve usar PORT do ambiente', () => {
      process.env.PORT = '4000';
      const config = ConfigService.load();

      expect(config.app.port).toBe(4000);
    });

    it('deve ter nodeEnv padrão development', () => {
      delete process.env.NODE_ENV;
      const config = ConfigService.load();

      expect(config.app.nodeEnv).toBe('development');
    });

    it('deve ter frontendUrl padrão', () => {
      delete process.env.FRONTEND_URL;
      const config = ConfigService.load();

      expect(config.app.frontendUrl).toBe('http://localhost:3000');
    });
  });

  describe('registerAs configs', () => {
    it('databaseConfig deve retornar objeto com url', () => {
      const config = databaseConfig();
      expect(config.url).toBeDefined();
    });

    it('jwtConfig deve retornar objeto com secret e expiresIn', () => {
      const config = jwtConfig();
      expect(config.secret).toBeDefined();
      expect(config.expiresIn).toBeDefined();
    });

    it('appConfig deve retornar objeto completo', () => {
      const config = appConfig();
      expect(config.port).toBeDefined();
      expect(config.nodeEnv).toBeDefined();
      expect(config.frontendUrl).toBeDefined();
    });
  });
});
