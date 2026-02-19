'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountPayableApi, AccountPayable } from '@/lib/api/account-payable';
import { formatCurrency } from '@/lib/utils/currency';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { useDebounce } from '@/lib/hooks/use-debounce';
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
import { formatDate } from '@/lib/utils/date';
import {
  ACCOUNT_PAYABLE_STATUS_LABELS,
  ACCOUNT_PAYABLE_STATUS_COLORS,
  type AccountPayableStatus,
} from '@/lib/constants/status.constants';
import {
  DollarSign,
  Receipt,
  Clock,
  CheckCircle,
  Calendar,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

const DEBOUNCE_MS = 500;
const LIMIT = 10;

export function OtherExpensesTab() {
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

  // Buscar contas a pagar MANUAIS (sem originType ou com originType = MANUAL)
  const { data: summaryData, isLoading } = useQuery({
    queryKey: [
      'accounts-payable-manual',
      effectiveBranchId,
      debouncedStatus,
      debouncedStartDate,
      debouncedEndDate,
      currentPage,
    ],
    queryFn: () =>
      accountPayableApi.getPayableSummary(
        effectiveBranchId || undefined,
        debouncedStatus || undefined,
        debouncedStartDate || undefined,
        debouncedEndDate || undefined,
        currentPage,
        LIMIT,
      ),
  });

  // Filtrar apenas contas manuais (sem originType ou MANUAL)
  const manualAccounts = useMemo(() => {
    if (!summaryData?.accountsPayable.data) return [];
    return summaryData.accountsPayable.data.filter(
      (ap) => !ap.originType || ap.originType === 'MANUAL'
    );
  }, [summaryData?.accountsPayable.data]);

  // Métricas apenas de contas manuais
  const metrics = useMemo(() => {
    const total = manualAccounts.length;
    const totalAmount = manualAccounts.reduce((acc, ap) => acc + Number(ap.amount), 0);
    const pending = manualAccounts.filter((ap) => ap.status === 'PENDING' || ap.status === 'OVERDUE');
    const paid = manualAccounts.filter((ap) => ap.status === 'PAID');
    return {
      total,
      totalAmount,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((acc, ap) => acc + Number(ap.amount), 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((acc, ap) => acc + Number(ap.amount), 0),
    };
  }, [manualAccounts]);


  const getStatusBadge = (status: AccountPayableStatus) => {
    return (
      <Badge variant="outline" className={ACCOUNT_PAYABLE_STATUS_COLORS[status]}>
        {status === 'PENDING' && <Clock className="mr-1 h-3 w-3" />}
        {status === 'OVERDUE' && <Clock className="mr-1 h-3 w-3" />}
        {status === 'PAID' && <CheckCircle className="mr-1 h-3 w-3" />}
        {ACCOUNT_PAYABLE_STATUS_LABELS[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
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
            title="Total de Despesas"
            value={metrics.total}
            icon={Receipt}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Valor Total"
            value={formatCurrency(metrics.totalAmount)}
            icon={DollarSign}
            className="border-l-4 border-l-red-500"
          />
          <StatCard
            title="Pendentes"
            value={formatCurrency(metrics.pendingAmount)}
            description={`${metrics.pendingCount} conta(s)`}
            icon={Clock}
            className="border-l-4 border-l-yellow-500"
          />
          <StatCard
            title="Pagas"
            value={formatCurrency(metrics.paidAmount)}
            description={`${metrics.paidCount} conta(s)`}
            icon={CheckCircle}
            className="border-l-4 border-l-green-500"
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
                { value: '', label: 'Todos' },
                { value: 'PENDING', label: 'Pendente' },
                { value: 'OVERDUE', label: 'Vencido' },
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
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Data Final</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </SectionCard>

      {/* Lista */}
      <SectionCard
        title="Outras Despesas"
        description="Despesas gerais não relacionadas a funcionários, estoque ou frota"
        actions={
          <Link href="/accounts-payable/new">
            <Button size="sm">Nova Despesa</Button>
          </Link>
        }
      >
        {!isLoading && manualAccounts.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma despesa cadastrada"
            description="Cadastre despesas gerais como aluguel, energia, internet, etc."
            action={{ label: 'Nova Despesa', href: '/accounts-payable/new' }}
          />
        ) : (
          <DataTable
            data={manualAccounts}
            isLoading={isLoading}
            emptyMessage="Nenhuma despesa encontrada"
            rowClassName={(account: { status: string }) =>
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                      <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <Link
                        href={`/accounts-payable/${account.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {account.description}
                      </Link>
                      {account.documentNumber && (
                        <p className="text-xs text-muted-foreground">Doc: {account.documentNumber}</p>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'dueDate',
                header: 'Vencimento',
                render: (account) => (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(account.dueDate)}</span>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (account) => getStatusBadge(account.status as AccountPayableStatus),
              },
              {
                key: 'amount',
                header: 'Valor',
                render: (account) => (
                  <span className="font-semibold">{formatCurrency(account.amount)}</span>
                ),
                className: 'text-right',
              },
              {
                key: 'paymentDate',
                header: 'Pagamento',
                render: (account) =>
                  account.paymentDate ? (
                    <span className="text-green-600">{formatDate(account.paymentDate)}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  ),
              },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}
