'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchApi, Branch } from '@/lib/api/branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, PaginationMeta } from '@/components/ui/data-table';
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
  MapPin,
  Building2,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
} from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Buscar dados para métricas
  const { data: allBranches } = useQuery({
    queryKey: ['branches-metrics', showDeleted],
    queryFn: () => branchApi.getAll(showDeleted, 1, 1000),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['branches', showDeleted, page, limit],
    queryFn: () => branchApi.getAll(showDeleted, page, limit),
  });

  // Cálculo das métricas
  const metrics = useMemo(() => {
    const branches = allBranches?.data || [];
    const total = branches.length;
    const active = branches.filter((b) => b.active).length;
    const inactive = branches.filter((b) => !b.active).length;
    const states = new Set(branches.map((b) => b.state).filter(Boolean)).size;
    return { total, active, inactive, states };
  }, [allBranches]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branches-metrics'] });
      toastSuccess('Filial excluída com sucesso');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao excluir filial');
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Excluir esta filial?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Filial',
      render: (branch: Branch) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{branch.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contato',
      render: (branch: Branch) => (
        <div className="space-y-1 text-sm">
          {branch.email && (
            <div className="flex items-center gap-2 text-foreground">
              <Mail className="h-3 w-3 text-muted-foreground" />
              {branch.email}
            </div>
          )}
          {branch.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              {branch.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Localização',
      render: (branch: Branch) => (
        <div className="space-y-1 text-sm">
          {branch.city && branch.state && (
            <div className="flex items-center gap-2 text-foreground">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {branch.city}, {branch.state}
            </div>
          )}
          {branch.address && (
            <p className="text-muted-foreground truncate max-w-[200px] pl-5">
              {branch.address}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (branch: Branch) => (
        <Badge
          className={branch.active ? ACTIVE_STATUS_COLORS.active : ACTIVE_STATUS_COLORS.inactive}
        >
          {branch.active ? 'Ativa' : 'Inativa'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (branch: Branch) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/branches/${branch.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              {!branch.deletedAt && (
                <DropdownMenuItem
                  onClick={() => handleDelete(branch.id)}
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
        title="Filiais"
        subtitle="Gerencie as filiais do sistema"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleted(!showDeleted);
                setPage(1);
              }}
            >
              {showDeleted ? 'Ocultar Excluídas' : 'Mostrar Excluídas'}
            </Button>
            <Link href="/branches/new">
              <Button>Nova Filial</Button>
            </Link>
          </div>
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
            title="Total de Filiais"
            value={metrics.total}
            icon={Building2}
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
          <StatCard
            title="Estados"
            value={metrics.states}
            icon={MapPin}
            className="border-l-4 border-l-blue-500"
          />
        </div>
      )}

      {/* Lista */}
      <SectionCard
        title="Filiais"
        description={response?.total ? `${response.total} filial(is)` : undefined}
        actions={
          <ExportButton<Branch>
            data={response?.data || []}
            filename="filiais"
            title="Lista de Filiais"
            columns={[
              { key: 'name', header: 'Nome' },
              { key: 'city', header: 'Cidade' },
              { key: 'state', header: 'Estado' },
              { key: 'email', header: 'Email' },
              { key: 'phone', header: 'Telefone' },
              { key: 'active', header: 'Status', getValue: (b) => b.active ? 'Ativa' : 'Inativa' },
            ]}
          />
        }
      >
        {!isLoading && response?.data.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma filial cadastrada"
            description="Cadastre filiais para organizar o sistema."
            action={{ label: 'Nova Filial', href: '/branches/new' }}
          />
        ) : (
          <DataTable
            data={response?.data || []}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhuma filial cadastrada"
            pagination={pagination}
            onPageChange={setPage}
            rowClassName={(branch: Branch) =>
              !branch.active ? 'opacity-60 bg-muted/30' : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
