'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vacationApi, Vacation, VacationStatus } from '@/lib/api/vacation';
import { employeeApi } from '@/lib/api/employee';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastErrorFromException, toastError } from '@/lib/utils';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import {
  VACATION_STATUS_LABELS,
  VACATION_STATUS_COLORS,
  type VacationStatus as VacationStatusType,
} from '@/lib/constants/status.constants';
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
  CalendarDays,
  CheckCircle,
  Clock,
  PlayCircle,
  XCircle,
  Users,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import { formatCurrency } from '@/lib/utils/currency';
import { ExportButton } from '@/components/ui/export-button';

export default function VacationsPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const { data: employees } = useQuery({
    queryKey: ['employees', effectiveBranchId],
    queryFn: () => employeeApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
  });

  const { data: vacations = [], isLoading } = useQuery({
    queryKey: ['vacations', effectiveBranchId, selectedEmployee, selectedStatus],
    queryFn: () =>
      vacationApi.getAll(
        effectiveBranchId || undefined,
        selectedEmployee || undefined,
        selectedStatus || undefined,
      ),
  });

  // Métricas
  const metrics = useMemo(() => {
    const planned = vacations.filter((v) => v.status === VacationStatus.PLANNED).length;
    const approved = vacations.filter((v) => v.status === VacationStatus.APPROVED).length;
    const inProgress = vacations.filter((v) => v.status === VacationStatus.IN_PROGRESS).length;
    const completed = vacations.filter((v) => v.status === VacationStatus.COMPLETED).length;
    return { total: vacations.length, planned, approved, inProgress, completed };
  }, [vacations]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vacationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      toastSuccess('Férias excluídas');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao excluir férias'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: VacationStatus } }) =>
      vacationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      toastSuccess('Status atualizado');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao atualizar status'),
  });

  const handleDelete = (id: string) => {
    if (confirm('Excluir estas férias?')) deleteMutation.mutate(id);
  };

  const handleStatusChange = (id: string, status: VacationStatus) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const getStatusIcon = (status: VacationStatus) => {
    const icons = {
      [VacationStatus.PLANNED]: Clock,
      [VacationStatus.APPROVED]: CheckCircle,
      [VacationStatus.IN_PROGRESS]: PlayCircle,
      [VacationStatus.COMPLETED]: CheckCircle,
      [VacationStatus.CANCELLED]: XCircle,
    };
    return icons[status] || Clock;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Férias"
        subtitle="Gerencie as férias dos funcionários"
        actions={
          <Link href="/vacations/new">
            <Button>Nova Férias</Button>
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
            title="Total"
            value={metrics.total}
            icon={CalendarDays}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Planejadas"
            value={metrics.planned}
            icon={Clock}
            className="border-l-4 border-l-blue-500"
          />
          <StatCard
            title="Aprovadas"
            value={metrics.approved}
            icon={CheckCircle}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Em Andamento"
            value={metrics.inProgress}
            icon={PlayCircle}
            className="border-l-4 border-l-yellow-500"
          />
        </div>
      )}

      {/* Filtros */}
      <SectionCard title="Filtros">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Funcionário</Label>
            <SearchableSelect
              options={[
                { value: '', label: 'Todos' },
                ...toSelectOptions(employees?.data || [], (e) => e.id, (e) => e.name),
              ]}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="Todos os funcionários"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Status</Label>
            <SearchableSelect
              options={[
                { value: '', label: 'Todos' },
                { value: 'PLANNED', label: 'Planejada' },
                { value: 'APPROVED', label: 'Aprovada' },
                { value: 'IN_PROGRESS', label: 'Em Andamento' },
                { value: 'COMPLETED', label: 'Concluída' },
                { value: 'CANCELLED', label: 'Cancelada' },
              ]}
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="Todos os status"
            />
          </div>
        </div>
      </SectionCard>

      {/* Lista */}
      <SectionCard
        title="Férias Cadastradas"
        description={vacations.length > 0 ? `${vacations.length} registro(s)` : undefined}
        actions={
          <ExportButton
            data={vacations}
            filename="ferias"
            title="Lista de Férias"
            columns={[
              { key: 'employeeName', header: 'Funcionário' },
              { key: 'startDate', header: 'Início', getValue: (v) => formatDate(v.startDate) },
              { key: 'endDate', header: 'Término', getValue: (v) => formatDate(v.endDate) },
              { key: 'days', header: 'Dias' },
              { key: 'netTotal', header: 'Valor Líquido', getValue: (v) => v.netTotal ? formatCurrency(v.netTotal) : '-' },
              { key: 'status', header: 'Status', getValue: (v) => VACATION_STATUS_LABELS[v.status as VacationStatusType] },
            ]}
          />
        }
      >
        {!isLoading && vacations.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhuma férias cadastrada"
            description="Cadastre férias para os funcionários."
            action={{ label: 'Nova Férias', href: '/vacations/new' }}
          />
        ) : (
          <DataTable
            data={vacations}
            isLoading={isLoading}
            emptyMessage="Nenhuma férias encontrada"
            columns={[
              {
                key: 'employee',
                header: 'Funcionário',
                render: (vacation) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{vacation.employeeName}</span>
                  </div>
                ),
              },
              {
                key: 'period',
                header: 'Período',
                render: (vacation) => (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}
                    </span>
                  </div>
                ),
              },
              {
                key: 'days',
                header: 'Dias',
                render: (vacation) => (
                  <span className="font-semibold text-foreground">{vacation.days} dias</span>
                ),
              },
              {
                key: 'netTotal',
                header: 'Valor Líquido',
                render: (vacation) => (
                  <span className="font-semibold text-green-600">
                    {vacation.netTotal ? formatCurrency(vacation.netTotal) : '-'}
                  </span>
                ),
                className: 'text-right',
              },
              {
                key: 'status',
                header: 'Status',
                render: (vacation) => {
                  const StatusIcon = getStatusIcon(vacation.status);
                  return (
                    <Badge className={VACATION_STATUS_COLORS[vacation.status as VacationStatusType]}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {VACATION_STATUS_LABELS[vacation.status as VacationStatusType]}
                    </Badge>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Ações',
                className: 'text-right',
                render: (vacation) => (
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/vacations/${vacation.id}`} className="flex items-center">
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        {vacation.status === 'PLANNED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(vacation.id, VacationStatus.APPROVED)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprovar
                          </DropdownMenuItem>
                        )}
                        {vacation.status === 'APPROVED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(vacation.id, VacationStatus.IN_PROGRESS)}
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Iniciar
                          </DropdownMenuItem>
                        )}
                        {vacation.status === 'IN_PROGRESS' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(vacation.id, VacationStatus.COMPLETED)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Concluir
                          </DropdownMenuItem>
                        )}
                        {!['COMPLETED', 'CANCELLED'].includes(vacation.status) && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(vacation.id, VacationStatus.CANCELLED)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(vacation.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ),
              },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}
