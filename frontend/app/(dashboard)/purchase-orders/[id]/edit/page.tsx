'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  purchaseOrderApi,
  type UpdatePurchaseOrderDto,
  type CreatePurchaseOrderItemDto,
} from '@/lib/api/purchase-order';
import { supplierApi } from '@/lib/api/supplier';
import { productApi } from '@/lib/api/product';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { getQuantityInputStep, normalizeQuantityByUnit } from '@/lib/utils/quantity';
import { Plus, Trash2 } from 'lucide-react';
import { Can } from '@/components/auth/permission-gate';

interface ItemRow {
  id: string;
  productId: string;
  quantity: number;
  unitPrice?: number;
}

function newItemRow(poItem?: { productId: string; quantity: number; unitPrice?: number }): ItemRow {
  return {
    id: crypto.randomUUID(),
    productId: poItem?.productId ?? '',
    quantity: poItem?.quantity ?? 0,
    unitPrice: poItem?.unitPrice,
  };
}

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const { branchId: effectiveBranchId } = useEffectiveBranch();

  const [supplierId, setSupplierId] = React.useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState<string>('');
  const [items, setItems] = React.useState<ItemRow[]>([]);

  const { data: order, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => purchaseOrderApi.getById(id),
    enabled: !!id,
  });

  const { data: suppliersRes } = useQuery({
    queryKey: ['suppliers', effectiveBranchId],
    queryFn: () => supplierApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
    enabled: !!effectiveBranchId,
  });
  const { data: productsRes } = useQuery({
    queryKey: ['products', effectiveBranchId],
    queryFn: () => productApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
    enabled: !!effectiveBranchId,
  });
  const suppliers = suppliersRes?.data ?? [];
  const products = productsRes?.data ?? [];

  React.useEffect(() => {
    if (order) {
      setSupplierId(order.supplierId);
      setExpectedDeliveryDate(
        order.expectedDeliveryDate
          ? new Date(order.expectedDeliveryDate).toISOString().slice(0, 10)
          : '',
      );
      setNotes(order.notes ?? '');
      setStatus(order.status);
      setItems(
        order.items.length > 0
          ? order.items.map((i) =>
              newItemRow({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
              }),
            )
          : [newItemRow()],
      );
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdatePurchaseOrderDto) =>
      purchaseOrderApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toastSuccess('Pedido atualizado');
      router.push(`/purchase-orders/${id}`);
    },
    onError: (e) => toastErrorFromException(e, 'Erro ao atualizar pedido'),
  });

  const addItem = () => setItems((prev) => [...prev, newItemRow()]);
  const removeItem = (rowId: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.id !== rowId)));
  };
  const updateItem = (rowId: string, field: keyof ItemRow, value: string | number | undefined) => {
    setItems((prev) =>
      prev.map((i) => (i.id === rowId ? { ...i, [field]: value } : i)),
    );
  };

  const validItems = items.filter(
    (i) => i.productId && i.quantity > 0,
  ) as (ItemRow & { productId: string; quantity: number })[];
  const totalAmount = validItems.reduce(
    (s, i) => s + i.quantity * (i.unitPrice ?? 0),
    0,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toastErrorFromException(null, 'Selecione o fornecedor');
      return;
    }
    if (validItems.length === 0) {
      toastErrorFromException(null, 'Adicione ao menos um item com quantidade maior que zero');
      return;
    }
    const dto: UpdatePurchaseOrderDto = {
      supplierId,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      notes: notes || undefined,
      status: status || undefined,
      items: validItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    };
    updateMutation.mutate(dto);
  };

  if (isLoading || !order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar pedido" subtitle="Carregando..." />
      </div>
    );
  }

  if (order.status !== 'DRAFT') {
    return (
      <div className="space-y-6">
        <PageHeader title="Editar pedido" subtitle="Apenas pedidos em rascunho podem ser editados." />
        <SectionCard title="Status">
          <p className="text-sm text-muted-foreground">
            Este pedido está com status &quot;{order.status}&quot;. Para alterar itens ou dados, o pedido precisa estar em Rascunho.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.push(`/purchase-orders/${id}`)}>
            Voltar ao pedido
          </Button>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar pedido ${order.number}`}
        subtitle="Altere os dados do pedido (apenas rascunho)"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard title="Dados do pedido">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Fornecedor *</Label>
              <SearchableSelect
                options={toSelectOptions(
                  suppliers.filter((s) => s.active),
                  (s) => s.id,
                  (s) => s.name,
                )}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Selecione o fornecedor"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data prevista de entrega</Label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="mt-4">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="DRAFT">Rascunho</option>
              <option value="SENT">Enviado</option>
            </select>
          </div>
          <div className="mt-4">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Itens"
          action={
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar item
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Produto *</th>
                  <th className="text-right py-2 font-medium w-28">Qtd *</th>
                  <th className="text-right py-2 font-medium w-36">Preço un.</th>
                  <th className="text-right py-2 font-medium w-32">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const total =
                    row.quantity > 0
                      ? row.quantity * (row.unitPrice ?? 0)
                      : 0;
                  return (
                    <tr key={row.id} className="border-b">
                      <td className="py-2">
                        <SearchableSelect
                          options={[
                            { value: '', label: 'Selecione' },
                            ...toSelectOptions(
                              products.filter((p) => p.active),
                              (p) => p.id,
                              (p) => `${p.code || p.name} - ${p.name}`,
                            ),
                          ]}
                          value={row.productId}
                          onChange={(v) => updateItem(row.id, 'productId', v)}
                          placeholder="Produto"
                          className="min-w-[200px]"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          step={getQuantityInputStep(products.find((p) => p.id === row.productId)?.unit)}
                          value={row.quantity || ''}
                          onChange={(e) =>
                            updateItem(
                              row.id,
                              'quantity',
                              normalizeQuantityByUnit(e.target.value, products.find((p) => p.id === row.productId)?.unit),
                            )
                          }
                          className="text-right w-24 ml-auto"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <CurrencyInput
                          placeholder="0,00"
                          value={row.unitPrice}
                          onChange={(v) => updateItem(row.id, 'unitPrice', v ?? undefined)}
                          className="text-right"
                        />
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(total)}
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(row.id)}
                          disabled={items.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total do pedido: <strong>{formatCurrency(totalAmount)}</strong>
          </p>
        </SectionCard>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Can permission="purchase-orders.update">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </Can>
        </div>
      </form>
    </div>
  );
}
