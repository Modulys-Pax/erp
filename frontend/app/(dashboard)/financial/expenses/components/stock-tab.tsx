'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockMovementApi, StockMovement } from '@/lib/api/stock';
import { accountPayableApi } from '@/lib/api/account-payable';
import { formatCurrency } from '@/lib/utils/currency';
import { productApi } from '@/lib/api/product';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { formatDate } from '@/lib/utils/date';
import { formatQuantity } from '@/lib/utils/quantity';
import {
  ACCOUNT_PAYABLE_STATUS_LABELS,
  ACCOUNT_PAYABLE_STATUS_COLORS,
  type AccountPayableStatus,
} from '@/lib/constants/status.constants';
import {
  Package,
  DollarSign,
  TrendingUp,
  ArrowDownCircle,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';

const DEBOUNCE_MS = 500;
const LIMIT = 10;

export function StockExpensesTab() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const debouncedProduct = useDebounce(selectedProduct, DEBOUNCE_MS);
  const debouncedStartDate = useDebounce(startDate, DEBOUNCE_MS);
  const debouncedEndDate = useDebounce(endDate, DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
  }, [effectiveBranchId, debouncedProduct, debouncedStartDate, debouncedEndDate]);

  // Lista de produtos para filtro
  const { data: products } = useQuery({
    queryKey: ['products', effectiveBranchId],
    queryFn: () => productApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
  });

  // Buscar movimentações de ENTRADA (compras de estoque)
  const { data: movementsResponse, isLoading } = useQuery({
    queryKey: ['stock-movements-entry', effectiveBranchId, debouncedProduct, debouncedStartDate, debouncedEndDate, page],
    queryFn: () =>
      stockMovementApi.getAll(
        effectiveBranchId || undefined,
        debouncedProduct || undefined,
        'ENTRY', // Apenas entradas
        debouncedStartDate || undefined,
        debouncedEndDate || undefined,
        page,
        LIMIT,
      ),
  });

  // Buscar todas as entradas para métricas
  const { data: allEntries } = useQuery({
    queryKey: ['stock-movements-entry-all', effectiveBranchId, debouncedStartDate, debouncedEndDate],
    queryFn: () =>
      stockMovementApi.getAll(
        effectiveBranchId || undefined,
        undefined,
        'ENTRY',
        debouncedStartDate || undefined,
        debouncedEndDate || undefined,
        1,
        1000,
      ),
  });

  // Buscar contas a pagar de estoque (originType = STOCK)
  const { data: stockPayables, isLoading: isLoadingPayables } = useQuery({
    queryKey: ['accounts-payable-stock', effectiveBranchId, debouncedStartDate, debouncedEndDate],
    queryFn: () =>
      accountPayableApi.getPayableSummary(
        effectiveBranchId || undefined,
        undefined, // status
        debouncedStartDate || undefined,
        debouncedEndDate || undefined,
        1,
        100,
        'STOCK',
      ),
  });

  const formatNumber = (value: number | undefined | null) => {
    const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR').format(n);
  };

  // Calcular métricas
  const metrics = {
    totalEntries: allEntries?.total || 0,
    totalCost: allEntries?.data.reduce((acc, m) => acc + (m.totalCost || 0), 0) || 0,
    totalQuantity: allEntries?.data.reduce((acc, m) => acc + m.quantity, 0) || 0,
  };

  const getStatusBadge = (status: AccountPayableStatus) => {
    return (
      <Badge className={ACCOUNT_PAYABLE_STATUS_COLORS[status]}>
        {status === 'PENDING' && <Clock className="mr-1 h-3 w-3" />}
        {status === 'PAID' && <CheckCircle className="mr-1 h-3 w-3" />}
        {ACCOUNT_PAYABLE_STATUS_LABELS[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Métricas */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total de Entradas"
            value={formatNumber(metrics.totalEntries)}
            icon={ArrowDownCircle}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Custo Total"
            value={formatCurrency(metrics.totalCost)}
            icon={DollarSign}
            className="border-l-4 border-l-red-500"
          />
          <StatCard
            title="Itens Adquiridos"
            value={formatNumber(metrics.totalQuantity)}
            icon={Package}
            className="border-l-4 border-l-blue-500"
          />
        </div>
      )}

      {/* Filtros */}
      <SectionCard title="Filtros">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Produto</Label>
            <SearchableSelect
              options={[
                { value: '', label: 'Todos' },
                ...toSelectOptions(products?.data || [], (p) => p.id, (p) => p.name),
              ]}
              value={selectedProduct}
              onChange={setSelectedProduct}
              placeholder="Todos os produtos"
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

      {/* Lista de Movimentações */}
      <SectionCard
        title="Compras de Estoque"
        description={movementsResponse?.total ? `${movementsResponse.total} entrada(s)` : undefined}
      >
        {!isLoading && (!movementsResponse?.data || movementsResponse.data.length === 0) ? (
          <EmptyState
            icon={Package}
            title="Nenhuma entrada de estoque"
            description="As compras de estoque aparecerão aqui."
            action={{ label: 'Nova Movimentação', href: '/stock/movements/new' }}
          />
        ) : (
          <DataTable
            data={movementsResponse?.data || []}
            pagination={
              movementsResponse && movementsResponse.totalPages > 1
                ? {
                    page: movementsResponse.page,
                    limit: movementsResponse.limit,
                    total: movementsResponse.total,
                    totalPages: movementsResponse.totalPages,
                  }
                : undefined
            }
            onPageChange={setPage}
            isLoading={isLoading}
            emptyMessage="Nenhuma entrada encontrada"
            columns={[
              {
                key: 'product',
                header: 'Produto',
                render: (movement) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{movement.productName}</span>
                      {movement.productCode && (
                        <p className="text-xs text-muted-foreground">Código: {movement.productCode}</p>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'quantity',
                header: 'Quantidade',
                render: (movement) => (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    +{formatQuantity(movement.quantity, movement.productUnit, { showUnit: true })}
                  </Badge>
                ),
                className: 'text-center',
              },
              {
                key: 'unitCost',
                header: 'Custo Unit.',
                render: (movement) => formatCurrency(movement.unitCost || 0),
                className: 'text-right',
              },
              {
                key: 'totalCost',
                header: 'Custo Total',
                render: (movement) => (
                  <span className="font-semibold text-red-600">{formatCurrency(movement.totalCost || 0)}</span>
                ),
                className: 'text-right',
              },
              {
                key: 'date',
                header: 'Data',
                render: (movement) => (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(movement.createdAt)}</span>
                  </div>
                ),
              },
              {
                key: 'document',
                header: 'Documento',
                render: (movement) =>
                  movement.documentNumber ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span className="text-xs">{movement.documentNumber}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  ),
              },
            ]}
          />
        )}
      </SectionCard>

      {/* Contas a Pagar de Estoque */}
      {stockPayables && stockPayables.accountsPayable.data.length > 0 && (
        <SectionCard
          title="Contas a Pagar - Compras de Estoque"
          description={`${stockPayables.accountsPayable.total} conta(s) geradas automaticamente`}
        >
          <DataTable
            data={stockPayables.accountsPayable.data}
            isLoading={isLoadingPayables}
            emptyMessage="Nenhuma conta a pagar"
            columns={[
              {
                key: 'description',
                header: 'Descrição',
                render: (account) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Receipt className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <Link
                        href={`/accounts-payable/${account.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {account.description}
                      </Link>
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
            ]}
          />
        </SectionCard>
      )}
    </div>
  );
}
