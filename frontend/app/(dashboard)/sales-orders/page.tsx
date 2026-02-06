'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesOrderApi, type SalesOrder } from '@/lib/api/sales-order';
import { customerApi } from '@/lib/api/customer';
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
  SALES_ORDER_STATUS_LABELS,
  SALES_ORDER_STATUS_COLORS,
  type SalesOrderStatus,
} from '@/lib/constants/status.constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Can } from '@/components/auth/permission-gate';

const DEBOUNCE_MS = 400;
const LIMIT = 10;

export default function SalesOrdersPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const debouncedStatus = useDebounce(statusFilter, DEBOUNCE_MS);
  const debouncedCustomer = useDebounce(customerFilter, DEBOUNCE_MS);
  const debouncedStart = useDebounce(startDate, DEBOUNCE_MS);
  const debouncedEnd = useDebounce(endDate, DEBOUNCE_MS);

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveBranchId, debouncedStatus, debouncedCustomer, debouncedStart, debouncedEnd]);

  const { data, isLoading } = useQuery({
    queryKey: [
      'sales-orders',
      effectiveBranchId,
      debouncedStatus,
      debouncedCustomer,
      debouncedStart,
      debouncedEnd,
      currentPage,
    ],
    queryFn: () =>
      salesOrderApi.getAll(
        effectiveBranchId ?? undefined,
        debouncedStatus || undefined,
        debouncedCustomer || undefined,
        debouncedStart || undefined,
        debouncedEnd || undefined,
        currentPage,
        LIMIT,
      ),
    enabled: !!effectiveBranchId,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', effectiveBranchId],
    queryFn: () => customerApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
    enabled: !!effectiveBranchId,
  });
  const customers = customersData?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesOrderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
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
        title="Pedidos de Venda"
        subtitle="Gerencie pedidos de venda por cliente"
        actions={
          <Can permission="sales-orders.create">
            <Button asChild>
              <Link href="/sales-orders/new">
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
              {(Object.keys(SALES_ORDER_STATUS_LABELS) as SalesOrderStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {SALES_ORDER_STATUS_LABELS[s]}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <Label className="text-muted-foreground">Cliente</Label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[200px]"
            >
              <option value="">Todos</option>
              {customers.filter((c) => c.active).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
            icon={ShoppingBag}
            title="Nenhum pedido de venda"
            description="Crie um pedido para começar."
            action={
              <Can permission="sales-orders.create">
                <Button asChild>
                  <Link href="/sales-orders/new">Novo pedido</Link>
                </Button>
              </Can>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Número</th>
                    <th className="text-left py-2 font-medium">Cliente</th>
                    <th className="text-left py-2 font-medium">Data</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row: SalesOrder) => (
                    <tr key={row.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 font-medium">
                        <Link
                          href={`/sales-orders/${row.id}`}
                          className="text-primary hover:underline"
                        >
                          {row.number}
                        </Link>
                      </td>
                      <td className="py-2">{row.customerName ?? '-'}</td>
                      <td className="py-2">{formatDate(row.createdAt)}</td>
                      <td className="py-2">
                        <Badge
                          className={
                            SALES_ORDER_STATUS_COLORS[
                              row.status as SalesOrderStatus
                            ]
                          }
                        >
                          {SALES_ORDER_STATUS_LABELS[
                            row.status as SalesOrderStatus
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
                              <Link href={`/sales-orders/${row.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </Link>
                            </DropdownMenuItem>
                            {row.status === 'DRAFT' && (
                              <>
                                <Can permission="sales-orders.update">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/sales-orders/${row.id}/edit`}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                    </Link>
                                  </DropdownMenuItem>
                                </Can>
                                <Can permission="sales-orders.delete">
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
