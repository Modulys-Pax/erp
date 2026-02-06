'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderApi, type PurchaseOrder } from '@/lib/api/purchase-order';
import { supplierApi } from '@/lib/api/supplier';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_COLORS,
  type PurchaseOrderStatus,
} from '@/lib/constants/status.constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, Package } from 'lucide-react';
import Link from 'next/link';
import { Can } from '@/components/auth/permission-gate';
import { usePermissions } from '@/lib/contexts/permission-context';

const DEBOUNCE_MS = 400;
const LIMIT = 10;

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const { hasPermission } = usePermissions();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const debouncedStatus = useDebounce(statusFilter, DEBOUNCE_MS);
  const debouncedSupplier = useDebounce(supplierFilter, DEBOUNCE_MS);
  const debouncedStart = useDebounce(startDate, DEBOUNCE_MS);
  const debouncedEnd = useDebounce(endDate, DEBOUNCE_MS);

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveBranchId, debouncedStatus, debouncedSupplier, debouncedStart, debouncedEnd]);

  const { data, isLoading } = useQuery({
    queryKey: [
      'purchase-orders',
      effectiveBranchId,
      debouncedStatus,
      debouncedSupplier,
      debouncedStart,
      debouncedEnd,
      currentPage,
    ],
    queryFn: () =>
      purchaseOrderApi.getAll(
        effectiveBranchId ?? undefined,
        debouncedStatus || undefined,
        debouncedSupplier || undefined,
        debouncedStart || undefined,
        debouncedEnd || undefined,
        currentPage,
        LIMIT,
      ),
    enabled: !!effectiveBranchId,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', effectiveBranchId],
    queryFn: () => supplierApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
    enabled: !!effectiveBranchId,
  });
  const suppliers = suppliersData?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseOrderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toastSuccess('Pedido excluído');
    },
    onError: (e) => toastErrorFromException(e, 'Erro ao excluir pedido'),
  });

  const orders = data?.data ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos de Compra"
        subtitle="Gerencie pedidos de compra por fornecedor"
        actions={
          <Can permission="purchase-orders.create">
            <Button asChild>
              <Link href="/purchase-orders/new">
                <Plus className="mr-2 h-4 w-4" />
                Novo pedido
              </Link>
            </Button>
          </Can>
        }
      />

      <SectionCard title="Filtros">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-muted-foreground">Status</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
            >
              <option value="">Todos</option>
              {(Object.keys(PURCHASE_ORDER_STATUS_LABELS) as PurchaseOrderStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {PURCHASE_ORDER_STATUS_LABELS[s]}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <Label className="text-muted-foreground">Fornecedor</Label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
            >
              <option value="">Todos</option>
              {suppliers.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-muted-foreground">Data inicial</Label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <Label className="text-muted-foreground">Data final</Label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Listagem">
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum pedido de compra"
            description="Crie um pedido para começar."
            action={
              hasPermission('purchase-orders.create')
                ? { label: 'Novo pedido', href: '/purchase-orders/new' }
                : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Número</th>
                    <th className="text-left py-2 font-medium">Fornecedor</th>
                    <th className="text-left py-2 font-medium">Data</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row: PurchaseOrder) => (
                    <tr key={row.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 font-medium">
                        <Link
                          href={`/purchase-orders/${row.id}`}
                          className="text-primary hover:underline"
                        >
                          {row.number}
                        </Link>
                      </td>
                      <td className="py-2">{row.supplierName ?? '-'}</td>
                      <td className="py-2">{formatDate(row.createdAt)}</td>
                      <td className="py-2">
                        <Badge
                          className={
                            PURCHASE_ORDER_STATUS_COLORS[
                              row.status as PurchaseOrderStatus
                            ]
                          }
                        >
                          {PURCHASE_ORDER_STATUS_LABELS[
                            row.status as PurchaseOrderStatus
                          ]}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        {row.totalAmount != null
                          ? formatCurrency(row.totalAmount)
                          : '-'}
                      </td>
                      <td className="py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/purchase-orders/${row.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </Link>
                            </DropdownMenuItem>
                            {row.status === 'DRAFT' && (
                              <>
                                <Can permission="purchase-orders.update">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/purchase-orders/${row.id}/edit`}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                    </Link>
                                  </DropdownMenuItem>
                                </Can>
                                <Can permission="purchase-orders.delete">
                                  <DropdownMenuItem
                                    onClick={() => deleteMutation.mutate(row.id)}
                                    disabled={deleteMutation.isPending}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </Can>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Total: {total} pedido(s)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
