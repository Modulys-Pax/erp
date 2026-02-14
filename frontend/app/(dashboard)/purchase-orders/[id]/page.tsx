'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  purchaseOrderApi,
  type PurchaseOrder,
  type ReceivePurchaseOrderDto,
} from '@/lib/api/purchase-order';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { formatQuantity, getQuantityInputStep, normalizeQuantityByUnit } from '@/lib/utils/quantity';
import { formatDate } from '@/lib/utils/date';
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_COLORS,
  type PurchaseOrderStatus,
} from '@/lib/constants/status.constants';
import { Package, Pencil, Truck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Can } from '@/components/auth/permission-gate';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [showReceive, setShowReceive] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [createAccountPayable, setCreateAccountPayable] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => purchaseOrderApi.getById(id),
    enabled: !!id,
  });

  const receiveMutation = useMutation({
    mutationFn: (dto: ReceivePurchaseOrderDto) =>
      purchaseOrderApi.receive(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowReceive(false);
      setReceiveQuantities({});
      toastSuccess('Recebimento registrado');
    },
    onError: (e) => toastErrorFromException(e, 'Erro ao registrar recebimento'),
  });

  const openReceiveModal = () => {
    if (!order) return;
    const initial: Record<string, number> = {};
    order.items.forEach((item) => {
      const pending = item.quantity - item.quantityReceived;
      initial[item.id] = Math.max(0, pending);
    });
    setReceiveQuantities(initial);
    setCreateAccountPayable(false);
    setShowReceive(true);
  };

  const confirmReceive = () => {
    const items = Object.entries(receiveQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, quantityReceived]) => ({ itemId, quantityReceived }));
    if (items.length === 0) {
      toastErrorFromException(null, 'Informe a quantidade recebida de ao menos um item');
      return;
    }
    receiveMutation.mutate({ items, createAccountPayable });
  };

  if (isLoading || !order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pedido de compra" subtitle="Carregando..." />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const canReceive =
    order.status !== 'RECEIVED' && order.status !== 'CANCELLED';
  const hasPending = order.items.some(
    (i) => i.quantityReceived < i.quantity,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pedido ${order.number}`}
        subtitle={order.supplierName ?? 'Fornecedor'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/purchase-orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            {order.status === 'DRAFT' && (
              <Can permission="purchase-orders.update">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/purchase-orders/${id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              </Can>
            )}
            {canReceive && hasPending && (
              <Can permission="purchase-orders.receive">
                <Button size="sm" onClick={openReceiveModal}>
                  <Truck className="mr-2 h-4 w-4" />
                  Receber
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
            <p className="text-muted-foreground">Fornecedor</p>
            <p className="font-medium">{order.supplierName ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge
              className={
                PURCHASE_ORDER_STATUS_COLORS[order.status as PurchaseOrderStatus]
              }
            >
              {PURCHASE_ORDER_STATUS_LABELS[order.status as PurchaseOrderStatus]}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Data prevista</p>
            <p className="font-medium">
              {order.expectedDeliveryDate
                ? formatDate(order.expectedDeliveryDate)
                : '-'}
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
                <th className="text-right py-2 font-medium">Recebido</th>
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
                  <td className="py-2 text-right">{formatQuantity(item.quantityReceived, item.productUnit, { showUnit: true })}</td>
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

      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Informe a quantidade recebida de cada item.
          </p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {order.items.map((item) => {
              const pending = item.quantity - item.quantityReceived;
              if (pending <= 0) return null;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b pb-2"
                >
                  <Label className="flex-1 text-sm font-normal">
                    {item.productName} (pendente: {formatQuantity(pending, item.productUnit)})
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={pending}
                    step={getQuantityInputStep(item.productUnit)}
                    value={receiveQuantities[item.id] ?? ''}
                    onChange={(e) =>
                      setReceiveQuantities((prev) => ({
                        ...prev,
                        [item.id]: normalizeQuantityByUnit(e.target.value, item.productUnit),
                      }))
                    }
                    className="w-24 text-right"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createAp"
              checked={createAccountPayable}
              onCheckedChange={(v) => setCreateAccountPayable(!!v)}
            />
            <Label htmlFor="createAp" className="text-sm font-normal cursor-pointer">
              Criar conta a pagar com o valor recebido
            </Label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceive(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmReceive}
              disabled={receiveMutation.isPending}
            >
              {receiveMutation.isPending ? 'Salvando...' : 'Confirmar recebimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
