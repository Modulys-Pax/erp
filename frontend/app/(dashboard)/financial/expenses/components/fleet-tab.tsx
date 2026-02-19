'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vehicleApi, VehicleCostDetail } from '@/lib/api/vehicle';
import { accountPayableApi } from '@/lib/api/account-payable';
import { formatCurrency } from '@/lib/utils/currency';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate } from '@/lib/utils/date';
import {
  ACCOUNT_PAYABLE_STATUS_LABELS,
  ACCOUNT_PAYABLE_STATUS_COLORS,
  type AccountPayableStatus,
} from '@/lib/constants/status.constants';
import {
  DollarSign,
  Truck,
  Wrench,
  Package,
  Hammer,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';

export function FleetExpensesTab() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const limit = 10;

  const filterBranchId = effectiveBranchId || undefined;

  const { data: costsData, isLoading } = useQuery({
    queryKey: ['vehicle-costs', filterBranchId, startDate, endDate, currentPage],
    queryFn: () =>
      vehicleApi.getCosts(
        filterBranchId,
        startDate || undefined,
        endDate || undefined,
        currentPage,
        limit,
      ),
  });

  // Buscar contas a pagar de manutenção (originType = MAINTENANCE)
  const { data: maintenancePayables, isLoading: isLoadingPayables } = useQuery({
    queryKey: ['accounts-payable-maintenance', filterBranchId, startDate, endDate],
    queryFn: () =>
      accountPayableApi.getPayableSummary(
        filterBranchId,
        undefined, // status
        startDate || undefined,
        endDate || undefined,
        1,
        100,
        'MAINTENANCE',
      ),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveBranchId, startDate, endDate]);

  const getStatusBadge = (status: AccountPayableStatus) => {
    return (
      <Badge variant="outline" className={ACCOUNT_PAYABLE_STATUS_COLORS[status]}>
        {status === 'PENDING' && <Clock className="mr-1 h-3 w-3" />}
        {status === 'OVERDUE' && <Clock className="mr-1 h-3 w-3" />}
        {status === 'PAID' && <CheckCircle className="mr-1 h-3 w-3" />}
        {ACCOUNT_PAYABLE_STATUS_LABELS[status]}
      </Badge>
    );
  };


  const formatNumber = (value: number | undefined | null) => {
    const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR').format(n);
  };

  // Identificar veículos com custo alto (acima da média)
  const averageCost = costsData?.summary.averageCostPerVehicle || 0;
  const isHighCost = (cost: number) => averageCost > 0 && cost > averageCost * 1.5;

  return (
    <div className="space-y-6">
      {/* Filtros de Período */}
      <SectionCard title="Filtros">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Data Inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Data Final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </SectionCard>

      {/* Métricas Principais */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : costsData ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total de Veículos"
              value={formatNumber(costsData.summary.totalVehicles)}
              icon={Truck}
              className="border-l-4 border-l-primary"
            />
            <StatCard
              title="Custo Total"
              value={formatCurrency(costsData.summary.totalMaintenanceCost)}
              icon={DollarSign}
              className="border-l-4 border-l-red-500"
            />
            <StatCard
              title="Total de Ordens"
              value={formatNumber(costsData.summary.totalMaintenanceOrders)}
              icon={Wrench}
              className="border-l-4 border-l-blue-500"
            />
            <StatCard
              title="Custo Médio/Veículo"
              value={formatCurrency(costsData.summary.averageCostPerVehicle)}
              icon={TrendingUp}
              className="border-l-4 border-l-green-500"
            />
          </div>

          {/* Breakdown de Custos */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Custo de Materiais</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(costsData.summary.totalMaterialsCost)}
              </p>
              {costsData.summary.totalMaintenanceCost > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((costsData.summary.totalMaterialsCost / costsData.summary.totalMaintenanceCost) * 100)}% do custo total
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Hammer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Custo de Serviços</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(costsData.summary.totalServicesCost)}
              </p>
              {costsData.summary.totalMaintenanceCost > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((costsData.summary.totalServicesCost / costsData.summary.totalMaintenanceCost) * 100)}% do custo total
                </p>
              )}
            </div>
          </div>

          {/* Lista de Veículos */}
          <SectionCard
            title="Veículos e Custos de Manutenção"
            description={costsData.vehicles.total > 0 ? `${costsData.vehicles.total} veículo(s) com manutenções` : undefined}
            actions={
              <ExportButton<VehicleCostDetail>
                data={costsData.vehicles.data}
                filename="gastos-veiculos"
                title="Gastos com Veículos"
                columns={[
                  { key: 'plate', header: 'Placa' },
                  { key: 'model', header: 'Modelo' },
                  { key: 'totalMaintenanceOrders', header: 'Qtd Ordens' },
                  { key: 'totalMaterialsCost', header: 'Materiais', getValue: (v) => formatCurrency(v.totalMaterialsCost ?? 0) },
                  { key: 'totalServicesCost', header: 'Serviços', getValue: (v) => formatCurrency(v.totalServicesCost ?? 0) },
                  { key: 'totalMaintenanceCost', header: 'Total', getValue: (v) => formatCurrency(v.totalMaintenanceCost ?? 0) },
                ]}
              />
            }
          >
            {costsData.vehicles.data.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="Nenhum custo registrado"
                description="Os custos aparecerão aqui conforme ordens de manutenção forem concluídas."
              />
            ) : (
              <DataTable
                data={costsData.vehicles.data}
                pagination={
                  costsData.vehicles.totalPages > 1
                    ? {
                        page: costsData.vehicles.page,
                        limit: costsData.vehicles.limit,
                        total: costsData.vehicles.total,
                        totalPages: costsData.vehicles.totalPages,
                      }
                    : undefined
                }
                onPageChange={setCurrentPage}
                rowClassName={(vehicle: VehicleCostDetail) =>
                  isHighCost(vehicle.totalMaintenanceCost)
                    ? 'bg-red-50/50 dark:bg-red-900/10 border-l-2 border-l-red-500'
                    : undefined
                }
                columns={[
                  {
                    key: 'plate',
                    header: 'Veículo',
                    render: (vehicle) => (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Truck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <Link
                            href={`/vehicles/${vehicle.vehicleId}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {vehicle.plate}
                          </Link>
                          {vehicle.model && (
                            <p className="text-xs text-muted-foreground">{vehicle.model}</p>
                          )}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'totalMaintenanceOrders',
                    header: 'Ordens',
                    render: (vehicle) => formatNumber(vehicle.totalMaintenanceOrders),
                    className: 'text-center',
                  },
                  {
                    key: 'totalMaterialsCost',
                    header: 'Materiais',
                    render: (vehicle) => formatCurrency(vehicle.totalMaterialsCost ?? 0),
                    className: 'text-right',
                  },
                  {
                    key: 'totalServicesCost',
                    header: 'Serviços',
                    render: (vehicle) => formatCurrency(vehicle.totalServicesCost ?? 0),
                    className: 'text-right',
                  },
                  {
                    key: 'totalMaintenanceCost',
                    header: 'Custo Total',
                    render: (vehicle) => (
                      <div className="text-right">
                        <span className={`font-bold ${isHighCost(vehicle.totalMaintenanceCost) ? 'text-red-600' : ''}`}>
                          {formatCurrency(vehicle.totalMaintenanceCost ?? 0)}
                        </span>
                        {isHighCost(vehicle.totalMaintenanceCost) && (
                          <p className="text-xs text-red-500">Acima da média</p>
                        )}
                      </div>
                    ),
                    className: 'text-right',
                  },
                ]}
                isLoading={isLoading}
                emptyMessage="Nenhum veículo encontrado"
              />
            )}
          </SectionCard>

          {/* Contas a Pagar de Manutenção */}
          {maintenancePayables && maintenancePayables.accountsPayable.data.length > 0 && (
            <SectionCard
              title="Contas a Pagar - Manutenção"
              description={`${maintenancePayables.accountsPayable.total} conta(s) geradas automaticamente`}
            >
              <DataTable
                data={maintenancePayables.accountsPayable.data}
                isLoading={isLoadingPayables}
                emptyMessage="Nenhuma conta a pagar"
                rowClassName={(account: { status: string }) =>
                  account.status === 'PENDING'
                    ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-l-2 border-l-yellow-500'
                    : account.status === 'OVERDUE'
                      ? 'bg-red-50/50 dark:bg-red-900/10 border-l-2 border-l-red-500'
                      : account.status === 'PAID'
                        ? 'bg-green-50/50 dark:bg-green-900/10 border-l-2 border-l-green-500'
                        : account.status === 'CANCELLED'
                          ? 'bg-red-50/50 dark:bg-red-900/10 border-l-2 border-l-red-500'
                          : undefined
                }
                columns={[
                  {
                    key: 'description',
                    header: 'Descrição',
                    render: (account) => (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                          <Receipt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <Link
                            href={`/accounts-payable/${account.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {account.description}
                          </Link>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'dueDate',
                    header: 'Vencimento',
                    render: (account) => (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(account.dueDate)}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (account) => getStatusBadge(account.status as AccountPayableStatus),
                  },
                  {
                    key: 'amount',
                    header: 'Valor',
                    render: (account) => (
                      <span className="font-semibold">{formatCurrency(account.amount)}</span>
                    ),
                    className: 'text-right',
                  },
                ]}
              />
            </SectionCard>
          )}
        </>
      ) : (
        <EmptyState
          icon={DollarSign}
          title="Nenhum dado disponível"
          description="Selecione uma filial para ver os custos de manutenção."
        />
      )}
    </div>
  );
}
