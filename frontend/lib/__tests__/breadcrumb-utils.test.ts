import { generateBreadcrumbs } from '../breadcrumb-utils';

describe('breadcrumb-utils', () => {
  describe('generateBreadcrumbs', () => {
    it('deve retornar Painel > Início para /dashboard', () => {
      const result = generateBreadcrumbs('/dashboard');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ label: 'Painel', href: '/dashboard' });
      expect(result[1]).toEqual({ label: 'Início' });
    });

    it('deve retornar Painel > Início para /', () => {
      const result = generateBreadcrumbs('/');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ label: 'Painel', href: '/dashboard' });
      expect(result[1]).toEqual({ label: 'Início' });
    });

    it('deve gerar breadcrumbs para página de listagem', () => {
      const result = generateBreadcrumbs('/employees');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ label: 'Painel', href: '/dashboard' });
      expect(result[1]).toEqual({ label: 'Funcionários' });
    });

    it('deve gerar breadcrumbs para página de detalhes com UUID e links funcionais', () => {
      const result = generateBreadcrumbs('/employees/550e8400-e29b-41d4-a716-446655440000');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ label: 'Painel', href: '/dashboard' });
      expect(result[1]).toEqual({ label: 'Funcionários', href: '/employees' });
      expect(result[2]).toEqual({ label: 'Detalhes' });
    });

    it('deve gerar breadcrumbs para página new', () => {
      const result = generateBreadcrumbs('/employees/new');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ label: 'Painel', href: '/dashboard' });
      expect(result[1]).toEqual({ label: 'Funcionários', href: '/employees' });
      expect(result[2]).toEqual({ label: 'Novo' });
    });

    it('deve traduzir rotas conhecidas para português', () => {
      const testCases = [
        { path: '/vehicles', expected: 'Veículos' },
        { path: '/products', expected: 'Produtos' },
        { path: '/maintenance', expected: 'Manutenção' },
        { path: '/branches', expected: 'Filiais' },
        { path: '/accounts-payable', expected: 'Contas a Pagar' },
        { path: '/accounts-receivable', expected: 'Contas a Receber' },
        { path: '/stock', expected: 'Estoque' },
        { path: '/audit', expected: 'Auditoria' },
      ];

      testCases.forEach(({ path, expected }) => {
        const result = generateBreadcrumbs(path);
        expect(result[result.length - 1].label).toBe(expected);
      });
    });

    it('deve remover query params', () => {
      const result = generateBreadcrumbs('/employees?page=2&search=test');

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ label: 'Funcionários' });
    });

    it('deve remover hash', () => {
      const result = generateBreadcrumbs('/employees#section');

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ label: 'Funcionários' });
    });

    it('deve formatar segmentos desconhecidos em português', () => {
      const result = generateBreadcrumbs('/custom-page');

      expect(result).toHaveLength(2);
      expect(result[1].label).toBe('Custom Page');
    });

    it('deve lidar com ID numérico', () => {
      const result = generateBreadcrumbs('/products/123');

      expect(result).toHaveLength(3);
      expect(result[2]).toEqual({ label: 'Detalhes' });
    });

    it('deve gerar links corretos para subpáginas', () => {
      const result = generateBreadcrumbs('/employees/123/payments');

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ label: 'Painel', href: '/dashboard' });
      expect(result[1]).toEqual({ label: 'Funcionários', href: '/employees' });
      expect(result[2]).toEqual({ label: 'Detalhes', href: '/employees/123' });
      expect(result[3]).toEqual({ label: 'Pagamentos' });
    });

    it('deve tratar products/summary corretamente', () => {
      const result = generateBreadcrumbs('/products/summary');

      expect(result).toHaveLength(3);
      expect(result[1]).toEqual({ label: 'Produtos', href: '/products' });
      expect(result[2]).toEqual({ label: 'Resumo de Produtos' });
    });
  });
});
