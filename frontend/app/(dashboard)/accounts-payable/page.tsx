'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountPayableApi } from '@/lib/api/account-payable';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { EmptyState } from '@/components/ui/empty-state';
import { toastSuccess, toastErrorFromException, toastError } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import {
  ACCOUNT_PAYABLE_STATUS_LABELS,
  ACCOUNT_PAYABLE_STATUS_COLORS,
  type AccountPayableStatus,
} from '@/lib/constants/status.constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowDownCircle,
  Receipt,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  MoreHorizontal,
  Clock,
  DollarSign,
  Calendar,
  Users,
  Truck,
  Package,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import { Can } from '@/components/auth/permission-gate';
import { ExportButton } from '@/components/ui/export-button';

const DEBOUNCE_MS = 500;
const LIMIT = 10;

export default function AccountsPayablePage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const debouncedStatus = useDebounce(selectedStatus, DEBOUNCE_MS);
  const debouncedStartDate = useDebounce(startDate, DEBOUNCE_MS);
  const debouncedEndDate = useDebounce(endDate, DEBOUNCE_MS);

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveBranchId, debouncedStatus, debouncedStartDate, debouncedEndDate]);

  const { data: summaryData, isLoading } = useQuery({
    queryKey: [
      'accounts-payable-summary',
      effectiveBranchId,
      debouncedStatus,
      debouncedStartDate,
      debouncedEndDate,
      currentPage,
    ],
    queryFn: () =>
      accountPayableApi.getPayableSummary(
        effectiveBranchId || undefined,
        debouncedStartDate || undefined,
        debouncedEndDate || undefined,
        debouncedStatus || undefined,
        currentPage,
        LIMIT,
      ),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => accountPayableApi.pay(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable-summary'] });
      toastSuccess('Conta marcada como paga');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao pagar conta'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => accountPayableApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable-summary'] });
      toastSuccess('Conta cancelada');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao cancelar conta'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountPayableApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable-summary'] });
      toastSuccess('Conta excluída');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao excluir conta'),
  });

  const handlePay = (id: string) => {
    if (confirm('Marcar esta conta como paga?')) payMutation.mutate(id);
  };

  const handleCancel = (id: string) => {
    if (confirm('Cancelar esta conta?')) cancelMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir esta conta a pagar?')) deleteMutation.mutate(id);
  };


  const formatNumber = (value: number | undefined | null) => {
    const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR').format(n);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        subtitle="Gerencie as contas a pagar"
        actions={
          <Can permission="accounts-payable.create">
            <Link href="/accounts-payable/new">
              <Button>Nova Conta a Pagar</Button>
            </Link>
          </Can>
        }
      />

      {/* Métricas */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : summaryData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Pendentes"
            value={formatCurrency(summaryData.summary.totalPayablePending)}
            icon={Clock}
            className="border-l-4 border-l-yellow-500"
          />
          <StatCard
            title="Pagas"
            value={formatCurrency(summaryData.summary.totalPayablePaid)}
            icon={CheckCircle}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Canceladas"
            value={formatCurrency(summaryData.summary.totalPayableCancelled)}
            icon={XCircle}
            className="border-l-4 border-l-red-500"
          />
        </div>
      )}

      {/* Filtros */}
      <SectionCard title="Filtros">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Status</Label>
            <SearchableSelect
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'PENDING', label: 'Pendente' },
                { value: 'PAID', label: 'Paga' },
                { value: 'CANCELLED', label: 'Cancelada' },
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
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Data Final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      </SectionCard>

      {/* Lista */}
      <SectionCard
        title="Contas a Pagar"
        description={summaryData?.accountsPayable.total ? `${summaryData.accountsPayable.total} conta(s)` : undefined}
        actions={
          <ExportButton
            data={summaryData?.accountsPayable.data || []}
            filename="contas-a-pagar"
            title="Contas a Pagar"
            columns={[
              { key: 'description', header: 'Descrição' },
              { key: 'amount', header: 'Valor', getValue: (a) => formatCurrency(a.amount) },
              { key: 'dueDate', header: 'Vencimento', getValue: (a) => formatDate(a.dueDate) },
              { key: 'status', header: 'Status', getValue: (a) => ACCOUNT_PAYABLE_STATUS_LABELS[a.status as AccountPayableStatus] },
              { key: 'paymentDate', header: 'Pago em', getValue: (a) => a.paymentDate ? formatDate(a.paymentDate) : '-' },
            ]}
          />
        }
      >
        {!isLoading && summaryData?.accountsPayable.data.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma conta a pagar"
            description="Cadastre contas a pagar para gerenciá-las aqui."
            action={{ label: 'Nova Conta', href: '/accounts-payable/new' }}
          />
        ) : (
          <DataTable
            data={summaryData?.accountsPayable.data || []}
            pagination={
              summaryData && summaryData.accountsPayable.totalPages > 1
                ? {
                    page: summaryData.accountsPayable.page,
                    limit: summaryData.accountsPayable.limit,
                    total: summaryData.accountsPayable.total,
                    totalPages: summaryData.accountsPayable.totalPages,
                  }
                : undefined
            }
            onPageChange={setCurrentPage}
            isLoading={isLoading}
            emptyMessage="Nenhuma conta encontrada"
            rowClassName={(account: { status: string }) =>
              account.status === 'PENDING'
                ? 'bg-yellow-50/50 dark:bg-yellow-900/10'
                : account.status === 'PAID'
                  ? 'bg-green-50/50 dark:bg-green-900/10'
                  : account.status === 'CANCELLED'
                    ? 'bg-red-50/50 dark:bg-red-900/10'
                    : undefined
            }
            columns={[
              {
                key: 'description',
                header: 'Descrição',
                render: (account) => {
                  // Determinar ícone baseado no documentNumber
                  const isPayroll = account.documentNumber?.startsWith('FOLHA-');
                  const Icon = isPayroll ? Users : ArrowDownCircle;
                  const iconBg = isPayroll
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'bg-red-100 dark:bg-red-900/30';
                  const iconColor = isPayroll
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-red-600 dark:text-red-400';

                  return (
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{account.description}</span>
                        {isPayroll && (
                          <p className="text-xs text-muted-foreground">Folha de Pagamento</p>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'amount',
                header: 'Valor',
                render: (account) => (
                  <span className="font-semibold text-foreground">{formatCurrency(account.amount)}</span>
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
                key: 'status',
                header: 'Status',
                render: (account) => (
                  <Badge className={ACCOUNT_PAYABLE_STATUS_COLORS[account.status as AccountPayableStatus]}>
                    {ACCOUNT_PAYABLE_STATUS_LABELS[account.status as AccountPayableStatus]}
                  </Badge>
                ),
              },
              {
                key: 'actions',
                header: 'Ações',
                className: 'text-right',
                render: (account) => (
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Can permission="accounts-payable.update">
                          <DropdownMenuItem asChild>
                            <Link href={`/accounts-payable/${account.id}`} className="flex items-center">
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                        </Can>
                        {account.status === 'PENDING' && (
                          <>
                            <Can permission="accounts-payable.pay">
                              <DropdownMenuItem onClick={() => handlePay(account.id)} className="flex items-center">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como Paga
                              </DropdownMenuItem>
                            </Can>
                            <Can permission="accounts-payable.update">
                              <DropdownMenuItem onClick={() => handleCancel(account.id)} className="flex items-center">
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar
                              </DropdownMenuItem>
                            </Can>
                          </>
                        )}
                        <Can permission="accounts-payable.delete">
                          {account.status !== 'PAID' && (
                            <DropdownMenuItem onClick={() => handleDelete(account.id)} className="text-destructive">
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
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}
