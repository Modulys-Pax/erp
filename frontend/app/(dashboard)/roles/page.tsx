'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleApi, Role } from '@/lib/api/role';
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
  ShieldCheck,
  CheckCircle,
  XCircle,
  UserCog,
} from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';

export default function RolesPage() {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.getAll(true), // Incluir inativos
  });

  // Cálculo das métricas
  const metrics = useMemo(() => {
    const total = roles.length;
    const active = roles.filter((r) => r.active).length;
    const inactive = roles.filter((r) => !r.active).length;
    return { total, active, inactive };
  }, [roles]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toastSuccess('Cargo excluído com sucesso');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao excluir cargo');
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Excluir o cargo "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Cargo',
      render: (role: Role) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{role.name}</p>
            {role.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                {role.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'permissions',
      header: 'Permissões',
      render: (role: Role) => {
        const permCount = role.permissions?.length || 0;
        const isAdmin = role.name === 'ADMIN';
        
        if (isAdmin) {
          return (
            <Badge className={ACTIVE_STATUS_COLORS.active}>
              Acesso total
            </Badge>
          );
        }
        
        return (
          <Badge variant="outline" className="bg-muted/50">
            {permCount} permissão(ões)
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (role: Role) => (
        <Badge
          className={role.active ? ACTIVE_STATUS_COLORS.active : ACTIVE_STATUS_COLORS.inactive}
        >
          {role.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (role: Role) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/roles/${role.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              {role.active && (
                <DropdownMenuItem
                  onClick={() => handleDelete(role.id, role.name)}
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
        title="Cargos"
        subtitle="Gerencie os cargos e permissões do sistema"
        actions={
          <Link href="/roles/new">
            <Button>Novo Cargo</Button>
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
            title="Total de Cargos"
            value={metrics.total}
            icon={UserCog}
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
        </div>
      )}

      {/* Lista */}
      <SectionCard
        title="Cargos"
        description={roles.length > 0 ? `${roles.length} cargo(s)` : undefined}
        actions={
          <ExportButton<Role>
            data={roles}
            filename="cargos"
            title="Lista de Cargos"
            columns={[
              { key: 'name', header: 'Nome' },
              { key: 'description', header: 'Descrição' },
              { key: 'active', header: 'Status', getValue: (r) => r.active ? 'Ativo' : 'Inativo' },
            ]}
          />
        }
      >
        {!isLoading && roles.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum cargo cadastrado"
            description="Cadastre cargos para definir permissões de acesso."
            action={{ label: 'Novo Cargo', href: '/roles/new' }}
          />
        ) : (
          <DataTable
            data={roles}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhum cargo cadastrado"
            rowClassName={(role: Role) =>
              !role.active ? 'opacity-60 bg-muted/30' : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
