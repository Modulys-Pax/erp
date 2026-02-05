'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountReceivableApi } from '@/lib/api/account-receivable';
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
  ACCOUNT_RECEIVABLE_STATUS_LABELS,
  ACCOUNT_RECEIVABLE_STATUS_COLORS,
  type AccountReceivableStatus,
} from '@/lib/constants/status.constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpCircle,
  Receipt,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  MoreHorizontal,
  Clock,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import { Can } from '@/components/auth/permission-gate';
import { ExportButton } from '@/components/ui/export-button';

const DEBOUNCE_MS = 500;
const LIMIT = 10;

export default function AccountsReceivablePage() {
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
      'accounts-receivable-summary',
      effectiveBranchId,
      debouncedStatus,
      debouncedStartDate,
      debouncedEndDate,
      currentPage,
    ],
    queryFn: () =>
      accountReceivableApi.getSummary(
        effectiveBranchId || undefined,
        debouncedStartDate || undefined,
        debouncedEndDate || undefined,
        debouncedStatus || undefined,
        currentPage,
        LIMIT,
      ),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => accountReceivableApi.receive(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable-summary'] });
      toastSuccess('Conta marcada como recebida');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao receber conta'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => accountReceivableApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable-summary'] });
      toastSuccess('Conta cancelada');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao cancelar conta'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountReceivableApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable-summary'] });
      toastSuccess('Conta excluída');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao excluir conta'),
  });

  const handleReceive = (id: string) => {
    if (confirm('Marcar esta conta como recebida?')) receiveMutation.mutate(id);
  };

  const handleCancel = (id: string) => {
    if (confirm('Cancelar esta conta?')) cancelMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Excluir esta conta a receber?')) deleteMutation.mutate(id);
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Receber"
        subtitle="Gerencie as contas a receber"
        actions={
          <Can permission="accounts-receivable.create">
            <Link href="/accounts-receivable/new">
              <Button>Nova Conta a Receber</Button>
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
            value={formatCurrency(summaryData.summary.totalReceivablePending)}
            icon={Clock}
            className="border-l-4 border-l-yellow-500"
          />
          <StatCard
            title="Recebidas"
            value={formatCurrency(summaryData.summary.totalReceivableReceived)}
            icon={CheckCircle}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Canceladas"
            value={formatCurrency(summaryData.summary.totalReceivableCancelled)}
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
                { value: 'RECEIVED', label: 'Recebida' },
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
        title="Contas a Receber"
        description={summaryData?.accountsReceivable.total ? `${summaryData.accountsReceivable.total} conta(s)` : undefined}
        actions={
          <ExportButton
            data={summaryData?.accountsReceivable.data || []}
            filename="contas-a-receber"
            title="Contas a Receber"
            columns={[
              { key: 'description', header: 'Descrição' },
              { key: 'amount', header: 'Valor', getValue: (a) => formatCurrency(a.amount) },
              { key: 'dueDate', header: 'Vencimento', getValue: (a) => formatDate(a.dueDate) },
              { key: 'status', header: 'Status', getValue: (a) => ACCOUNT_RECEIVABLE_STATUS_LABELS[a.status as AccountReceivableStatus] },
              { key: 'receiptDate', header: 'Recebido em', getValue: (a) => a.receiptDate ? formatDate(a.receiptDate) : '-' },
            ]}
          />
        }
      >
        {!isLoading && summaryData?.accountsReceivable.data.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma conta a receber"
            description="Cadastre contas a receber para gerenciá-las aqui."
            action={{ label: 'Nova Conta', href: '/accounts-receivable/new' }}
          />
        ) : (
          <DataTable
            data={summaryData?.accountsReceivable.data || []}
            pagination={
              summaryData && summaryData.accountsReceivable.totalPages > 1
                ? {
                    page: summaryData.accountsReceivable.page,
                    limit: summaryData.accountsReceivable.limit,
                    total: summaryData.accountsReceivable.total,
                    totalPages: summaryData.accountsReceivable.totalPages,
                  }
                : undefined
            }
            onPageChange={setCurrentPage}
            isLoading={isLoading}
            emptyMessage="Nenhuma conta encontrada"
            rowClassName={(account: { status: string }) =>
              account.status === 'PENDING'
                ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-l-2 border-l-yellow-500'
                : undefined
            }
            columns={[
              {
                key: 'description',
                header: 'Descrição',
                render: (account) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                      <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-foreground">{account.description}</span>
                  </div>
                ),
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
                  <Badge className={ACCOUNT_RECEIVABLE_STATUS_COLORS[account.status as AccountReceivableStatus]}>
                    {ACCOUNT_RECEIVABLE_STATUS_LABELS[account.status as AccountReceivableStatus]}
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
                        <Can permission="accounts-receivable.update">
                          <DropdownMenuItem asChild>
                            <Link href={`/accounts-receivable/${account.id}`} className="flex items-center">
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                        </Can>
                        {account.status === 'PENDING' && (
                          <>
                            <Can permission="accounts-receivable.receive">
                              <DropdownMenuItem onClick={() => handleReceive(account.id)} className="flex items-center">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como Recebida
                              </DropdownMenuItem>
                            </Can>
                            <Can permission="accounts-receivable.update">
                              <DropdownMenuItem onClick={() => handleCancel(account.id)} className="flex items-center">
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar
                              </DropdownMenuItem>
                            </Can>
                          </>
                        )}
                        <Can permission="accounts-receivable.delete">
                          {account.status !== 'RECEIVED' && (
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
