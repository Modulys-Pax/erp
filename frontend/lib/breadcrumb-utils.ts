import { BreadcrumbItem } from '@/components/ui/breadcrumb';

// Mapeamento de rotas para labels em português
const routeLabels: Record<string, string> = {
  dashboard: 'Painel',
  companies: 'Empresas',
  branches: 'Filiais',
  users: 'Usuários',
  products: 'Produtos',
  employees: 'Funcionários',
  vehicles: 'Veículos',
  maintenance: 'Manutenção',
  audit: 'Auditoria',
  stock: 'Estoque',
  warehouses: 'Depósitos',
  'accounts-payable': 'Contas a Pagar',
  'accounts-receivable': 'Contas a Receber',
  costs: 'Gastos com Veículos',
  summary: 'Resumo de Produtos',
  new: 'Novo',
  financial: 'Financeiro',
  wallet: 'Carteira',
  expenses: 'Despesas',
  'maintenance-labels': 'Etiquetas',
  'product-changes': 'Registros na Estrada',
  markings: 'Marcações',
  payroll: 'Folha de Pagamento',
  benefits: 'Benefícios',
  roles: 'Cargos',
  'vehicle-brands': 'Marcas de Veículos',
  'vehicle-models': 'Modelos de Veículos',
  'units-of-measurement': 'Unidades de Medida',
  movements: 'Movimentações',
  documents: 'Documentos',
  chat: 'Chat',
  payments: 'Pagamentos',
};

/**
 * Gera breadcrumbs baseado na rota atual
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove query params e hash
  const cleanPath = pathname.split('?')[0].split('#')[0];
  
  // Sempre começa com Painel (link para /dashboard)
  const items: BreadcrumbItem[] = [
    { label: 'Painel', href: '/dashboard' },
  ];

  // Página inicial do dashboard
  if (cleanPath === '/dashboard' || cleanPath === '/') {
    items.push({ label: 'Início' });
    return items;
  }

  // Divide o path em segmentos
  const segments = cleanPath.split('/').filter(Boolean);

  // Remove 'dashboard' se for o primeiro segmento
  const filteredSegments = segments.filter((seg) => seg !== 'dashboard');

  // Constrói breadcrumbs com hrefs corretos (baseados no path real da URL)
  filteredSegments.forEach((segment, index) => {
    const isLast = index === filteredSegments.length - 1;
    const label = routeLabels[segment] || formatSegmentLabel(segment);
    // Path real da URL: /seg1/seg2/... (sem /dashboard no meio)
    const href = '/' + filteredSegments.slice(0, index + 1).join('/');
    
    if (!isLast) {
      items.push({ label, href });
    } else {
      items.push({ label });
    }
  });

  return items;
}

/**
 * Formata um segmento de rota para label legível em português
 */
function formatSegmentLabel(segment: string): string {
  // Se for um ID (UUID ou número), retorna Detalhes
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return 'Detalhes';
  }
  
  if (/^\d+$/.test(segment)) {
    return 'Detalhes';
  }

  // Capitaliza e substitui hífens por espaços
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
