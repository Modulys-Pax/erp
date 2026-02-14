'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { stockApi, Stock } from '@/lib/api/stock';
import { formatCurrency } from '@/lib/utils/currency';
import { formatQuantity } from '@/lib/utils/quantity';
import { productApi, Product } from '@/lib/api/product';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyStock } from '@/components/ui/empty-state';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import {
  getStockLevel,
  STOCK_LEVEL_COLORS,
} from '@/lib/constants/status.constants';
import {
  Package,
  DollarSign,
  AlertCircle,
  Warehouse,
  ArrowUpRight,
  Weight,
  Droplets,
  Boxes,
  type LucideIcon,
} from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';

const DEBOUNCE_MS = 500;

export default function StockPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const debouncedProductId = useDebounce(selectedProductId, DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['stocks'] });
  }, [effectiveBranchId, debouncedProductId, queryClient]);

  const { data: productsResponse } = useQuery({
    queryKey: ['products', effectiveBranchId],
    queryFn: () => productApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
    enabled: !!effectiveBranchId,
  });

  const products = productsResponse?.data || [];

  const { data: stocksResponse, isLoading } = useQuery({
    queryKey: ['stocks', effectiveBranchId, debouncedProductId, page, limit],
    queryFn: () =>
      stockApi.getAll(
        undefined,
        effectiveBranchId || undefined,
        undefined,
        debouncedProductId || undefined,
        page,
        limit,
      ),
    enabled: !!effectiveBranchId,
  });

  const stocks = stocksResponse?.data || [];

  // Buscar todos os estoques para métricas
  const { data: allStocksResponse } = useQuery({
    queryKey: ['stocks-metrics', effectiveBranchId],
    queryFn: () => stockApi.getAll(undefined, effectiveBranchId || undefined, undefined, undefined, 1, 1000),
    enabled: !!effectiveBranchId,
  });

  // Calcular métricas
  const metrics = useMemo(() => {
    const allStocks = allStocksResponse?.data || [];
    
    let totalItems = 0;
    let totalValue = 0;
    let criticalCount = 0;

    allStocks.forEach(stock => {
      totalItems += stock.quantity;
      totalValue += stock.quantity * stock.averageCost;
      
      // Encontrar produto para verificar minQuantity
      const product = products.find(p => p.id === stock.productId);
      if (product) {
        const level = getStockLevel(stock.quantity, product.minQuantity ?? 0);
        if (level === 'critical') criticalCount++;
      }
    });

    return {
      totalItems,
      totalValue,
      totalProducts: allStocks.length,
      criticalCount,
    };
  }, [allStocksResponse, products]);


  // Função para obter dados do produto
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
        title="Estoque"
        subtitle="Consulte e gerencie o estoque de produtos"
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
            title="Produtos em Estoque"
            value={metrics.totalProducts}
            icon={Package}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Itens em estoque"
            value={metrics.totalProducts}
            icon={Warehouse}
            className="border-l-4 border-l-blue-500"
          />
          <StatCard
            title="Valor Total"
            value={formatCurrency(metrics.totalValue)}
            icon={DollarSign}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Estoque Crítico"
            value={metrics.criticalCount}
            icon={AlertCircle}
            className="border-l-4 border-l-red-500"
          />
        </div>
      )}

      {/* Filtros */}
      <SectionCard title="Filtros">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Filtrar por Produto
            </Label>
            <SearchableSelect
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
        </div>
      </SectionCard>

      {/* Lista de Estoque */}
      <SectionCard
        title="Posição de Estoque"
        description={stocksResponse?.total ? `${stocksResponse.total} item(ns) em estoque` : undefined}
        actions={
          <ExportButton<Stock>
            data={stocks}
            filename="posicao-estoque"
            title="Posição de Estoque"
            columns={[
              { key: 'product.name', header: 'Produto', getValue: (s) => getProductData(s.productId)?.name || s.productId },
              { key: 'product.code', header: 'Código', getValue: (s) => getProductData(s.productId)?.code || '' },
              { key: 'quantity', header: 'Quantidade', getValue: (s) => formatQuantity(Number(s.quantity), getProductData(s.productId)?.unit, { showUnit: true }) },
              { key: 'averageCost', header: 'Custo Médio', getValue: (s) => formatCurrency(Number(s.averageCost || 0)) },
              { key: 'totalValue', header: 'Valor Total', getValue: (s) => formatCurrency(Number(s.quantity) * Number(s.averageCost || 0)) },
            ]}
          />
        }
      >
        {!isLoading && stocks.length === 0 ? (
          <EmptyStock />
        ) : (
          <DataTable
            data={stocks}
            columns={[
              {
                key: 'product',
                header: 'Produto',
                render: (stock: Stock) => {
                  const product = getProductData(stock.productId);
                  const level = product ? getStockLevel(stock.quantity, product.minQuantity ?? 0) : 'ok';
                  const UnitIcon = getUnitIcon(product?.unit);
                  
                  return (
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        level === 'critical' ? 'bg-red-100 dark:bg-red-900/30' :
                        level === 'low' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                        'bg-primary/10'
                      }`}>
                        <UnitIcon className={`h-5 w-5 ${STOCK_LEVEL_COLORS[level]}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {product?.name || 'Produto não encontrado'}
                        </p>
                        {product?.code && (
                          <p className="text-xs text-muted-foreground">Código: {product.code}</p>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'quantity',
                header: 'Quantidade',
                render: (stock: Stock) => {
                  const product = getProductData(stock.productId);
                  const level = product ? getStockLevel(stock.quantity, product.minQuantity ?? 0) : 'ok';
                  
                  return (
                    <div>
                      <span className={`font-semibold ${STOCK_LEVEL_COLORS[level]}`}>
                        {formatQuantity(stock.quantity, product?.unit, { showUnit: true })}
                      </span>
                      {product?.minQuantity != null && Number(product.minQuantity) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Mín: {formatQuantity(product.minQuantity, product?.unit)}
                        </p>
                      )}
                    </div>
                  );
                },
                className: 'text-right',
              },
              {
                key: 'averageCost',
                header: 'Custo Médio',
                render: (stock: Stock) => (
                  <span className="text-foreground font-medium">
                    {formatCurrency(stock.averageCost)}
                  </span>
                ),
                className: 'text-right',
              },
              {
                key: 'totalValue',
                header: 'Valor Total',
                render: (stock: Stock) => (
                  <span className="font-semibold text-foreground">
                    {formatCurrency(stock.quantity * stock.averageCost)}
                  </span>
                ),
                className: 'text-right',
              },
            ]}
            isLoading={isLoading}
            emptyMessage="Nenhum estoque encontrado"
            pagination={
              stocksResponse
                ? {
                    page: stocksResponse.page,
                    limit: stocksResponse.limit,
                    total: stocksResponse.total,
                    totalPages: stocksResponse.totalPages,
                  }
                : undefined
            }
            onPageChange={setPage}
            rowClassName={(stock: Stock) => {
              const product = getProductData(stock.productId);
              if (!product) return undefined;
              const level = getStockLevel(stock.quantity, product.minQuantity ?? 0);
              if (level === 'critical') return 'bg-red-50/50 dark:bg-red-900/10 border-l-2 border-l-red-500';
              if (level === 'low') return 'bg-yellow-50/50 dark:bg-yellow-900/10 border-l-2 border-l-yellow-500';
              return undefined;
            }}
          />
        )}
      </SectionCard>
    </div>
  );
}
