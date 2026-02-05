'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { maintenanceApi, MaintenanceOrder } from '@/lib/api/maintenance';
import { formatCurrency } from '@/lib/utils/currency';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, PaginationMeta } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyMaintenance } from '@/components/ui/empty-state';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Input } from '@/components/ui/input';
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPE_COLORS,
} from '@/lib/constants/status.constants';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Eye,
  ClipboardList,
  Clock,
  PlayCircle,
  CheckCircle,
  DollarSign,
  Wrench,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { Can } from '@/components/auth/permission-gate';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/utils/date';

const DEBOUNCE_MS = 500;

export default function MaintenancePage() {
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const debouncedStatus = useDebounce(selectedStatus, DEBOUNCE_MS);
  const debouncedType = useDebounce(selectedType, DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
  }, [effectiveBranchId, debouncedStatus, debouncedType, startDate, endDate]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['maintenance', effectiveBranchId, debouncedStatus, startDate, endDate, page, limit],
    queryFn: () => {
      const branchId = effectiveBranchId || undefined;
      return maintenanceApi.getAll(
        branchId,
        undefined,
        debouncedStatus || undefined,
        false,
        page,
        limit,
        startDate || undefined,
        endDate || undefined
      );
    },
  });

  // Buscar todas as ordens para métricas
  const { data: allOrdersResponse } = useQuery({
    queryKey: ['maintenance-metrics', effectiveBranchId],
    queryFn: () => maintenanceApi.getAll(effectiveBranchId || undefined, undefined, undefined, false, 1, 1000),
  });

  // Calcular métricas
  const metrics = useMemo(() => {
    const orders = allOrdersResponse?.data || [];
    
    const openOrders = orders.filter(o => o.status === 'OPEN').length;
    const inProgressOrders = orders.filter(o => o.status === 'IN_PROGRESS').length;
    const completedOrders = orders.filter(o => o.status === 'COMPLETED');
    
    const totalCost = completedOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    
    const ordersWithTime = completedOrders.filter(o => o.totalTimeMinutes && o.totalTimeMinutes > 0);
    const averageTime = ordersWithTime.length > 0
      ? Math.round(ordersWithTime.reduce((sum, o) => sum + (o.totalTimeMinutes || 0), 0) / ordersWithTime.length)
      : 0;

    return {
      openOrders,
      inProgressOrders,
      totalCost,
      averageTime,
    };
  }, [allOrdersResponse]);

  const formatTime = (minutes: number) => {
    if (!minutes) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  // Filtrar por tipo no client-side (API não suporta filtro de tipo)
  const filteredData = useMemo(() => {
    if (!debouncedType || !response?.data) return response?.data || [];
    return response.data.filter(order => order.type === debouncedType);
  }, [response?.data, debouncedType]);

  const columns = [
    {
      key: 'orderNumber',
      header: 'Ordem',
      render: (order: MaintenanceOrder) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{order.orderNumber}</p>
            {order.vehiclePlate && (
              <p className="text-xs text-muted-foreground">
                Veículo: {order.vehiclePlate}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (order: MaintenanceOrder) => (
        <Badge
          variant="outline"
          className={`${MAINTENANCE_TYPE_COLORS[order.type]} flex items-center gap-1 w-fit border-0`}
        >
          {order.type === 'PREVENTIVE' ? (
            <Shield className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {MAINTENANCE_TYPE_LABELS[order.type]}
        </Badge>
      ),
    },
    {
      key: 'dates',
      header: 'Datas',
      render: (order: MaintenanceOrder) => {
        const completedEvent = order.timeline?.find((e) => e.event === 'COMPLETED' || e.event === 'CANCELLED');
        return (
          <div className="text-sm space-y-0.5">
            <p className="text-muted-foreground">
              Abertura: {formatDate(order.createdAt)}
            </p>
            {completedEvent && (
              <p className="text-muted-foreground">
                {completedEvent.event === 'COMPLETED' ? 'Conclusão' : 'Cancelamento'}: {formatDate(completedEvent.createdAt)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (order: MaintenanceOrder) => (
        <Badge variant="outline" className={`${MAINTENANCE_STATUS_COLORS[order.status]} flex items-center gap-1 w-fit`}>
          {order.status === 'OPEN' && <Clock className="h-3 w-3" />}
          {order.status === 'IN_PROGRESS' && <PlayCircle className="h-3 w-3" />}
          {order.status === 'PAUSED' && <Clock className="h-3 w-3" />}
          {order.status === 'COMPLETED' && <CheckCircle className="h-3 w-3" />}
          {order.status === 'CANCELLED' && <AlertTriangle className="h-3 w-3" />}
          {MAINTENANCE_STATUS_LABELS[order.status]}
        </Badge>
      ),
    },
    {
      key: 'cost',
      header: 'Custo',
      render: (order: MaintenanceOrder) => (
        <span className="text-sm font-medium text-foreground">
          {order.totalCost !== undefined && order.totalCost > 0
            ? formatCurrency(order.totalCost)
            : '-'}
        </span>
      ),
      className: 'text-right',
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (order: MaintenanceOrder) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Can permission="maintenance.view">
                <DropdownMenuItem asChild>
                  <Link href={`/maintenance/${order.id}`} className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalhes
                  </Link>
                </DropdownMenuItem>
              </Can>
              <Can permission="maintenance.update">
                {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                  <DropdownMenuItem asChild>
                    <Link href={`/maintenance/${order.id}`} className="flex items-center">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                )}
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const pagination: PaginationMeta | undefined = response
    ? {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordens de Manutenção"
        subtitle="Gerencie as ordens de manutenção da frota"
        actions={
          <Can permission="maintenance.create">
            <Link href="/maintenance/new">
              <Button>Nova Ordem</Button>
            </Link>
          </Can>
        }
      />

      {/* Métricas */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ordens Abertas"
            value={metrics.openOrders}
            icon={Clock}
            className="border-l-4 border-l-blue-500"
          />
          <StatCard
            title="Em Execução"
            value={metrics.inProgressOrders}
            icon={PlayCircle}
            className="border-l-4 border-l-yellow-500"
          />
          <StatCard
            title="Custo Total (Concluídas)"
            value={formatCurrency(metrics.totalCost)}
            icon={DollarSign}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Tempo Médio"
            value={formatTime(metrics.averageTime)}
            icon={Wrench}
            className="border-l-4 border-l-primary"
          />
        </div>
      )}

      {/* Filtros */}
      <SectionCard title="Filtros">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Data Inicial
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Data Final
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Status
            </label>
            <SearchableSelect
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'OPEN', label: 'Aberta' },
                { value: 'IN_PROGRESS', label: 'Em Execução' },
                { value: 'PAUSED', label: 'Pausada' },
                { value: 'COMPLETED', label: 'Concluída' },
                { value: 'CANCELLED', label: 'Cancelada' },
              ]}
              value={selectedStatus}
              onChange={(value) => {
                setSelectedStatus(value);
                setPage(1);
              }}
              placeholder="Todos os status"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Tipo
            </label>
            <SearchableSelect
              options={[
                { value: '', label: 'Todos os tipos' },
                { value: 'PREVENTIVE', label: 'Preventiva' },
                { value: 'CORRECTIVE', label: 'Corretiva' },
              ]}
              value={selectedType}
              onChange={(value) => {
                setSelectedType(value);
                setPage(1);
              }}
              placeholder="Todos os tipos"
            />
          </div>
        </div>
      </SectionCard>

      {isAdmin && !effectiveBranchId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Nenhuma filial selecionada. Mostrando todas as ordens de manutenção.
            Selecione uma filial na sidebar para filtrar.
          </p>
        </div>
      )}

      {/* Lista de Ordens */}
      <SectionCard
        title="Ordens de Manutenção"
        description={response?.total ? `${response.total} ordem(ns) encontrada(s)` : undefined}
        actions={
          <ExportButton<MaintenanceOrder>
            data={response?.data || []}
            filename="ordens-manutencao"
            title="Ordens de Manutenção"
            columns={[
              { key: 'orderNumber', header: 'Número' },
              { key: 'vehiclePlate', header: 'Veículo' },
              { key: 'type', header: 'Tipo', getValue: (o) => MAINTENANCE_TYPE_LABELS[o.type as keyof typeof MAINTENANCE_TYPE_LABELS] || o.type },
              { key: 'status', header: 'Status', getValue: (o) => MAINTENANCE_STATUS_LABELS[o.status as keyof typeof MAINTENANCE_STATUS_LABELS] || o.status },
              { key: 'serviceDate', header: 'Data', getValue: (o) => o.serviceDate ? formatDate(o.serviceDate) : '-' },
              { key: 'totalCost', header: 'Custo Total', getValue: (o) => formatCurrency(o.totalCost || 0) },
            ]}
          />
        }
      >
        {!isLoading && filteredData.length === 0 ? (
          <EmptyMaintenance />
        ) : (
          <DataTable
            data={filteredData}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhuma ordem de manutenção cadastrada"
            pagination={pagination}
            onPageChange={setPage}
            rowClassName={(order: MaintenanceOrder) =>
              order.status === 'IN_PROGRESS'
                ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-l-2 border-l-yellow-500'
                : order.status === 'OPEN'
                  ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-500'
                  : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
