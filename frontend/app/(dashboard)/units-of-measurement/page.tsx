'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitOfMeasurementApi, UnitOfMeasurement } from '@/lib/api/unit-of-measurement';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';
import Link from 'next/link';
import { ACTIVE_STATUS_COLORS } from '@/lib/constants/status.constants';
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
  Ruler,
  CheckCircle,
  XCircle,
  Weight,
  Droplets,
  Boxes,
  type LucideIcon,
} from 'lucide-react';

// Função para obter ícone baseado no código da unidade
const getUnitIcon = (code: string): LucideIcon => {
  const codeUpper = code.toUpperCase();
  const map: Record<string, LucideIcon> = {
    KG: Weight,
    L: Droplets,
    UN: Boxes,
    LITRO: Droplets,
    LITROS: Droplets,
  };
  return map[codeUpper] ?? Ruler;
};

export default function UnitsOfMeasurementPage() {
  const queryClient = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units-of-measurement'],
    queryFn: () => unitOfMeasurementApi.getAll(),
  });

  // Cálculo das métricas
  const metrics = useMemo(() => {
    const total = units.length;
    const active = units.filter((u) => u.active).length;
    const inactive = units.filter((u) => !u.active).length;
    return { total, active, inactive };
  }, [units]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unitOfMeasurementApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measurement'] });
      toastSuccess('Unidade de medida excluída com sucesso');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao excluir unidade de medida');
    },
  });

  const handleDelete = (id: string, code: string) => {
    if (confirm(`Excluir a unidade de medida "${code}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Unidade',
      render: (unit: UnitOfMeasurement) => {
        const UnitIcon = getUnitIcon(unit.code);
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UnitIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{unit.code}</p>
              {unit.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {unit.description}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'name',
      header: 'Nome',
      render: (unit: UnitOfMeasurement) => (
        <span className="text-foreground">{unit.name}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (unit: UnitOfMeasurement) => (
        <Badge
          className={unit.active ? ACTIVE_STATUS_COLORS.active : ACTIVE_STATUS_COLORS.inactive}
        >
          {unit.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (unit: UnitOfMeasurement) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/units-of-measurement/${unit.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              {unit.active && (
                <DropdownMenuItem
                  onClick={() => handleDelete(unit.id, unit.code)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades de Medida"
        subtitle="Gerencie as unidades de medida do sistema"
        actions={
          <Link href="/units-of-measurement/new">
            <Button>Nova Unidade de Medida</Button>
          </Link>
        }
      />

      {/* Métricas */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Total de Unidades"
            value={metrics.total}
            icon={Ruler}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Ativas"
            value={metrics.active}
            icon={CheckCircle}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Inativas"
            value={metrics.inactive}
            icon={XCircle}
            className="border-l-4 border-l-red-500"
          />
        </div>
      )}

      {/* Lista */}
      <SectionCard
        title="Unidades de Medida"
        description={units.length > 0 ? `${units.length} unidade(s)` : undefined}
      >
        {!isLoading && units.length === 0 ? (
          <EmptyState
            icon={Ruler}
            title="Nenhuma unidade cadastrada"
            description="Cadastre unidades de medida para os produtos."
            action={{ label: 'Nova Unidade', href: '/units-of-measurement/new' }}
          />
        ) : (
          <DataTable
            data={units}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhuma unidade de medida cadastrada"
            rowClassName={(unit: UnitOfMeasurement) =>
              !unit.active ? 'opacity-60 bg-muted/30' : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
