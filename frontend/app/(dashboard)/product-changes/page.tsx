'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { maintenanceLabelApi, MaintenanceLabel } from '@/lib/api/maintenance-label';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils/date';
import {
  Plus,
  Truck,
  MapPinned,
  Package,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

export default function ProductChangesPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { data: labelsResponse, isLoading } = useQuery({
    queryKey: ['maintenanceLabels', effectiveBranchId, currentPage, limit],
    queryFn: () =>
      maintenanceLabelApi.getAll(
        effectiveBranchId || undefined,
        undefined,
        currentPage,
        limit,
      ),
  });

  const labels = labelsResponse?.data || [];
  const total = labelsResponse?.total || 0;
  const totalPages = labelsResponse?.totalPages || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveBranchId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registros na Estrada"
        subtitle="Histórico de trocas de itens realizadas na estrada"
        actions={
          <Link href="/product-changes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Registro
            </Button>
          </Link>
        }
      />

      <SectionCard
        title="Registros de Troca"
        description={total > 0 ? `${total} registro(s)` : undefined}
      >
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : labels.length === 0 ? (
          <EmptyState
            icon={MapPinned}
            title="Nenhum registro encontrado"
            description="Registre as trocas de itens realizadas na estrada."
            action={{
              label: 'Novo Registro',
              href: '/product-changes/new',
            }}
          />
        ) : (
          <DataTable
            data={labels}
            isLoading={isLoading}
            emptyMessage="Nenhum registro encontrado"
            pagination={
              totalPages > 1
                ? {
                    page: currentPage,
                    limit,
                    total,
                    totalPages,
                  }
                : undefined
            }
            onPageChange={setCurrentPage}
            columns={[
              {
                key: 'vehicle',
                header: 'Veículo',
                render: (label) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Link
                        href={`/vehicles/${label.vehicleId}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {label.vehiclePlate}
                      </Link>
                    </div>
                  </div>
                ),
              },
              {
                key: 'products',
                header: 'Itens Trocados',
                render: (label) => (
                  <div className="flex flex-wrap gap-1">
                    {label.products.slice(0, 3).map((product) => (
                      <Badge
                        key={product.id}
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        <Package className="h-3 w-3 mr-1" />
                        {product.productName}
                      </Badge>
                    ))}
                    {label.products.length > 3 && (
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-800 dark:!bg-gray-800 dark:!text-gray-100 border-gray-200 dark:border-gray-700"
                      >
                        +{label.products.length - 3}
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                key: 'km',
                header: 'KM da Troca',
                render: (label) => {
                  const firstProduct = label.products[0];
                  if (!firstProduct) return '-';
                  return (
                    <span className="font-medium">
                      {firstProduct.lastChangeKm.toLocaleString('pt-BR')} km
                    </span>
                  );
                },
              },
              {
                key: 'nextKm',
                header: 'Próxima Troca',
                render: (label) => {
                  const firstProduct = label.products[0];
                  if (!firstProduct) return '-';
                  return (
                    <span className="text-muted-foreground">
                      {firstProduct.nextChangeKm.toLocaleString('pt-BR')} km
                    </span>
                  );
                },
              },
              {
                key: 'createdAt',
                header: 'Data do Registro',
                render: (label) => formatDate(label.createdAt),
              },
              {
                key: 'actions',
                header: 'Ações',
                className: 'text-right',
                render: (label) => (
                  <div className="flex justify-end">
                    <Link href={`/maintenance-labels/${label.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </Link>
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
