'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bankReconciliationApi,
  BankStatementItem,
} from '@/lib/api/bank-reconciliation';
import { financialApi } from '@/lib/api/financial';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('pt-BR');
}

export default function BankStatementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [reconcileItemId, setReconcileItemId] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemDate, setNewItemDate] = useState('');
  const [newItemAmount, setNewItemAmount] = useState<number | undefined>(undefined);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemType, setNewItemType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');

  const { data: statement, isLoading: loadingStatement } = useQuery({
    queryKey: ['bank-statement', id],
    queryFn: () => bankReconciliationApi.getStatement(id),
    enabled: !!id,
  });

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ['bank-statement-items', id],
    queryFn: () => bankReconciliationApi.getItems(id),
    enabled: !!id,
  });

  const { data: transactions } = useQuery({
    queryKey: ['financial-transactions', effectiveBranchId],
    queryFn: () => financialApi.getAll(undefined, effectiveBranchId ?? undefined),
    enabled: !!effectiveBranchId && !!reconcileItemId,
  });

  const reconcileMutation = useMutation({
    mutationFn: ({ itemId, ftId }: { itemId: string; ftId: string }) =>
      bankReconciliationApi.reconcileItem(itemId, ftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement', id] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-items', id] });
      setReconcileItemId(null);
      setSelectedTransactionId('');
      toastSuccess('Item conciliado');
    },
    onError: (e) => toastErrorFromException(e, 'Erro ao conciliar'),
  });

  const unreconcileMutation = useMutation({
    mutationFn: (itemId: string) => bankReconciliationApi.unreconcileItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-items', id] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement', id] });
      toastSuccess('Conciliação desfeita');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: () =>
      bankReconciliationApi.addItem(id, {
        transactionDate: newItemDate,
        amount: newItemAmount ?? 0,
        description: newItemDesc || undefined,
        type: newItemType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-items', id] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement', id] });
      setShowAddItem(false);
      setNewItemDate('');
      setNewItemAmount(undefined);
      setNewItemDesc('');
      toastSuccess('Item adicionado');
    },
    onError: (e) => toastErrorFromException(e, 'Erro ao adicionar item'),
  });

  const handleReconcile = () => {
    if (reconcileItemId && selectedTransactionId) {
      reconcileMutation.mutate({ itemId: reconcileItemId, ftId: selectedTransactionId });
    }
  };

  if (loadingStatement || !statement) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <SectionCard><div className="h-24 animate-pulse rounded-xl bg-muted" /></SectionCard>
      </div>
    );
  }

  const title = `${MONTHS[statement.referenceMonth - 1]}/${statement.referenceYear}`;
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Extrato ${title}`}
        subtitle={statement.description || 'Conciliação bancária'}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowAddItem(true)}>
              Adicionar item
            </Button>
            <Link href="/financial/bank-reconciliation">
              <Button variant="outline">Voltar</Button>
            </Link>
          </>
        }
      />
      <SectionCard title="Resumo">
        <p className="text-sm text-muted-foreground">
          {statement.itemCount} itens · {statement.reconciledCount} conciliados
        </p>
      </SectionCard>
      <SectionCard title="Itens do extrato">
        {loadingItems ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : !items?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum item. Clique em &quot;Adicionar item&quot; para lançar itens do extrato.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Data</th>
                  <th className="text-left py-2">Descrição</th>
                  <th className="text-right py-2">Tipo</th>
                  <th className="text-right py-2">Valor</th>
                  <th className="text-left py-2">Conciliado com</th>
                  <th className="text-right py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: BankStatementItem) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{formatDate(item.transactionDate)}</td>
                    <td className="py-2">{item.description || '—'}</td>
                    <td className="text-right py-2">
                      <Badge variant={item.type === 'CREDIT' ? 'default' : 'secondary'}>
                        {item.type === 'CREDIT' ? 'Crédito' : 'Débito'}
                      </Badge>
                    </td>
                    <td className="text-right py-2">{formatCurrency(item.amount)}</td>
                    <td className="py-2">
                      {item.reconciled ? (
                        <span className="text-green-600">{item.financialTransactionDescription || 'Transação'}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-right py-2">
                      {item.reconciled ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unreconcileMutation.mutate(item.id)}
                          disabled={unreconcileMutation.isPending}
                        >
                          Desfazer
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReconcileItemId(item.id)}
                        >
                          Conciliar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Dialog open={!!reconcileItemId} onOpenChange={() => setReconcileItemId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conciliar com transação</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-sm">Transação financeira</Label>
            <select
              value={selectedTransactionId}
              onChange={(e) => setSelectedTransactionId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {transactions?.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatDate(t.transactionDate.toString())} - {t.description || 'Sem descrição'} - {formatCurrency(t.amount)}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileItemId(null)}>Cancelar</Button>
            <Button onClick={handleReconcile} disabled={!selectedTransactionId || reconcileMutation.isPending}>
              Conciliar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar item ao extrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={newItemDate}
                onChange={(e) => setNewItemDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Valor *</Label>
              <CurrencyInput
                placeholder="0,00"
                value={newItemAmount}
                onChange={(value) => setNewItemAmount(value ?? undefined)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo *</Label>
              <select
                value={newItemType}
                onChange={(e) => setNewItemType(e.target.value as 'CREDIT' | 'DEBIT')}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="CREDIT">Crédito</option>
                <option value="DEBIT">Débito</option>
              </select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancelar</Button>
            <Button
              onClick={() => addItemMutation.mutate()}
              disabled={!newItemDate || (newItemAmount ?? 0) <= 0 || addItemMutation.isPending}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
