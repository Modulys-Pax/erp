'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  salesOrderApi,
  type InvoiceSalesOrderDto,
} from '@/lib/api/sales-order';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { formatQuantity } from '@/lib/utils/quantity';
import { formatDate } from '@/lib/utils/date';
import {
  SALES_ORDER_STATUS_LABELS,
  SALES_ORDER_STATUS_COLORS,
  type SalesOrderStatus,
} from '@/lib/constants/status.constants';
import { Pencil, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Can } from '@/components/auth/permission-gate';

export default function SalesOrderDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [showInvoice, setShowInvoice] = useState(false);
  const [createAccountReceivable, setCreateAccountReceivable] = useState(true);
  const [deductStock, setDeductStock] = useState(true);

  const { data: order, isLoading } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => salesOrderApi.getById(id),
    enabled: !!id,
  });

  const invoiceMutation = useMutation({
    mutationFn: (dto: InvoiceSalesOrderDto) =>
      salesOrderApi.invoice(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', id] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      setShowInvoice(false);
      toastSuccess('Pedido faturado');
    },
    onError: (e) => toastErrorFromException(e, 'Erro ao faturar pedido'),
  });

  const openInvoiceModal = () => {
    setCreateAccountReceivable(true);
    setDeductStock(true);
    setShowInvoice(true);
  };

  const confirmInvoice = () => {
    invoiceMutation.mutate({
      createAccountReceivable,
      deductStock,
    });
  };

  if (isLoading || !order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pedido de venda" subtitle="Carregando..." />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const canInvoice =
    order.status !== 'DELIVERED' && order.status !== 'CANCELLED';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pedido ${order.number}`}
        subtitle={order.customerName ?? 'Cliente'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/sales-orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            {order.status === 'DRAFT' && (
              <Can permission="sales-orders.update">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sales-orders/${id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              </Can>
            )}
            {canInvoice && (
              <Can permission="sales-orders.invoice">
                <Button size="sm" onClick={openInvoiceModal}>
                  <FileText className="mr-2 h-4 w-4" />
                  Faturar
                </Button>
              </Can>
            )}
          </div>
        }
      />

      <SectionCard title="Dados do pedido">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Número</p>
            <p className="font-medium">{order.number}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cliente</p>
            <p className="font-medium">{order.customerName ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge
              className={
                SALES_ORDER_STATUS_COLORS[order.status as SalesOrderStatus]
              }
            >
              {SALES_ORDER_STATUS_LABELS[order.status as SalesOrderStatus]}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Data do pedido</p>
            <p className="font-medium">
              {order.orderDate ? formatDate(order.orderDate) : '-'}
            </p>
          </div>
        </div>
        {order.notes && (
          <div className="mt-4">
            <p className="text-muted-foreground text-sm">Observações</p>
            <p className="text-sm">{order.notes}</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Itens">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Produto</th>
                <th className="text-right py-2 font-medium">Quantidade</th>
                <th className="text-right py-2 font-medium">Faturado</th>
                <th className="text-right py-2 font-medium">Preço un.</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">
                    {item.productName}
                    {item.productCode && (
                      <span className="text-muted-foreground ml-1">
                        ({item.productCode})
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">{formatQuantity(item.quantity, item.productUnit, { showUnit: true })}</td>
                  <td className="py-2 text-right">{formatQuantity(item.quantityInvoiced, item.productUnit, { showUnit: true })}</td>
                  <td className="py-2 text-right">
                    {item.unitPrice != null
                      ? formatCurrency(item.unitPrice)
                      : '-'}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {item.total != null ? formatCurrency(item.total) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Total: <strong>{formatCurrency(order.totalAmount ?? 0)}</strong>
        </p>
      </SectionCard>

      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Faturar pedido</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Será criada uma conta a receber com o valor do pedido e, se marcado,
            será dada baixa no estoque por item.
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createCr"
                checked={createAccountReceivable}
                onCheckedChange={(v) => setCreateAccountReceivable(!!v)}
              />
              <Label htmlFor="createCr" className="text-sm font-normal cursor-pointer">
                Criar conta a receber
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="deductStock"
                checked={deductStock}
                onCheckedChange={(v) => setDeductStock(!!v)}
              />
              <Label htmlFor="deductStock" className="text-sm font-normal cursor-pointer">
                Dar baixa no estoque
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoice(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmInvoice}
              disabled={invoiceMutation.isPending}
            >
              {invoiceMutation.isPending ? 'Faturando...' : 'Faturar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
