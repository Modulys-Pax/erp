'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi, AuditLogFilter, AuditAction } from '@/lib/api/audit';
import { branchApi } from '@/lib/api/branch';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { AUDIT_ACTION_COLORS } from '@/lib/constants/status.constants';
import {
  ShieldCheck,
  PlusCircle,
  Pencil,
  Trash2,
  RotateCcw,
  LogIn,
  LogOut,
  Activity,
  Clock,
  User,
  FileText,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils/date';

const DEBOUNCE_MS = 500;

function getDefaultSearchFilter(): Omit<AuditLogFilter, 'page' | 'limit'> {
  return {
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  };
}

// Função para obter ícone da ação
const getActionIcon = (action: AuditAction) => {
  const iconMap: Record<AuditAction, typeof PlusCircle> = {
    [AuditAction.CREATE]: PlusCircle,
    [AuditAction.UPDATE]: Pencil,
    [AuditAction.DELETE]: Trash2,
    [AuditAction.RESTORE]: RotateCcw,
    [AuditAction.LOGIN]: LogIn,
    [AuditAction.LOGOUT]: LogOut,
  };
  return iconMap[action] || Activity;
};

export default function AuditPage() {
  const [searchFilter, setSearchFilter] = useState<Omit<AuditLogFilter, 'page' | 'limit'>>(
    getDefaultSearchFilter,
  );
  const [page, setPage] = useState(1);
  const limit = 50;

  const debouncedSearchFilter = useDebounce(searchFilter, DEBOUNCE_MS);

  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
  });

  const branches = branchesResponse?.data || [];

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: [
      'audit',
      'logs',
      debouncedSearchFilter.entityType,
      debouncedSearchFilter.entityId,
      debouncedSearchFilter.action,
      debouncedSearchFilter.userId,
      debouncedSearchFilter.branchId,
      debouncedSearchFilter.startDate,
      debouncedSearchFilter.endDate,
      page,
      limit,
    ],
    queryFn: () => auditApi.getLogs({ ...debouncedSearchFilter, page, limit }),
  });

  // Métricas dos logs atuais
  const metrics = useMemo(() => {
    const data = auditLogs?.data || [];
    const creates = data.filter((l) => l.action === AuditAction.CREATE).length;
    const updates = data.filter((l) => l.action === AuditAction.UPDATE).length;
    const deletes = data.filter((l) => l.action === AuditAction.DELETE).length;
    return { total: auditLogs?.total || 0, creates, updates, deletes };
  }, [auditLogs]);

  const getActionColor = (action: AuditAction) => {
    return AUDIT_ACTION_COLORS[action] ?? 'bg-muted text-muted-foreground';
  };

  const getActionLabel = (action: AuditAction) => {
    switch (action) {
      case AuditAction.CREATE:
        return 'Criar';
      case AuditAction.UPDATE:
        return 'Atualizar';
      case AuditAction.DELETE:
        return 'Excluir';
      case AuditAction.RESTORE:
        return 'Restaurar';
      case AuditAction.LOGIN:
        return 'Login';
      case AuditAction.LOGOUT:
        return 'Logout';
      default:
        return action;
    }
  };

  const handleFilterChange = (updates: Partial<Omit<AuditLogFilter, 'page' | 'limit'>>) => {
    setSearchFilter((prev) => ({ ...prev, ...updates }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchFilter(getDefaultSearchFilter());
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        subtitle="Logs de auditoria e rastreabilidade do sistema"
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
            title="Total de Registros"
            value={metrics.total.toLocaleString('pt-BR')}
            icon={Activity}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Criações"
            value={metrics.creates}
            icon={PlusCircle}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Atualizações"
            value={metrics.updates}
            icon={Pencil}
            className="border-l-4 border-l-blue-500"
          />
          <StatCard
            title="Exclusões"
            value={metrics.deletes}
            icon={Trash2}
            className="border-l-4 border-l-red-500"
          />
        </div>
      )}

      {/* Filtros */}
      <SectionCard title="Filtros">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Tipo de Entidade</Label>
            <Input
              placeholder="Ex: Product, Vehicle"
              value={searchFilter.entityType || ''}
              onChange={(e) =>
                handleFilterChange({ entityType: e.target.value || undefined })
              }
              className="rounded-xl"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Ação</Label>
            <SearchableSelect
              options={[
                { value: '', label: 'Todas' },
                { value: AuditAction.CREATE, label: 'Criar' },
                { value: AuditAction.UPDATE, label: 'Atualizar' },
                { value: AuditAction.DELETE, label: 'Excluir' },
                { value: AuditAction.RESTORE, label: 'Restaurar' },
                { value: AuditAction.LOGIN, label: 'Login' },
                { value: AuditAction.LOGOUT, label: 'Logout' },
              ]}
              value={searchFilter.action || ''}
              onChange={(value) =>
                handleFilterChange({ action: (value as AuditAction) || undefined })
              }
              placeholder="Todas"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Filial</Label>
            <SearchableSelect
              options={[
                { value: '', label: 'Todas' },
                ...toSelectOptions(
                  branches,
                  (b) => b.id,
                  (b) => b.name,
                ),
              ]}
              value={searchFilter.branchId || ''}
              onChange={(value) =>
                handleFilterChange({ branchId: value || undefined })
              }
              placeholder="Todas"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">ID do Usuário</Label>
            <Input
              placeholder="ID do usuário"
              value={searchFilter.userId || ''}
              onChange={(e) =>
                handleFilterChange({ userId: e.target.value || undefined })
              }
              className="rounded-xl"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Data Inicial</Label>
            <Input
              type="date"
              value={searchFilter.startDate || ''}
              onChange={(e) => handleFilterChange({ startDate: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Data Final</Label>
            <Input
              type="date"
              value={searchFilter.endDate || ''}
              onChange={(e) => handleFilterChange({ endDate: e.target.value })}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleClearFilters} variant="outline">
            Limpar Filtros
          </Button>
        </div>
      </SectionCard>

      {/* Logs */}
      <SectionCard
        title="Logs de Auditoria"
        description={
          auditLogs
            ? `Página ${auditLogs.page} de ${auditLogs.totalPages}`
            : undefined
        }
      >
        {!isLoading && auditLogs?.data.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum log encontrado"
            description="Ajuste os filtros para encontrar logs de auditoria."
          />
        ) : (
          <DataTable
            data={auditLogs?.data || []}
            columns={[
              {
                key: 'createdAt',
                header: 'Data/Hora',
                render: (log) => (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{formatDateTime(log.createdAt)}</span>
                  </div>
                ),
              },
              {
                key: 'entityType',
                header: 'Entidade',
                render: (log) => (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{log.entityType}</span>
                  </div>
                ),
              },
              {
                key: 'action',
                header: 'Ação',
                render: (log) => {
                  const ActionIcon = getActionIcon(log.action);
                  return (
                    <Badge className={getActionColor(log.action)}>
                      <ActionIcon className="h-3 w-3 mr-1" />
                      {getActionLabel(log.action)}
                    </Badge>
                  );
                },
              },
              {
                key: 'userName',
                header: 'Usuário',
                render: (log) => (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {log.userName || 'N/A'}
                      </p>
                      {log.userEmail && (
                        <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'description',
                header: 'Descrição',
                render: (log) => (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                    {log.description || '-'}
                  </span>
                ),
              },
            ]}
            isLoading={isLoading}
            emptyMessage="Nenhum log de auditoria encontrado"
            pagination={
              auditLogs
                ? {
                    page: auditLogs.page,
                    limit: auditLogs.limit,
                    total: auditLogs.total,
                    totalPages: auditLogs.totalPages,
                  }
                : undefined
            }
            onPageChange={setPage}
          />
        )}
      </SectionCard>
    </div>
  );
}
