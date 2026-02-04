'use client';

import { useQuery } from '@tanstack/react-query';
import { accountPayableApi } from '@/lib/api/account-payable';
import { formatCurrency } from '@/lib/utils/currency';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  ACCOUNT_PAYABLE_STATUS_LABELS,
  ACCOUNT_PAYABLE_STATUS_COLORS,
  ACCOUNT_RECEIVABLE_STATUS_LABELS,
  ACCOUNT_RECEIVABLE_STATUS_COLORS,
  type AccountPayableStatus,
  type AccountReceivableStatus,
} from '@/lib/constants/status.constants';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { formatDate } from '@/lib/utils/date';

export default function FinancialSummaryPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [payablePage, setPayablePage] = useState(1);
  const [receivablePage, setReceivablePage] = useState(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterDateType, setFilterDateType] = useState<'dueDate' | 'createdAt'>('dueDate');
  const limit = 10;

  const filterBranchId = effectiveBranchId || undefined;

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['financial-summary', filterBranchId, startDate, endDate, filterDateType, payablePage, receivablePage],
    queryFn: () =>
      accountPayableApi.getSummary(
        filterBranchId,
        startDate || undefined,
        endDate || undefined,
        payablePage,
        receivablePage,
        limit,
        filterDateType,
      ),
  });

  useEffect(() => {
    setPayablePage(1);
    setReceivablePage(1);
  }, [effectiveBranchId, startDate, endDate, filterDateType]);

  const formatNumber = (value: number | undefined | null) => {
    const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR').format(n);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumo Financeiro"
        subtitle="Dashboard de contas a pagar e receber"
      />

      {/* Filtros de Período */}
      <SectionCard title="Filtros">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Filtrar por
            </label>
            <SearchableSelect
              options={[
                { value: 'dueDate', label: 'Data de vencimento' },
                { value: 'createdAt', label: 'Data de cadastro' },
              ]}
              value={filterDateType}
              onChange={(v) => {
                setFilterDateType(v as 'dueDate' | 'createdAt');
                setPayablePage(1);
                setReceivablePage(1);
              }}
              placeholder="Tipo de filtro"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Data Inicial
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Data Final
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl"
            />
          </div>
        </div>
      </SectionCard>

      {/* Métricas Principais */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : summaryData ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total a Pagar"
              value={formatCurrency(summaryData.summary.totalPayable)}
              icon={ArrowDownCircle}
              className="border-l-4 border-l-red-500"
            />
            <StatCard
              title="Total a Receber"
              value={formatCurrency(summaryData.summary.totalReceivable)}
              icon={ArrowUpCircle}
              className="border-l-4 border-l-green-500"
            />
            <StatCard
              title="Saldo Líquido"
              value={formatCurrency(summaryData.summary.netBalance)}
              icon={summaryData.summary.netBalance >= 0 ? TrendingUp : TrendingDown}
              className={`border-l-4 ${summaryData.summary.netBalance >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}
            />
            <StatCard
              title="Pendentes a Pagar"
              value={formatCurrency(summaryData.summary.totalPayablePending)}
              icon={Clock}
              className="border-l-4 border-l-yellow-500"
            />
          </div>

          {/* Breakdown de Contas a Pagar */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  A Pagar - Pendentes
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(summaryData.summary.totalPayablePending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(summaryData.summary.countPayablePending)} conta(s)
              </p>
            </div>

            <div className="rounded-xl border border-border bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  A Pagar - Pagas
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(summaryData.summary.totalPayablePaid)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(summaryData.summary.countPayablePaid)} conta(s)
              </p>
            </div>

            <div className="rounded-xl border border-border bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  A Pagar - Canceladas
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(summaryData.summary.totalPayableCancelled)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(summaryData.summary.countPayableCancelled)} conta(s)
              </p>
            </div>
          </div>

          {/* Breakdown de Contas a Receber */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  A Receber - Pendentes
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(summaryData.summary.totalReceivablePending)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(summaryData.summary.countReceivablePending)} conta(s)
              </p>
            </div>

            <div className="rounded-xl border border-border bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  A Receber - Recebidas
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(summaryData.summary.totalReceivableReceived)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(summaryData.summary.countReceivableReceived)} conta(s)
              </p>
            </div>

            <div className="rounded-xl border border-border bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  A Receber - Canceladas
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(summaryData.summary.totalReceivableCancelled)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(summaryData.summary.countReceivableCancelled)} conta(s)
              </p>
            </div>
          </div>

          {/* Lista de Contas a Pagar */}
          <SectionCard
            title="Contas a Pagar"
            description={summaryData.accountsPayable.total > 0 ? `${summaryData.accountsPayable.total} conta(s)` : undefined}
          >
            {summaryData.accountsPayable.data.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nenhuma conta a pagar"
                description="As contas a pagar aparecerão aqui."
              />
            ) : (
              <DataTable
                data={summaryData.accountsPayable.data}
                pagination={
                  summaryData.accountsPayable.totalPages > 1
                    ? {
                        page: summaryData.accountsPayable.page,
                        limit: summaryData.accountsPayable.limit,
                        total: summaryData.accountsPayable.total,
                        totalPages: summaryData.accountsPayable.totalPages,
                      }
                    : undefined
                }
                onPageChange={(page) => setPayablePage(page)}
                columns={[
                  {
                    key: 'description',
                    header: 'Descrição',
                    render: (account) => (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                          <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <Link
                          href={`/accounts-payable/${account.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {account.description}
                        </Link>
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
                        <span className="text-muted-foreground">
                          {formatDate(account.dueDate)}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'createdAt',
                    header: 'Cadastro',
                    render: (account) => (
                      <span className="text-muted-foreground text-sm">
                        {account.createdAt ? formatDate(account.createdAt) : '-'}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (account) => (
                      <Badge className={ACCOUNT_PAYABLE_STATUS_COLORS[account.status as AccountPayableStatus]}>
                        {ACCOUNT_PAYABLE_STATUS_LABELS[account.status as AccountPayableStatus] || account.status}
                      </Badge>
                    ),
                  },
                ]}
                isLoading={isLoading}
                emptyMessage="Nenhuma conta a pagar encontrada"
              />
            )}
          </SectionCard>

          {/* Lista de Contas a Receber */}
          <SectionCard
            title="Contas a Receber"
            description={summaryData.accountsReceivable.total > 0 ? `${summaryData.accountsReceivable.total} conta(s)` : undefined}
          >
            {summaryData.accountsReceivable.data.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nenhuma conta a receber"
                description="As contas a receber aparecerão aqui."
              />
            ) : (
              <DataTable
                data={summaryData.accountsReceivable.data}
                pagination={
                  summaryData.accountsReceivable.totalPages > 1
                    ? {
                        page: summaryData.accountsReceivable.page,
                        limit: summaryData.accountsReceivable.limit,
                        total: summaryData.accountsReceivable.total,
                        totalPages: summaryData.accountsReceivable.totalPages,
                      }
                    : undefined
                }
                onPageChange={(page) => setReceivablePage(page)}
                columns={[
                  {
                    key: 'description',
                    header: 'Descrição',
                    render: (account) => (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                          <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <Link
                          href={`/accounts-receivable/${account.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {account.description}
                        </Link>
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
                        <span className="text-muted-foreground">
                          {formatDate(account.dueDate)}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'createdAt',
                    header: 'Cadastro',
                    render: (account) => (
                      <span className="text-muted-foreground text-sm">
                        {account.createdAt ? formatDate(account.createdAt) : '-'}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (account) => (
                      <Badge className={ACCOUNT_RECEIVABLE_STATUS_COLORS[account.status as AccountReceivableStatus]}>
                        {ACCOUNT_RECEIVABLE_STATUS_LABELS[account.status as AccountReceivableStatus] || account.status}
                      </Badge>
                    ),
                  },
                ]}
                isLoading={isLoading}
                emptyMessage="Nenhuma conta a receber encontrada"
              />
            )}
          </SectionCard>
        </>
      ) : (
        <SectionCard>
          <EmptyState
            icon={DollarSign}
            title="Nenhum dado disponível"
            description="Selecione uma filial para ver o resumo financeiro."
          />
        </SectionCard>
      )}
    </div>
  );
}
