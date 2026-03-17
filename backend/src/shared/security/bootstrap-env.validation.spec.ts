import { validateBootstrapEnv } from './bootstrap-env.validation';

describe('validateBootstrapEnv', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('não lança fora de produção com secret fraco', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    expect(() => validateBootstrapEnv()).not.toThrow();
  });

  it('lança em produção sem JWT_SECRET', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => validateBootstrapEnv()).toThrow(/JWT_SECRET/);
  });

  it('lança em produção com secret padrão', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'change-me-in-production';
    expect(() => validateBootstrapEnv()).toThrow(/JWT_SECRET/);
  });

  it('lança em produção com secret curto', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short-secret-under-32-chars!!';
    expect(() => validateBootstrapEnv()).toThrow(/32/);
  });

  it('aceita produção com secret forte (32+)', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    expect(() => validateBootstrapEnv()).not.toThrow();
  });
});
