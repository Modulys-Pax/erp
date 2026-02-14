'use client';

import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api/product';
import { formatCurrency } from '@/lib/utils/currency';
import { formatQuantity } from '@/lib/utils/quantity';
import { branchApi } from '@/lib/api/branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  Package,
  TrendingUp,
  BarChart3,
  Calendar,
  Weight,
  Droplets,
  Boxes,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';

export default function ProductSummaryPage() {
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Usar a filial efetiva do contexto (já considera admin vs não-admin)
  const filterBranchId = effectiveBranchId || undefined;

  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
  });

  const branches = branchesResponse?.data || [];

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['product-summary', filterBranchId, startDate, endDate, currentPage],
    queryFn: () =>
      productApi.getSummary(
        filterBranchId,
        startDate || undefined,
        endDate || undefined,
        currentPage,
        limit,
      ),
  });

  // Resetar página quando a filial ou filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveBranchId, startDate, endDate]);

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
  };

  /** Nome amigável da unidade de medida para exibição */
  const unitDisplayName = (code: string): string => {
    const map: Record<string, string> = {
      L: 'Litros',
      KG: 'Quilogramas',
      UN: 'Unidades',
      M: 'Metros',
      M2: 'm²',
      M3: 'm³',
    };
    return map[code] ?? code;
  };

  /** Ícone correspondente à unidade de medida */
  const unitIcon = (code: string): LucideIcon => {
    const map: Record<string, LucideIcon> = {
      KG: Weight,
      L: Droplets,
      UN: Boxes,
    };
    return map[code] ?? Package;
  };

  /** Formata lista de quantidades por unidade para exibição */
  const formatQuantityByUnit = (items: { unit: string; totalQuantity: number }[]) => {
    if (!items?.length) return '—';
    return items
      .map(({ unit, totalQuantity }) => formatQuantity(totalQuantity, unit, { showUnit: true }))
      .join(' · ');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumo de Produtos"
        subtitle="Estatísticas detalhadas de produtos usados em manutenções"
      />

      {/* Filtros de Período */}
      <SectionCard title="Filtros">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Data Inicial
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Data Final
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </SectionCard>

      {/* Métricas Principais */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : summaryData ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Custo Total"
              value={formatCurrency(summaryData.totalCost)}
              icon={DollarSign}
            />
            <StatCard
              title="Produtos Diferentes"
              value={summaryData.totalProducts}
              icon={BarChart3}
            />
            <StatCard
              title="Total de Usos"
              value={summaryData.totalUsages}
              icon={TrendingUp}
            />
          </div>

          {/* Totais por unidade de medida */}
          {summaryData.totalQuantityByUnit && summaryData.totalQuantityByUnit.length > 0 && (
            <SectionCard title="Quantidade usada por unidade de medida">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {summaryData.totalQuantityByUnit.map(({ unit, totalQuantity }) => {
                  const UnitIcon = unitIcon(unit);
                  return (
                    <div
                      key={unit}
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
                    >
                      <UnitIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {unitDisplayName(unit)}
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {formatNumber(totalQuantity)} {unit}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Estatísticas por Período */}
          {summaryData.periods && summaryData.periods.length > 0 && (
            <SectionCard title="Estatísticas por Período">
              <DataTable
                data={summaryData.periods}
                columns={[
                  {
                    key: 'period',
                    header: 'Período',
                    render: (period) => (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {formatPeriod(period.period)}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'productsCount',
                    header: 'Produtos Diferentes',
                    render: (period) => (
                      <span className="text-foreground">
                        {period.productsCount}
                      </span>
                    ),
                    className: 'text-right',
                  },
                  {
                    key: 'totalQuantityByUnit',
                    header: 'Quantidade por unidade',
                    render: (period) => (
                      <span className="text-foreground text-sm">
                        {formatQuantityByUnit(period.totalQuantityByUnit ?? [])}
                      </span>
                    ),
                  },
                  {
                    key: 'totalCost',
                    header: 'Custo Total',
                    render: (period) => (
                      <span className="font-semibold text-foreground">
                        {formatCurrency(period.totalCost)}
                      </span>
                    ),
                    className: 'text-right',
                  },
                ]}
                isLoading={isLoading}
                emptyMessage="Nenhum período encontrado"
              />
            </SectionCard>
          )}

          {/* Lista de Produtos */}
          <SectionCard title="Produtos Mais Usados">
            <DataTable
              data={summaryData.products.data}
              pagination={
                summaryData.products.totalPages > 1
                  ? {
                      page: summaryData.products.page,
                      limit: summaryData.products.limit,
                      total: summaryData.products.total,
                      totalPages: summaryData.products.totalPages,
                    }
                  : undefined
              }
              onPageChange={(page) => setCurrentPage(page)}
              columns={[
                {
                  key: 'productName',
                  header: 'Produto',
                  render: (product) => (
                    <div>
                      <div className="font-medium text-foreground">
                        {product.productName}
                      </div>
                      {product.unit && (
                        <div className="text-xs text-muted-foreground">
                          Unidade: {product.unit}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'usageCount',
                  header: 'Nº de Usos',
                  render: (product) => (
                    <span className="text-foreground">
                      {formatQuantity(product.usageCount, 'UN')}
                    </span>
                  ),
                  className: 'text-right',
                },
                {
                  key: 'totalQuantityUsed',
                  header: 'Quantidade Total',
                  render: (product) => (
                    <span className="text-foreground">
                      {formatQuantity(product.totalQuantityUsed, product.unit, { showUnit: true })}
                    </span>
                  ),
                  className: 'text-right',
                },
                {
                  key: 'averageUnitCost',
                  header: 'Custo Médio Unitário',
                  render: (product) => (
                    <span className="text-muted-foreground">
                      {formatCurrency(product.averageUnitCost)}
                    </span>
                  ),
                  className: 'text-right',
                },
                {
                  key: 'totalCost',
                  header: 'Custo Total',
                  render: (product) => (
                    <span className="font-semibold text-foreground">
                      {formatCurrency(product.totalCost)}
                    </span>
                  ),
                  className: 'text-right',
                },
                {
                  key: 'periodCost',
                  header: 'Custo no Período',
                  render: (product) => (
                    <span className="text-muted-foreground">
                      {formatCurrency(product.periodCost)}
                    </span>
                  ),
                  className: 'text-right',
                },
              ]}
              isLoading={isLoading}
              emptyMessage="Nenhum produto encontrado"
            />
          </SectionCard>
        </>
      ) : (
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum dado disponível
          </p>
        </SectionCard>
      )}
    </div>
  );
}
