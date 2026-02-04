'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  vehicleApi,
  Vehicle,
  VEHICLE_PLATE_TYPES,
  type VehiclePlateType,
} from '@/lib/api/vehicle';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, PaginationMeta } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyVehicles } from '@/components/ui/empty-state';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';
import {
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_COLORS,
  ACTIVE_STATUS_COLORS,
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
  Trash2,
  FileText,
  Truck,
  Wrench,
  CircleOff,
  Gauge,
} from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';
import { Can } from '@/components/auth/permission-gate';
import { SearchableSelect } from '@/components/ui/searchable-select';

const PLATE_TYPE_LABELS: Record<VehiclePlateType, string> = {
  CAVALO: 'Cavalo',
  PRIMEIRA_CARRETA: 'Primeira Carreta',
  DOLLY: 'Dolly',
  SEGUNDA_CARRETA: 'Segunda Carreta',
};

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [plateTypeFilter, setPlateTypeFilter] = useState<string>('');
  const limit = 10;

  const { data: response, isLoading } = useQuery({
    queryKey: ['vehicles', effectiveBranchId, showDeleted, page, limit],
    queryFn: () => vehicleApi.getAll(effectiveBranchId || undefined, showDeleted, page, limit),
  });

  // Buscar todos os veículos para calcular métricas (sem paginação)
  const { data: allVehiclesResponse } = useQuery({
    queryKey: ['vehicles-metrics', effectiveBranchId],
    queryFn: () => vehicleApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehicleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-metrics'] });
      toastSuccess('Veículo excluído com sucesso');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao excluir veículo');
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este veículo?')) {
      deleteMutation.mutate(id);
    }
  };

  // Calcular métricas
  const metrics = useMemo(() => {
    const vehicles = allVehiclesResponse?.data || [];
    const activeVehicles = vehicles.filter(v => v.active);
    
    const totalActive = activeVehicles.filter(v => v.status === 'ACTIVE').length;
    const totalMaintenance = activeVehicles.filter(v => v.status === 'MAINTENANCE').length;
    const totalStopped = activeVehicles.filter(v => v.status === 'STOPPED').length;
    
    const vehiclesWithKm = activeVehicles.filter(v => v.currentKm && v.currentKm > 0);
    const averageKm = vehiclesWithKm.length > 0
      ? Math.round(vehiclesWithKm.reduce((sum, v) => sum + (v.currentKm || 0), 0) / vehiclesWithKm.length)
      : 0;

    return {
      totalActive,
      totalMaintenance,
      totalStopped,
      averageKm,
      total: activeVehicles.length,
    };
  }, [allVehiclesResponse]);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Filtrar veículos por tipo de placa (client-side)
  const filteredData = useMemo(() => {
    const data = response?.data || [];
    if (!plateTypeFilter) return data;
    return data.filter((v) =>
      v.plates?.some((p) => p.type === plateTypeFilter)
    );
  }, [response?.data, plateTypeFilter]);

  const columns = [
    {
      key: 'plate',
      header: 'Veículo',
      render: (vehicle: Vehicle) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {vehicle.plates?.length
                ? vehicle.plates.map((p) => p.plate).join(' / ')
                : vehicle.plate}
            </p>
            {(vehicle.brandName || vehicle.modelName) && (
              <p className="text-xs text-muted-foreground">
                {vehicle.brandName} {vehicle.modelName}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Detalhes',
      render: (vehicle: Vehicle) => (
        <div className="text-sm">
          {vehicle.year && (
            <p className="text-foreground">Ano: {vehicle.year}</p>
          )}
          {vehicle.currentKm !== undefined && vehicle.currentKm !== null && (
            <p className="text-muted-foreground flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              {formatNumber(vehicle.currentKm)} km
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (vehicle: Vehicle) => (
        <div className="flex flex-col gap-1.5 w-fit items-start">
          <Badge
            variant={vehicle.active ? 'default' : 'secondary'}
            className={vehicle.active ? ACTIVE_STATUS_COLORS.active : ACTIVE_STATUS_COLORS.inactive}
          >
            {vehicle.active ? 'Ativo' : 'Inativo'}
          </Badge>
          <Badge 
            variant="outline" 
            className={`${VEHICLE_STATUS_COLORS[vehicle.status]} flex items-center gap-1`}
          >
            {vehicle.status === 'ACTIVE' && <Truck className="h-3 w-3" />}
            {vehicle.status === 'MAINTENANCE' && <Wrench className="h-3 w-3" />}
            {vehicle.status === 'STOPPED' && <CircleOff className="h-3 w-3" />}
            {VEHICLE_STATUS_LABELS[vehicle.status]}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (vehicle: Vehicle) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Can permission="vehicles.update">
                <DropdownMenuItem asChild>
                  <Link href={`/vehicles/${vehicle.id}`} className="flex items-center">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
              </Can>
              <Can permission="vehicle-documents.view">
                <DropdownMenuItem asChild>
                  <Link href={`/vehicles/${vehicle.id}/documents`} className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Documentos
                  </Link>
                </DropdownMenuItem>
              </Can>
              <Can permission="vehicles.delete">
                {!vehicle.deletedAt && (
                  <DropdownMenuItem
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
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
        title="Veículos"
        subtitle="Gerencie os veículos da frota"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleted(!showDeleted);
                setPage(1);
              }}
            >
              {showDeleted ? 'Ocultar Excluídos' : 'Mostrar Excluídos'}
            </Button>
            <Can permission="vehicles.create">
              <Link href="/vehicles/new">
                <Button>Novo Veículo</Button>
              </Link>
            </Can>
          </>
        }
      />

      {/* Métricas */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Em Operação"
            value={metrics.totalActive}
            icon={Truck}
            className="border-l-4 border-l-blue-500"
          />
          <StatCard
            title="Em Manutenção"
            value={metrics.totalMaintenance}
            icon={Wrench}
            className="border-l-4 border-l-yellow-500"
          />
          <StatCard
            title="Parados"
            value={metrics.totalStopped}
            icon={CircleOff}
            className="border-l-4 border-l-muted"
          />
        </div>
      )}

      {/* Filtro por Tipo de Veículo */}
      <SectionCard title="Filtros">
        <div className="max-w-xs">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Tipo de Veículo
          </label>
          <SearchableSelect
            options={[
              { value: '', label: 'Todos os tipos' },
              ...VEHICLE_PLATE_TYPES.map((t) => ({
                value: t,
                label: PLATE_TYPE_LABELS[t],
              })),
            ]}
            value={plateTypeFilter}
            onChange={(v) => {
              setPlateTypeFilter(v);
              setPage(1);
            }}
            placeholder="Todos os tipos"
          />
        </div>
      </SectionCard>

      {/* Lista de Veículos */}
      <SectionCard
        title="Lista de Veículos"
        description={
          plateTypeFilter
            ? `${filteredData.length} veículo(s) com ${PLATE_TYPE_LABELS[plateTypeFilter as VehiclePlateType]}`
            : response?.total
              ? `${response.total} veículo(s) encontrado(s)`
              : undefined
        }
        actions={
          <ExportButton<Vehicle>
            data={filteredData}
            filename="veiculos"
            title="Lista de Veículos"
            columns={[
              { key: 'plates', header: 'Placa Cavalo', getValue: (v) => v.plates?.find((p) => p.type === 'CAVALO')?.plate || '' },
              { key: 'brandName', header: 'Marca', getValue: (v) => v.brandName || '' },
              { key: 'modelName', header: 'Modelo', getValue: (v) => v.modelName || '' },
              { key: 'year', header: 'Ano', getValue: (v) => v.year?.toString() || '' },
              { key: 'currentKm', header: 'KM Atual', getValue: (v) => v.currentKm?.toString() || '' },
              { key: 'status', header: 'Status', getValue: (v) => VEHICLE_STATUS_LABELS[v.status] || v.status },
              { key: 'active', header: 'Situação', getValue: (v) => v.active ? 'Ativo' : 'Inativo' },
            ]}
          />
        }
      >
        {!isLoading && filteredData.length === 0 ? (
          <EmptyVehicles />
        ) : (
          <DataTable
            data={filteredData}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhum veículo cadastrado"
            pagination={pagination}
            onPageChange={setPage}
            rowClassName={(vehicle: Vehicle) =>
              vehicle.status === 'MAINTENANCE'
                ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-l-2 border-l-yellow-500'
                : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
