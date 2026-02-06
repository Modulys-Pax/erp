'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  salesOrderApi,
  type UpdateSalesOrderDto,
} from '@/lib/api/sales-order';
import { customerApi } from '@/lib/api/customer';
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
import { Plus, Trash2 } from 'lucide-react';
import { Can } from '@/components/auth/permission-gate';

interface ItemRow {
  id: string;
  productId: string;
  quantity: number;
  unitPrice?: number;
}

function newItemRow(soItem?: {
  productId: string;
  quantity: number;
  unitPrice?: number;
}): ItemRow {
  return {
    id: crypto.randomUUID(),
    productId: soItem?.productId ?? '',
    quantity: soItem?.quantity ?? 0,
    unitPrice: soItem?.unitPrice,
  };
}

export default function EditSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const { branchId: effectiveBranchId } = useEffectiveBranch();

  const [customerId, setCustomerId] = React.useState('');
  const [orderDate, setOrderDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState<string>('');
  const [items, setItems] = React.useState<ItemRow[]>([]);

  const { data: order, isLoading } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => salesOrderApi.getById(id),
    enabled: !!id,
  });

  const { data: customersRes } = useQuery({
    queryKey: ['customers', effectiveBranchId],
    queryFn: () => customerApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
    enabled: !!effectiveBranchId,
  });
  const { data: productsRes } = useQuery({
    queryKey: ['products', effectiveBranchId],
    queryFn: () => productApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
    enabled: !!effectiveBranchId,
  });
  const customers = customersRes?.data ?? [];
  const products = productsRes?.data ?? [];

  React.useEffect(() => {
    if (order) {
      setCustomerId(order.customerId);
      setOrderDate(
        order.orderDate
          ? new Date(order.orderDate).toISOString().slice(0, 10)
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
    mutationFn: (data: UpdateSalesOrderDto) =>
      salesOrderApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', id] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toastSuccess('Pedido atualizado');
      router.push(`/sales-orders/${id}`);
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
    if (!customerId) {
      toastErrorFromException(null, 'Selecione o cliente');
      return;
    }
    if (validItems.length === 0) {
      toastErrorFromException(null, 'Adicione ao menos um item com quantidade maior que zero');
      return;
    }
    const dto: UpdateSalesOrderDto = {
      customerId,
      orderDate: orderDate || undefined,
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
        <PageHeader
          title="Editar pedido"
          subtitle="Apenas pedidos em rascunho podem ser editados."
        />
        <SectionCard title="Status">
          <p className="text-sm text-muted-foreground">
            Este pedido está com status &quot;{order.status}&quot;. Para alterar itens ou dados, o pedido precisa estar em Rascunho.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(`/sales-orders/${id}`)}
          >
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
              <Label>Cliente *</Label>
              <SearchableSelect
                options={toSelectOptions(
                  customers.filter((c) => c.active),
                  (c) => c.id,
                  (c) => c.name,
                )}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Selecione o cliente"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data do pedido</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
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
              <option value="CONFIRMED">Confirmado</option>
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
                          step="0.01"
                          value={row.quantity || ''}
                          onChange={(e) =>
                            updateItem(
                              row.id,
                              'quantity',
                              parseFloat(e.target.value) || 0,
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
          <Can permission="sales-orders.update">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </Can>
        </div>
      </form>
    </div>
  );
}
