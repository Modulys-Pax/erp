'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockMovementApi, StockMovement } from '@/lib/api/stock';
import { formatCurrency } from '@/lib/utils/currency';
import { productApi } from '@/lib/api/product';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyMovements } from '@/components/ui/empty-state';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import {
  STOCK_MOVEMENT_TYPE_LABELS,
  STOCK_MOVEMENT_TYPE_BG_COLORS,
} from '@/lib/constants/status.constants';
import {
  Package,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Hash,
  Weight,
  Droplets,
  Boxes,
  type LucideIcon,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { formatQuantity } from '@/lib/utils/quantity';
import { ExportButton } from '@/components/ui/export-button';

const DEBOUNCE_MS = 500;
const LIMIT = 10;

export default function StockMovementsPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);

  const debouncedProductId = useDebounce(selectedProductId, DEBOUNCE_MS);
  const debouncedStartDate = useDebounce(startDate, DEBOUNCE_MS);
  const debouncedEndDate = useDebounce(endDate, DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
  }, [effectiveBranchId, debouncedProductId, debouncedStartDate, debouncedEndDate]);

  const { data: productsResponse } = useQuery({
    queryKey: ['products', effectiveBranchId],
    queryFn: () => productApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
    enabled: !!effectiveBranchId,
  });

  const products = productsResponse?.data || [];

  const { data: movementsResponse, isLoading } = useQuery({
    queryKey: [
      'stockMovements',
      effectiveBranchId,
      debouncedProductId,
      debouncedStartDate,
      debouncedEndDate,
      page,
    ],
    queryFn: () =>
      stockMovementApi.getAll(
        undefined,
        effectiveBranchId || undefined,
        debouncedProductId || undefined,
        debouncedStartDate || undefined,
        debouncedEndDate || undefined,
        page,
        LIMIT,
      ),
    enabled: !!effectiveBranchId,
  });

  const movements = movementsResponse?.data || [];

  // Buscar todas as movimentações para métricas (período filtrado)
  const { data: allMovementsResponse } = useQuery({
    queryKey: ['stockMovements-metrics', effectiveBranchId, debouncedStartDate, debouncedEndDate],
    queryFn: () =>
      stockMovementApi.getAll(
        undefined,
        effectiveBranchId || undefined,
        undefined,
        debouncedStartDate || undefined,
        debouncedEndDate || undefined,
        1,
        1000,
      ),
    enabled: !!effectiveBranchId,
  });

  // Calcular métricas
  const metrics = useMemo(() => {
    const allMovements = allMovementsResponse?.data || [];
    
    let totalEntries = 0;
    let totalEntriesValue = 0;
    let totalExits = 0;
    let totalExitsValue = 0;

    allMovements.forEach(m => {
      if (m.type === 'ENTRY') {
        totalEntries++;
        totalEntriesValue += Number(m.totalCost || 0);
      } else {
        totalExits++;
        totalExitsValue += Number(m.totalCost || 0);
      }
    });

    return {
      totalMovements: allMovements.length,
      totalEntries,
      totalEntriesValue,
      totalExits,
      totalExitsValue,
      netValue: totalEntriesValue - totalExitsValue,
    };
  }, [allMovementsResponse]);

  const getProductData = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  // Ícone correspondente à unidade de medida
  const getUnitIcon = (unit?: string): LucideIcon => {
    if (!unit) return Package;
    const unitUpper = unit.toUpperCase();
    if (unitUpper === 'KG' || unitUpper.includes('QUILO') || unitUpper.includes('KILO')) return Weight;
    if (unitUpper === 'L' || unitUpper.includes('LITRO')) return Droplets;
    if (unitUpper === 'UN' || unitUpper.includes('UNID')) return Boxes;
    return Package;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimentações de Estoque"
        subtitle="Histórico de entradas e saídas de estoque"
        actions={
          <Link href="/stock/movements/new">
            <Button>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Nova Entrada
            </Button>
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
            title="Total de Movimentações"
            value={metrics.totalMovements}
            icon={Hash}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Entradas"
            value={`${metrics.totalEntries} (${formatCurrency(metrics.totalEntriesValue)})`}
            icon={ArrowUpRight}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Saídas"
            value={`${metrics.totalExits} (${formatCurrency(metrics.totalExitsValue)})`}
            icon={ArrowDownLeft}
            className="border-l-4 border-l-red-500"
          />
          <StatCard
            title="Valor Líquido"
            value={formatCurrency(metrics.netValue)}
            icon={DollarSign}
            className="border-l-4 border-l-blue-500"
          />
        </div>
      )}

      {/* Filtros */}
      <SectionCard title="Filtros">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="filter-product" className="text-sm text-muted-foreground mb-2 block">
              Produto
            </Label>
            <SearchableSelect
              id="filter-product"
              options={[
                { value: '', label: 'Todos os produtos' },
                ...toSelectOptions(
                  products || [],
                  (p) => p.id,
                  (p) => `${p.name}${p.code ? ` (${p.code})` : ''}`,
                ),
              ]}
              value={selectedProductId}
              onChange={(value) => setSelectedProductId(value)}
              placeholder="Todos os produtos"
              disabled={!effectiveBranchId}
            />
          </div>

          <div>
            <Label htmlFor="filter-start-date" className="text-sm text-muted-foreground mb-2 block">
              Data Inicial
            </Label>
            <Input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="filter-end-date" className="text-sm text-muted-foreground mb-2 block">
              Data Final
            </Label>
            <Input
              id="filter-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      </SectionCard>

      {/* Lista de Movimentações */}
      <SectionCard
        title="Histórico de Movimentações"
        description={movementsResponse?.total ? `${movementsResponse.total} movimentação(ões) encontrada(s)` : undefined}
        actions={
          <ExportButton<StockMovement>
            data={movementsResponse?.data || []}
            filename="movimentacoes-estoque"
            title="Histórico de Movimentações de Estoque"
            columns={[
              { key: 'productName', header: 'Produto' },
              { key: 'type', header: 'Tipo', getValue: (m) => STOCK_MOVEMENT_TYPE_LABELS[m.type as keyof typeof STOCK_MOVEMENT_TYPE_LABELS] || m.type },
              { key: 'quantity', header: 'Quantidade', getValue: (m) => formatQuantity(m.quantity, getProductData(m.productId)?.unit, { showUnit: true }) },
              { key: 'unitCost', header: 'Custo Unit.', getValue: (m) => formatCurrency(m.unitCost || 0) },
              { key: 'totalCost', header: 'Custo Total', getValue: (m) => formatCurrency(m.totalCost || 0) },
              { key: 'createdAt', header: 'Data', getValue: (m) => formatDate(m.createdAt) },
            ]}
          />
        }
      >
        {!isLoading && movements.length === 0 ? (
          <EmptyMovements />
        ) : (
          <DataTable
            data={movements}
            columns={[
              {
                key: 'createdAt',
                header: 'Data',
                render: (movement: StockMovement) => (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {formatDate(movement.createdAt)}
                    </span>
                  </div>
                ),
              },
              {
                key: 'type',
                header: 'Tipo',
                render: (movement: StockMovement) => (
                  <Badge className={`${STOCK_MOVEMENT_TYPE_BG_COLORS[movement.type]} flex items-center gap-1 w-fit`}>
                    {movement.type === 'ENTRY' ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownLeft className="h-3 w-3" />
                    )}
                    {STOCK_MOVEMENT_TYPE_LABELS[movement.type]}
                  </Badge>
                ),
              },
              {
                key: 'productId',
                header: 'Produto',
                render: (movement: StockMovement) => {
                  const product = getProductData(movement.productId);
                  const UnitIcon = getUnitIcon(product?.unit);
                  return (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <UnitIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {product?.name || 'Produto não encontrado'}
                        </p>
                        {product?.code && (
                          <p className="text-xs text-muted-foreground">{product.code}</p>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'quantity',
                header: 'Quantidade',
                render: (movement: StockMovement) => {
                  const product = getProductData(movement.productId);
                  return (
                    <span className={`font-medium ${movement.type === 'ENTRY' ? 'text-green-600' : 'text-red-600'}`}>
                      {movement.type === 'ENTRY' ? '+' : '-'}
                      {formatQuantity(movement.quantity, product?.unit, { showUnit: true })}
                    </span>
                  );
                },
                className: 'text-right',
              },
              {
                key: 'unitCost',
                header: 'Custo Unit.',
                render: (movement: StockMovement) => (
                  <span className="text-muted-foreground">
                    {movement.unitCost ? formatCurrency(movement.unitCost) : '-'}
                  </span>
                ),
                className: 'text-right',
              },
              {
                key: 'totalCost',
                header: 'Custo Total',
                render: (movement: StockMovement) => (
                  <span className="font-semibold text-foreground">
                    {movement.totalCost ? formatCurrency(Number(movement.totalCost)) : '-'}
                  </span>
                ),
                className: 'text-right',
              },
            ]}
            isLoading={isLoading}
            emptyMessage="Nenhuma movimentação encontrada"
            pagination={
              movementsResponse
                ? {
                    page: movementsResponse.page,
                    limit: movementsResponse.limit,
                    total: movementsResponse.total,
                    totalPages: movementsResponse.totalPages,
                  }
                : undefined
            }
            onPageChange={setPage}
            rowClassName={(movement: StockMovement) =>
              movement.type === 'ENTRY'
                ? 'bg-green-50/30 dark:bg-green-900/5'
                : 'bg-red-50/30 dark:bg-red-900/5'
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
