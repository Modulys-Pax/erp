'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useBranch } from '@/lib/contexts/branch-context';
import { usePermissions } from '@/lib/contexts/permission-context';
import { useQuery } from '@tanstack/react-query';
import { branchApi } from '@/lib/api/branch';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  MapPin,
  Users,
  Package,
  UserCircle,
  Truck,
  Wrench,
  ShieldCheck,
  LogOut,
  X,
  PanelLeftClose,
  DollarSign,
  Settings,
  Warehouse,
  ChevronDown,
  ChevronRight,
  Ruler,
  ClipboardList,
  BarChart3,
  FileText,
  Gauge,
  MapPinIcon,
  MapPinnedIcon,
  Wallet,
  MessageCircle,
  Building2,
  LayoutGrid,
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Permissão necessária para visualizar este item (opcional - sem permissão = visível para todos) */
  permission?: string;
}

interface NavigationGroup {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavigationItem[];
}

// Itens diretos na sidebar (sem categoria/grupo)
const directNavigationItems: NavigationItem[] = [
  { name: 'Início', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
];

const navigationGroups: NavigationGroup[] = [
  {
    title: 'Financeiro',
    icon: DollarSign,
    items: [
      { name: 'Carteira', href: '/financial/wallet', icon: Wallet, permission: 'wallet.view' },
      { name: 'Despesas', href: '/financial/expenses', icon: DollarSign, permission: 'expenses.view' },
      { name: 'Resumo Financeiro', href: '/financial/summary', icon: BarChart3, permission: 'wallet.view' },
      { name: 'Contas a Pagar', href: '/accounts-payable', icon: DollarSign, permission: 'accounts-payable.view' },
      { name: 'Pedidos de Compra', href: '/purchase-orders', icon: ShoppingCart, permission: 'purchase-orders.view' },
      { name: 'Pedidos de Venda', href: '/sales-orders', icon: ShoppingBag, permission: 'sales-orders.view' },
      { name: 'Contas a Receber', href: '/accounts-receivable', icon: DollarSign, permission: 'accounts-receivable.view' },
      { name: 'Documentos Fiscais', href: '/fiscal-documents', icon: FileText, permission: 'fiscal-documents.view' },
      { name: 'Fluxo de Caixa Projetado', href: '/financial/cash-flow', icon: TrendingUp, permission: 'wallet.view' },
      { name: 'Resultado por Período (DRE)', href: '/financial/result-by-period', icon: BarChart3, permission: 'wallet.view' },
      { name: 'CP por Fornecedor', href: '/financial/reports/payable-by-supplier', icon: BarChart3, permission: 'accounts-payable.view' },
      { name: 'CR por Cliente', href: '/financial/reports/receivable-by-customer', icon: BarChart3, permission: 'accounts-receivable.view' },
      { name: 'Conciliação Bancária', href: '/financial/bank-reconciliation', icon: RefreshCw, permission: 'bank-reconciliation.view' },
    ],
  },
  {
    title: 'Pessoas',
    icon: Users,
    items: [
      { name: 'Funcionários', href: '/employees', icon: Users, permission: 'employees.view' },
      { name: 'Férias', href: '/vacations', icon: ClipboardList, permission: 'vacations.view' },
      { name: 'Folha de Pagamento', href: '/payroll', icon: FileText, permission: 'payroll.view' },
      { name: 'Benefícios', href: '/benefits', icon: Package, permission: 'benefits.view' },
    ],
  },
  {
    title: 'Frota & Estoque',
    icon: Truck,
    items: [
      { name: 'Veículos', href: '/vehicles', icon: Truck, permission: 'vehicles.view' },
      { name: 'Viagens', href: '/trips', icon: MapPinIcon, permission: 'trips.view' },
      { name: 'Manutenção', href: '/maintenance', icon: Wrench, permission: 'maintenance.view' },
      { name: 'Marcações', href: '/markings', icon: Gauge, permission: 'vehicle-markings.view' },
      { name: 'Registros na Estrada', href: '/product-changes', icon: MapPinnedIcon, permission: 'vehicle-markings.register-change' },
      { name: 'Etiquetas', href: '/maintenance-labels', icon: FileText, permission: 'maintenance-labels.view' },
      { name: 'Produtos', href: '/products', icon: Package, permission: 'products.view' },
      { name: 'Estoque', href: '/stock', icon: Warehouse, permission: 'stock.view' },
      { name: 'Movimentações', href: '/stock/movements', icon: ClipboardList, permission: 'stock.view' },
      { name: 'Resumo de Produtos', href: '/products/summary', icon: BarChart3, permission: 'products.view' },
    ],
  },
  {
    title: 'Relatórios',
    icon: BarChart3,
    items: [
      { name: 'Rentabilidade por Veículo', href: '/reports/vehicle-profitability', icon: BarChart3, permission: 'reports.view' },
      { name: 'Receita por Cliente', href: '/reports/revenue-by-customer', icon: BarChart3, permission: 'reports.view' },
      { name: 'Custo Operacional', href: '/reports/operational-cost', icon: BarChart3, permission: 'reports.view' },
      { name: 'Margem da Frota', href: '/reports/fleet-margin', icon: BarChart3, permission: 'reports.view' },
      { name: 'Por Centro de Custo', href: '/reports/by-cost-center', icon: BarChart3, permission: 'reports.view' },
    ],
  },
  {
    title: 'Configuração',
    icon: Settings,
    items: [
      { name: 'Filiais', href: '/branches', icon: MapPin, permission: 'branches.view' },
      { name: 'Fornecedores', href: '/suppliers', icon: Building2, permission: 'suppliers.view' },
      { name: 'Clientes', href: '/customers', icon: UserCircle, permission: 'customers.view' },
      { name: 'Centros de Custo', href: '/cost-centers', icon: LayoutGrid, permission: 'cost-centers.view' },
      { name: 'Marcas de Veículos', href: '/vehicle-brands', icon: Truck, permission: 'vehicle-brands.view' },
      { name: 'Modelos de Veículos', href: '/vehicle-models', icon: Truck, permission: 'vehicle-models.view' },
      { name: 'Cargos', href: '/roles', icon: ShieldCheck, permission: 'roles.view' },
      { name: 'Unidades de Medida', href: '/units-of-measurement', icon: Ruler, permission: 'units.view' },
      { name: 'Auditoria', href: '/audit', icon: ShieldCheck, permission: 'audit.view' },
    ],
  },
];

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
  /** No desktop: sidebar está expandida? (para mostrar botão de fechar) */
  isDesktopOpen?: boolean;
  /** No desktop: callback ao clicar em "fechar" */
  onDesktopClose?: () => void;
}

