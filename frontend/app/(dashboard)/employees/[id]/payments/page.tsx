'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '@/lib/api/employee';
import { formatCurrency } from '@/lib/utils/currency';
import { accountPayableApi, AccountPayableStatus } from '@/lib/api/account-payable';
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
import {
  ACCOUNT_PAYABLE_STATUS_LABELS,
  ACCOUNT_PAYABLE_STATUS_COLORS,
  type AccountPayableStatus as AccountPayableStatusType,
} from '@/lib/constants/status.constants';
import {
  ArrowLeft,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Users,
  Receipt,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/date';

export default function EmployeePaymentsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Buscar dados do funcionário
  const { data: employee, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeeApi.getById(id),
  });

  // Buscar contas a pagar do funcionário (filtrar pelo originId)
  const { data: allAccounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts-payable-employee', id, employee?.branchId],
    queryFn: () =>
      accountPayableApi.getAll(
        undefined,
        employee?.branchId,
        undefined,
        undefined,
        undefined,
      ),
    enabled: !!employee?.branchId,
  });

  // Filtrar contas do funcionário específico
  const employeeAccounts = useMemo(() => {
    let accounts = allAccounts.filter((a) => a.originId === id && a.originType === 'HR');

    if (selectedStatus) {
      accounts = accounts.filter((a) => a.status === selectedStatus);
    }

    if (startDate) {
      const start = new Date(startDate);
      accounts = accounts.filter((a) => new Date(a.dueDate) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      accounts = accounts.filter((a) => new Date(a.dueDate) <= end);
    }

    return accounts.sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
    );
  }, [allAccounts, id, selectedStatus, startDate, endDate]);

  // Métricas
  const metrics = useMemo(() => {
    const all = allAccounts.filter((a) => a.originId === id && a.originType === 'HR');
    const pending = all.filter((a) => a.status === 'PENDING');
    const paid = all.filter((a) => a.status === 'PAID');
    const cancelled = all.filter((a) => a.status === 'CANCELLED');

    const totalPending = pending.reduce((acc, a) => acc + a.amount, 0);
    const totalPaid = paid.reduce((acc, a) => acc + a.amount, 0);

    return {
      total: all.length,
      pending: pending.length,
      paid: paid.length,
      cancelled: cancelled.length,
      totalPending,
      totalPaid,
    };
  }, [allAccounts, id]);

  const isLoading = isLoadingEmployee || isLoadingAccounts;

  if (isLoadingEmployee) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <SectionCard>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <PageHeader title="Funcionário não encontrado" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            O funcionário solicitado não foi encontrado.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={`Histórico de Pagamentos - ${employee.name}`}
          subtitle="Visualize o histórico de folhas de pagamento do funcionário"
        />
      </div>

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
            value={metrics.total}
            icon={Receipt}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Pendentes"
            value={formatCurrency(metrics.totalPending)}
            icon={Clock}
            className="border-l-4 border-l-yellow-500"
          />
          <StatCard
            title="Pagos"
            value={formatCurrency(metrics.totalPaid)}
            icon={CheckCircle}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Registros Pagos"
            value={metrics.paid}
            icon={DollarSign}
            className="border-l-4 border-l-blue-500"
          />
        </div>
      )}

      {/* Filtros */}
      <SectionCard title="Filtros">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Status</Label>
            <SearchableSelect
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'PENDING', label: 'Pendente' },
                { value: 'PAID', label: 'Pago' },
                { value: 'CANCELLED', label: 'Cancelado' },
              ]}
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="Todos os status"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Data Inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Data Final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      {/* Lista */}
      <SectionCard
        title="Histórico de Pagamentos"
        description={employeeAccounts.length > 0 ? `${employeeAccounts.length} registro(s)` : undefined}
      >
        {!isLoading && employeeAccounts.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhum pagamento encontrado"
            description="Não há registros de pagamento para este funcionário."
          />
        ) : (
          <DataTable
            data={employeeAccounts}
            isLoading={isLoading}
            emptyMessage="Nenhum pagamento encontrado"
            rowClassName={(account) =>
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{account.description}</span>
                      {account.notes && (
                        <p className="text-xs text-muted-foreground">{account.notes}</p>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'amount',
                header: 'Valor',
                render: (account) => (
                  <span className="font-semibold text-foreground">
                    {formatCurrency(account.amount)}
                  </span>
                ),
                className: 'text-right',
              },
              {
                key: 'dueDate',
                header: 'Vencimento',
                render: (account) => (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{formatDate(account.dueDate)}</span>
                  </div>
                ),
              },
              {
                key: 'paymentDate',
                header: 'Data Pagamento',
                render: (account) => (
                  <span className="text-muted-foreground">
                    {account.paymentDate ? formatDate(account.paymentDate) : '-'}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (account) => (
                  <Badge
                    className={
                      ACCOUNT_PAYABLE_STATUS_COLORS[account.status as AccountPayableStatusType]
                    }
                  >
                    {ACCOUNT_PAYABLE_STATUS_LABELS[account.status as AccountPayableStatusType]}
                  </Badge>
                ),
              },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}
