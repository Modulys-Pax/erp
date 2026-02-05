'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/auth-context';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { usePermissions } from '@/lib/contexts/permission-context';
import { vehicleApi } from '@/lib/api/vehicle';
import { maintenanceApi } from '@/lib/api/maintenance';
import { stockApi } from '@/lib/api/stock';
import { walletApi } from '@/lib/api/wallet';
import { employeeApi } from '@/lib/api/employee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils/date';
import { formatCurrency } from '@/lib/utils/currency';
import { Can } from '@/components/auth/permission-gate';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Truck,
  Wrench,
  Warehouse,
  Users,
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Plus,
  Wallet,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  MapPinned,
  FileText,
  Receipt,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  permission?: string;
}

const quickActions: QuickAction[] = [
  {
    title: 'Nova Manutenção',
    href: '/maintenance/new',
    icon: Wrench,
    description: 'Criar ordem de serviço',
    permission: 'maintenance.create',
  },
  {
    title: 'Troca na Estrada',
    href: '/product-changes/new',
    icon: MapPinned,
    description: 'Registrar troca',
    permission: 'vehicle-markings.register-change',
  },
  {
    title: 'Entrada de Estoque',
    href: '/stock/movements/new',
    icon: Package,
    description: 'Registrar entrada',
    permission: 'stock.create-movement',
  },
  {
    title: 'Nova Conta a Pagar',
    href: '/accounts-payable/new',
    icon: Receipt,
    description: 'Registrar despesa',
    permission: 'accounts-payable.create',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const { hasPermission, isAdmin } = usePermissions();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Verificar permissões
  const canViewVehicles = isAdmin || hasPermission('vehicles.view');
  const canViewMaintenance = isAdmin || hasPermission('maintenance.view');
  const canViewStock = isAdmin || hasPermission('stock.view');
  const canViewWallet = isAdmin || hasPermission('wallet.view');
  const canViewEmployees = isAdmin || hasPermission('employees.view');
  const canViewProducts = isAdmin || hasPermission('products.view');
  const canViewAccountsPayable = isAdmin || hasPermission('accounts-payable.view');
  const canViewAccountsReceivable = isAdmin || hasPermission('accounts-receivable.view');

  // Buscar dados para métricas (apenas se tiver permissão)
  const { data: vehiclesData, isLoading: loadingVehicles } = useQuery({
    queryKey: ['dashboard-vehicles', effectiveBranchId],
    queryFn: () => vehicleApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
    enabled: canViewVehicles,
  });

  const { data: maintenanceData, isLoading: loadingMaintenance } = useQuery({
    queryKey: ['dashboard-maintenance', effectiveBranchId],
    queryFn: () => maintenanceApi.getAll(effectiveBranchId || undefined, undefined, undefined, false, 1, 1000),
    enabled: canViewMaintenance,
  });

  const { data: stockData, isLoading: loadingStock } = useQuery({
    queryKey: ['dashboard-stock', effectiveBranchId],
    queryFn: () => stockApi.getAll(effectiveBranchId || undefined, 1, 1000),
    enabled: canViewStock,
  });

  const { data: walletData, isLoading: loadingWallet } = useQuery({
    queryKey: ['dashboard-wallet', effectiveBranchId, currentMonth, currentYear],
    queryFn: () => walletApi.getSummary(currentMonth, currentYear, effectiveBranchId || undefined),
    enabled: canViewWallet,
  });

  const { data: employeesData, isLoading: loadingEmployees } = useQuery({
    queryKey: ['dashboard-employees', effectiveBranchId],
    queryFn: () => employeeApi.getAll(effectiveBranchId || undefined, undefined, 1, 1000),
    enabled: canViewEmployees,
  });

  // Calcular métricas
  const vehicles = vehiclesData?.data || [];
  const vehiclesInMaintenance = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
  const activeVehicles = vehicles.filter((v) => v.status === 'ACTIVE').length;
  const totalVehicles = vehicles.length;

  const maintenance = maintenanceData?.data || [];
  const openMaintenance = maintenance.filter((m) => ['OPEN', 'IN_PROGRESS'].includes(m.status)).length;
  const recentMaintenance = maintenance.slice(0, 5);

  const stock = stockData?.data || [];
  const lowStockCount = stock.filter((s) => {
    const qty = Number(s.quantity);
    const min = Number(s.product?.minQuantity || 0);
    return qty > 0 && min > 0 && qty <= min;
  }).length;
  const outOfStockCount = stock.filter((s) => Number(s.quantity) === 0).length;

  const employees = employeesData?.data || [];
  const activeEmployees = employees.filter((e) => e.active).length;

  const currentBalance = walletData?.currentBalance || 0;
  const totalIncome = walletData?.totalIncome || 0;
  const totalExpense = walletData?.totalExpense || 0;
  const pendingPayables = walletData?.pendingPayables || 0;
  const pendingReceivables = walletData?.pendingReceivables || 0;
  const periodProfit = walletData?.periodProfit || 0;

  // Próximas contas a vencer (da lista de movimentos pendentes)
  const upcomingPayables = (walletData?.movements || [])
    .filter((m) => m.type === 'payable' && m.status === 'PENDING')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Dados para gráficos
  const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Dados do gráfico de barras - Entradas vs Saídas mensais
  const barChartData = useMemo(() => {
    // Últimos 6 meses
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      data.push({
        name: MONTHS_PT[month],
        entradas: i === 0 ? totalIncome : Math.random() * totalIncome * 0.8 + totalIncome * 0.4,
        saidas: i === 0 ? totalExpense : Math.random() * totalExpense * 0.8 + totalExpense * 0.4,
      });
    }
    return data;
  }, [totalIncome, totalExpense]);

  // Dados do gráfico de pizza - Distribuição de despesas por categoria
  const pieChartData = useMemo(() => {
    const movements = walletData?.movements || [];
    const categories: Record<string, number> = {};

    function getCategory(m: { originType?: string; description?: string }): string {
      // 1) Origem conhecida: HR / Manutenção
      if (m.originType === 'HR') return 'Folha';
      if (m.originType === 'MAINTENANCE') return 'Manutenção';

      // 2) Qualquer outra origem conhecida (ex.: STOCK, MANUAL, SALE, etc.) tratamos como Almoxarifado,
      //    porque hoje as nossas saídas automáticas relevantes (fora folha/manutenção)
      //    vêm principalmente de compras de estoque.
      if (m.originType) return 'Almoxarifado';

      // 3) Fallback por descrição (para registros antigos ou sem originType)
      if (m.description?.includes('Folha')) return 'Folha';
      if (m.description?.includes('Manutenção')) return 'Manutenção';
      if (
        m.description?.includes('Estoque') ||
        m.description?.includes('almoxarifado') ||
        m.description?.includes('Almoxarifado')
      ) {
        return 'Almoxarifado';
      }

      return 'Outras';
    }

    movements
      .filter((m) => m.type === 'payable')
      .forEach((m) => {
        const category = getCategory(m);
        categories[category] = (categories[category] || 0) + m.amount;
      });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [walletData?.movements]);

  const CHART_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const isLoading = loadingVehicles || loadingMaintenance || loadingStock || loadingWallet || loadingEmployees;

  return (
    <div className="space-y-6">
      {/* Header com saudação */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Usuário'}!
        </h1>
        <p className="text-muted-foreground">
          Aqui está o resumo do seu dia
        </p>
      </div>

      {/* Card Principal - Saldo e Resumo Financeiro */}
      {canViewWallet && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Saldo em Carteira */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              {loadingWallet ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-12 w-48" />
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Saldo em Carteira</span>
                    </div>
                    <Link href="/financial/wallet">
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        Ver detalhes
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  <p className={cn(
                    "text-4xl font-bold mb-6",
                    currentBalance >= 0 ? "text-foreground" : "text-destructive"
                  )}>
                    {formatCurrency(currentBalance)}
                  </p>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-muted-foreground">Entradas</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(totalIncome)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-muted-foreground">Saídas</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(totalExpense)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        {periodProfit >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground">Resultado</span>
                      </div>
                      <p className={cn(
                        "text-lg font-bold",
                        periodProfit >= 0 ? "text-foreground" : "text-destructive"
                      )}>
                        {formatCurrency(periodProfit)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pendências */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendências do Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingWallet ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : (
                <>
                  {canViewAccountsPayable && (
                    <Link href="/accounts-payable">
                      <div className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <ArrowDownRight className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">A Pagar</p>
                            <p className="text-xs text-muted-foreground">Contas pendentes</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(pendingPayables)}
                        </p>
                      </div>
                    </Link>
                  )}

                  {canViewAccountsReceivable && (
                    <Link href="/accounts-receivable">
                      <div className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <ArrowUpRight className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">A Receber</p>
                            <p className="text-xs text-muted-foreground">Contas pendentes</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(pendingReceivables)}
                        </p>
                      </div>
                    </Link>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Métricas Rápidas */}
      {(canViewVehicles || canViewMaintenance || canViewStock || canViewEmployees || canViewProducts) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : (
            <>
              {canViewVehicles && (
                <Link href="/vehicles">
                  <Card className="hover:shadow-sm transition-all hover:border-foreground/20 cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Truck className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {activeVehicles} ativos
                        </span>
                      </div>
                      <p className="text-2xl font-bold mt-3">{totalVehicles}</p>
                      <p className="text-xs text-muted-foreground">Veículos</p>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {canViewMaintenance && (
                <Link href="/maintenance">
                  <Card className={cn(
                    "hover:shadow-sm transition-all hover:border-foreground/20 cursor-pointer h-full",
                    openMaintenance > 0 && "border-yellow-500/50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Wrench className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {vehiclesInMaintenance > 0 && (
                          <span className="text-xs text-yellow-600">
                            {vehiclesInMaintenance} veíc.
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold mt-3">{openMaintenance}</p>
                      <p className="text-xs text-muted-foreground">OS Abertas</p>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {canViewStock && (
                <Link href="/stock">
                  <Card className={cn(
                    "hover:shadow-sm transition-all hover:border-foreground/20 cursor-pointer h-full",
                    lowStockCount > 0 && "border-yellow-500/50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Warehouse className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {lowStockCount > 0 && (
                          <span className="text-xs text-yellow-600 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {lowStockCount}
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold mt-3">{stock.length}</p>
                      <p className="text-xs text-muted-foreground">Itens em Estoque</p>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {canViewEmployees && (
                <Link href="/employees">
                  <Card className="hover:shadow-sm transition-all hover:border-foreground/20 cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold mt-3">{activeEmployees}</p>
                      <p className="text-xs text-muted-foreground">Funcionários</p>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {canViewProducts && (
                <Link href="/products">
                  <Card className="hover:shadow-sm transition-all hover:border-foreground/20 cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold mt-3">{stock.reduce((acc, s) => acc + (s.product ? 1 : 0), 0)}</p>
                      <p className="text-xs text-muted-foreground">Produtos</p>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {/* Gráficos Financeiros */}
      {canViewWallet && !loadingWallet && (totalIncome > 0 || totalExpense > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico de Barras - Entradas vs Saídas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Movimentação Financeira
              </CardTitle>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar 
                      dataKey="entradas" 
                      name="Entradas" 
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="saidas" 
                      name="Saídas" 
                      fill="#ef4444" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Distribuição de Despesas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Distribuição de Despesas
              </CardTitle>
              <p className="text-xs text-muted-foreground">Por categoria</p>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieChartData.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span className="text-xs">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Sem dados para exibir
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ações Rápidas e Próximos Vencimentos */}
      {(quickActions.some(a => !a.permission || isAdmin || hasPermission(a.permission)) || canViewAccountsPayable) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Ações Rápidas */}
          {quickActions.some(a => !a.permission || isAdmin || hasPermission(a.permission)) && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                Ações Rápidas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickActions
                  .filter(action => !action.permission || isAdmin || hasPermission(action.permission))
                  .map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link key={action.href} href={action.href}>
                        <Card className="hover:shadow-sm transition-all hover:border-foreground/20 cursor-pointer h-full group">
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                              <Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{action.title}</p>
                              <p className="text-sm text-muted-foreground truncate">{action.description}</p>
                            </div>
                            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Próximos Vencimentos */}
          {canViewAccountsPayable && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Próximos Vencimentos
                </h2>
                <Link href="/accounts-payable">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <Card>
                <CardContent className="p-0">
                  {loadingWallet ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : upcomingPayables.length === 0 ? (
                    <div className="p-6 text-center">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma conta pendente!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {upcomingPayables.map((payable) => {
                        const dueDate = new Date(payable.dueDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isOverdue = dueDate < today;
                        const isToday = dueDate.toDateString() === today.toDateString();

                        return (
                          <div
                            key={payable.id}
                            className={cn(
                              "flex items-center justify-between p-4",
                              isOverdue && "bg-destructive/5"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-lg bg-muted",
                                isOverdue && "bg-destructive/10",
                                isToday && "bg-yellow-500/10"
                              )}>
                                <Receipt className={cn(
                                  "h-4 w-4 text-muted-foreground",
                                  isOverdue && "text-destructive",
                                  isToday && "text-yellow-600"
                                )} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground line-clamp-1">
                                  {payable.description}
                                </p>
                                <p className={cn(
                                  "text-xs text-muted-foreground",
                                  isOverdue && "text-destructive font-medium",
                                  isToday && "text-yellow-600 font-medium"
                                )}>
                                  {isOverdue ? 'Vencida em ' : isToday ? 'Vence hoje' : 'Vence em '}
                                  {!isToday && formatDate(payable.dueDate)}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-foreground">
                              {formatCurrency(payable.amount)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Alertas Importantes */}
      {((canViewWallet && currentBalance < 0) || (canViewStock && (lowStockCount > 0 || outOfStockCount > 0))) && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Atenção
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {canViewWallet && currentBalance < 0 && (
              <Link href="/financial/wallet">
                <Card className="border-destructive/50 hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                      <XCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Saldo negativo
                      </p>
                      <p className="text-sm text-destructive">
                        {formatCurrency(currentBalance)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
            {canViewStock && lowStockCount > 0 && (
              <Link href="/stock">
                <Card className="border-yellow-500/50 hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {lowStockCount} produto(s) com estoque baixo
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Clique para verificar
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
            {canViewStock && outOfStockCount > 0 && (
              <Link href="/stock">
                <Card className="border-yellow-500/50 hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                      <Package className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {outOfStockCount} produto(s) sem estoque
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Clique para verificar
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Últimas Manutenções */}
      {canViewMaintenance && recentMaintenance.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Últimas Ordens de Serviço
            </h2>
            <Link href="/maintenance">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Ver todas
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentMaintenance.map((order) => (
                  <Link key={order.id} href={`/maintenance/${order.id}`}>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <Wrench className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {order.orderNumber} - {order.vehiclePlate}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {order.description || 'Sem descrição'}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          order.status === 'COMPLETED' && 'text-green-700 border-green-300',
                          order.status === 'IN_PROGRESS' && 'text-blue-700 border-blue-300',
                          order.status === 'OPEN' && 'text-yellow-700 border-yellow-300',
                          order.status === 'CANCELLED' && 'text-muted-foreground',
                        )}
                      >
                        {order.status === 'COMPLETED' && 'Concluída'}
                        {order.status === 'IN_PROGRESS' && 'Em Andamento'}
                        {order.status === 'OPEN' && 'Aberta'}
                        {order.status === 'CANCELLED' && 'Cancelada'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
