'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi, Product } from '@/lib/api/product';
import { formatCurrency } from '@/lib/utils/currency';
import { formatQuantity } from '@/lib/utils/quantity';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, PaginationMeta } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyProducts } from '@/components/ui/empty-state';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';
import {
  ACTIVE_STATUS_COLORS,
  getStockLevel,
  STOCK_LEVEL_COLORS,
  STOCK_LEVEL_BG_COLORS,
} from '@/lib/constants/status.constants';
import Link from 'next/link';
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
  Package,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Weight,
  Droplets,
  Boxes,
  type LucideIcon,
} from 'lucide-react';
import { ExportButton } from '@/components/ui/export-button';

// Ícone correspondente à unidade de medida
const getUnitIcon = (unit?: string): LucideIcon => {
  if (!unit) return Package;
  const unitUpper = unit.toUpperCase();
  if (unitUpper === 'KG' || unitUpper.includes('QUILO') || unitUpper.includes('KILO')) return Weight;
  if (unitUpper === 'L' || unitUpper.includes('LITRO')) return Droplets;
  if (unitUpper === 'UN' || unitUpper.includes('UNID')) return Boxes;
  return Package;
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [effectiveBranchId, queryClient]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['products', effectiveBranchId, showDeleted, page, limit],
    queryFn: () => productApi.getAll(effectiveBranchId || undefined, showDeleted, page, limit),
    enabled: true,
  });

  // Buscar todos os produtos para métricas
  const { data: allProductsResponse } = useQuery({
    queryKey: ['products-metrics', effectiveBranchId],
    queryFn: () => productApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-metrics'] });
      toastSuccess('Produto excluído com sucesso');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao excluir produto');
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      deleteMutation.mutate(id);
    }
  };

  // Calcular métricas
  const metrics = useMemo(() => {
    const products = allProductsResponse?.data || [];
    const activeProducts = products.filter(p => p.active);
    
    let lowStockCount = 0;
    let criticalStockCount = 0;
    let totalStockValue = 0;

    activeProducts.forEach(p => {
      const stock = p.totalStock ?? 0;
      const minQuantity = p.minQuantity ?? 0;
      const level = getStockLevel(stock, minQuantity);
      
      if (level === 'critical') criticalStockCount++;
      else if (level === 'low') lowStockCount++;
      
      if (p.unitPrice && stock > 0) {
        totalStockValue += stock * p.unitPrice;
      }
    });

    return {
      totalActive: activeProducts.length,
      lowStockCount,
      criticalStockCount,
      totalStockValue,
    };
  }, [allProductsResponse]);

  const columns = [
    {
      key: 'name',
      header: 'Produto',
      render: (product: Product) => {
        const stock = product.totalStock ?? 0;
        const minQuantity = product.minQuantity ?? 0;
        const level = getStockLevel(stock, minQuantity);
        const UnitIcon = getUnitIcon(product.unit);
        
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
              <p className="font-semibold text-foreground">{product.name}</p>
              {product.code && (
                <p className="text-xs text-muted-foreground">Código: {product.code}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (product: Product) => (
        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
          {product.description || '-'}
        </p>
      ),
    },
    {
      key: 'unit',
      header: 'Unidade',
      render: (product: Product) => (
        <span className="text-sm text-foreground">{product.unit || '-'}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Estoque',
      render: (product: Product) => {
        const stock = product.totalStock ?? 0;
        const minQuantity = product.minQuantity ?? 0;
        const level = getStockLevel(stock, minQuantity);
        
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {level === 'critical' && <AlertCircle className="h-4 w-4 text-red-500" />}
              {level === 'low' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              {level === 'ok' && minQuantity > 0 && <CheckCircle className="h-4 w-4 text-green-500" />}
              <span className={`text-sm font-semibold ${STOCK_LEVEL_COLORS[level]}`}>
                {formatQuantity(stock, product.unit, { showUnit: true })}
              </span>
            </div>
            {minQuantity > 0 && (
              <span className="text-xs text-muted-foreground">
                Mín: {formatQuantity(minQuantity, product.unit)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (product: Product) => (
        <Badge
          variant={product.active ? 'default' : 'secondary'}
          className={product.active ? ACTIVE_STATUS_COLORS.active : ACTIVE_STATUS_COLORS.inactive}
        >
          {product.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (product: Product) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/products/${product.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              {!product.deletedAt && (
                <DropdownMenuItem
                  onClick={() => handleDelete(product.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const pagination: PaginationMeta | undefined = response
    ? {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        subtitle="Gerencie os produtos do estoque"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleted(!showDeleted);
                setPage(1);
              }}
            >
              {showDeleted ? 'Ocultar Excluídos' : 'Mostrar Excluídos'}
            </Button>
            <Link href="/products/new">
              <Button>Novo Produto</Button>
            </Link>
          </>
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
            title="Produtos Ativos"
            value={metrics.totalActive}
            icon={Package}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Estoque Baixo"
            value={metrics.lowStockCount}
            icon={AlertTriangle}
            className="border-l-4 border-l-yellow-500"
          />
          <StatCard
            title="Estoque Crítico"
            value={metrics.criticalStockCount}
            icon={AlertCircle}
            className="border-l-4 border-l-red-500"
          />
          <StatCard
            title="Valor em Estoque"
            value={formatCurrency(metrics.totalStockValue)}
            icon={DollarSign}
            className="border-l-4 border-l-green-500"
          />
        </div>
      )}

      {/* Lista de Produtos */}
      <SectionCard
        title="Lista de Produtos"
        description={response?.total ? `${response.total} produto(s) encontrado(s)` : undefined}
        actions={
          <ExportButton<Product>
            data={response?.data || []}
            filename="produtos"
            title="Lista de Produtos"
            columns={[
              { key: 'code', header: 'Código' },
              { key: 'name', header: 'Nome' },
              { key: 'unit', header: 'Unidade' },
              { key: 'price', header: 'Preço', getValue: (p) => formatCurrency(p.price || 0) },
              { key: 'currentStock', header: 'Estoque', getValue: (p) => p.currentStock?.toString() || '0' },
              { key: 'minStock', header: 'Est. Mínimo', getValue: (p) => p.minStock?.toString() || '-' },
              { key: 'active', header: 'Status', getValue: (p) => p.active ? 'Ativo' : 'Inativo' },
            ]}
          />
        }
      >
        {!isLoading && response?.data.length === 0 ? (
          <EmptyProducts />
        ) : (
          <DataTable
            data={response?.data || []}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhum produto cadastrado"
            pagination={pagination}
            onPageChange={setPage}
            rowClassName={(product: Product) => {
              const stock = product.totalStock ?? 0;
              const minQuantity = product.minQuantity ?? 0;
              const level = getStockLevel(stock, minQuantity);
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
