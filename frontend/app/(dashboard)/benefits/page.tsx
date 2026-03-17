'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { benefitApi, Benefit } from '@/lib/api/benefit';
import { formatCurrency } from '@/lib/utils/currency';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, PaginationMeta } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';
import { ACTIVE_STATUS_COLORS } from '@/lib/constants/status.constants';
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
  Gift,
  DollarSign,
  CheckCircle,
  XCircle,
  CalendarCheck,
} from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';

export default function BenefitsPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['benefits'] });
  }, [effectiveBranchId, queryClient]);

  // Buscar dados para métricas
  const { data: allBenefits } = useQuery({
    queryKey: ['benefits-metrics', effectiveBranchId],
    queryFn: () => benefitApi.getAll(effectiveBranchId || undefined, true, 1, 1000),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['benefits', effectiveBranchId, page, limit],
    queryFn: () => benefitApi.getAll(effectiveBranchId || undefined, true, page, limit),
  });

  // Cálculo das métricas
  const metrics = useMemo(() => {
    const benefits = allBenefits?.data || [];
    const total = benefits.length;
    const active = benefits.filter((b) => b.active).length;
    const inactive = benefits.filter((b) => !b.active).length;
    const avgDailyCost =
      benefits.length > 0
        ? benefits.reduce((acc, b) => acc + b.dailyCost, 0) / benefits.length
        : 0;
    return { total, active, inactive, avgDailyCost };
  }, [allBenefits]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => benefitApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      queryClient.invalidateQueries({ queryKey: ['benefits-metrics'] });
      toastSuccess('Benefício excluído com sucesso');
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        toastErrorFromException(
          new Error('Este benefício está sendo usado por funcionários.'),
          'Não é possível excluir'
        );
      } else {
        toastErrorFromException(error, 'Erro ao excluir benefício');
      }
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Excluir este benefício?\n\nBenefícios em uso não podem ser excluídos.')) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Benefício',
      render: (benefit: Benefit) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{benefit.name}</p>
            {benefit.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                {benefit.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'dailyCost',
      header: 'Custo Diário',
      render: (benefit: Benefit) => (
        <span className="font-semibold text-foreground">{formatCurrency(benefit.dailyCost)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'employeeValue',
      header: 'Valor Funcionário',
      render: (benefit: Benefit) => (
        <span className="text-foreground">{formatCurrency(benefit.employeeValue)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'includeWeekends',
      header: 'Fins de Semana',
      render: (benefit: Benefit) => (
        <Badge
          className={
            benefit.includeWeekends
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }
        >
          {benefit.includeWeekends ? 'Sim' : 'Não'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (benefit: Benefit) => (
        <Badge
          className={benefit.active ? ACTIVE_STATUS_COLORS.active : ACTIVE_STATUS_COLORS.inactive}
        >
          {benefit.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (benefit: Benefit) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/benefits/${benefit.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              {!benefit.deletedAt && (
                <DropdownMenuItem
                  onClick={() => handleDelete(benefit.id)}
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
        title="Catálogo de Benefícios"
        subtitle="Gerencie os benefícios disponíveis para funcionários"
        actions={
          <Link href="/benefits/new">
            <Button>Novo Benefício</Button>
          </Link>
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
            title="Total de Benefícios"
            value={metrics.total}
            icon={Gift}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Ativos"
            value={metrics.active}
            icon={CheckCircle}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Inativos"
            value={metrics.inactive}
            icon={XCircle}
            className="border-l-4 border-l-red-500"
          />
          <StatCard
            title="Custo Diário Médio"
            value={formatCurrency(metrics.avgDailyCost)}
            icon={DollarSign}
            className="border-l-4 border-l-blue-500"
          />
        </div>
      )}

      {/* Lista */}
      <SectionCard
        title="Benefícios"
        description={response?.total ? `${response.total} benefício(s)` : undefined}
        actions={
          <ExportButton<Benefit>
            data={response?.data || []}
            filename="beneficios"
            title="Lista de Benefícios"
            columns={[
              { key: 'name', header: 'Nome' },
              { key: 'value', header: 'Valor', getValue: (b) => formatCurrency(b.value) },
              { key: 'frequencyDays', header: 'Frequência', getValue: (b) => `${b.frequencyDays} dias` },
              { key: 'active', header: 'Status', getValue: (b) => b.active ? 'Ativo' : 'Inativo' },
            ]}
          />
        }
      >
        {!isLoading && response?.data.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="Nenhum benefício cadastrado"
            description="Cadastre benefícios para associá-los aos funcionários."
            action={{ label: 'Novo Benefício', href: '/benefits/new' }}
          />
        ) : (
          <DataTable
            data={response?.data || []}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhum benefício cadastrado"
            pagination={pagination}
            onPageChange={setPage}
            rowClassName={(benefit: Benefit) =>
              !benefit.active ? 'opacity-60 bg-muted/30' : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