export function Sidebar({
  isMobile = false,
  onClose,
  isDesktopOpen = true,
  onDesktopClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { selectedBranchId, setSelectedBranchId, isAdmin } = useBranch();
  const { hasPermission, isAdmin: isAdminRole } = usePermissions();
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(['Financeiro']) // Abrir "Financeiro" por padrão
  );

  // Filtrar itens diretos com base nas permissões do usuário
  const filteredDirectItems = useMemo(() => {
    return directNavigationItems.filter((item) => {
      if (!item.permission) return true;
      if (isAdminRole) return true;
      return hasPermission(item.permission);
    });
  }, [hasPermission, isAdminRole]);

  // Filtrar grupos e itens com base nas permissões do usuário
  const filteredNavigationGroups = useMemo(() => {
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          // Se não tem permissão definida, todos podem ver
          if (!item.permission) return true;
          // Admin tem acesso total
          if (isAdminRole) return true;
          // Verificar permissão específica
          return hasPermission(item.permission);
        }),
      }))
      .filter((group) => group.items.length > 0); // Remover grupos vazios
  }, [hasPermission, isAdminRole]);

  // Buscar filiais (apenas para admin)
  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
    enabled: isAdmin,
  });

  const branches = branchesResponse?.data || [];


  const toggleGroup = (groupTitle: string) => {
    setOpenGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupTitle)) {
        newSet.delete(groupTitle);
      } else {
        newSet.add(groupTitle);
      }
      return newSet;
    });
  };

  // Auto-abrir grupo se algum item estiver ativo
  useEffect(() => {
    // Verificar se a página ativa está em um item direto (não precisa abrir grupo)
    const isDirectItemActive = filteredDirectItems.some(
      (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
    );
    
    if (isDirectItemActive) return;

    const activeGroup = filteredNavigationGroups.find((group) =>
      group.items.some(
        (item) =>
          pathname === item.href || pathname?.startsWith(item.href + '/')
      )
    );

    if (activeGroup) {
      setOpenGroups((prev) => {
        if (prev.has(activeGroup.title)) {
          return prev; // Já está aberto, não precisa atualizar
        }
        const newSet = new Set(prev);
        newSet.add(activeGroup.title);
        return newSet;
      });
    }
  }, [pathname, filteredNavigationGroups, filteredDirectItems]);

  const showDesktopClose =
    !isMobile && isDesktopOpen && typeof onDesktopClose === 'function';

  return (
    <div className="flex flex-col h-screen w-72 bg-background border-r border-border flex-shrink-0">
      {/* Logo, botão fechar e Seletor de Filial */}
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h1 className="text-lg font-semibold text-foreground truncate">
            ERP Transporte
          </h1>
          {/* Botão fechar mobile */}
          {isMobile && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 flex-shrink-0"
              title="Fechar menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          {/* Botão fechar desktop */}
          {showDesktopClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDesktopClose}
              className="h-8 w-8 flex-shrink-0"
              title="Fechar menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>
        {/* Seletor de Filial - Apenas para Admin */}
        {isAdmin && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Filial</label>
            <select
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value || null)}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas as filiais</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {/* Itens diretos (sem categoria) */}
        {filteredDirectItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={isMobile ? onClose : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}

        {/* Separador visual */}
        {filteredDirectItems.length > 0 && filteredNavigationGroups.length > 0 && (
          <div className="border-t border-border my-3" />
        )}

        {/* Grupos de navegação */}
        {filteredNavigationGroups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = openGroups.has(group.title);
          const hasActiveItem = group.items.some(
            (item) =>
              pathname === item.href || pathname?.startsWith(item.href + '/')
          );

          return (
            <div key={group.title} className="space-y-1">
              {/* Group Header - Clickable */}
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground uppercase tracking-wider transition-colors hover:bg-muted/50',
                  hasActiveItem && 'text-primary'
                )}
              >
                {GroupIcon && (
                  <GroupIcon className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="flex-1 text-left">{group.title}</span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
              </button>
              
              {/* Group Items - Collapsible */}
              {isOpen && (
                <div className="space-y-1 pl-4">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={isMobile ? onClose : undefined}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-border p-4">
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.role.name}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          onClick={logout}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-background transform transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar isMobile onClose={onClose} />
      </aside>
    </>
  );
}
