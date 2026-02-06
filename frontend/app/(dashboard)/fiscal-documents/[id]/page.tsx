'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fiscalDocumentApi,
  UpdateFiscalDocumentDto,
  FiscalDocumentType,
  FiscalDocumentStatus,
} from '@/lib/api/fiscal-document';
import { supplierApi } from '@/lib/api/supplier';
import { customerApi } from '@/lib/api/customer';
import { accountPayableApi } from '@/lib/api/account-payable';
import { accountReceivableApi } from '@/lib/api/account-receivable';
import { financialApi } from '@/lib/api/financial';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';

const schema = z.object({
  type: z.enum(['ENTRY', 'EXIT']),
  number: z.string().min(1, 'Número é obrigatório'),
  series: z.string().optional(),
  issueDate: z.string().min(1, 'Data de emissão é obrigatória'),
  totalAmount: z.number().min(0, 'Valor deve ser maior ou igual a zero'),
  status: z.enum(['REGISTERED', 'CANCELLED']),
  supplierId: z.string().uuid().optional().or(z.literal('')),
  customerId: z.string().uuid().optional().or(z.literal('')),
  accountPayableId: z.string().uuid().optional().or(z.literal('')),
  accountReceivableId: z.string().uuid().optional().or(z.literal('')),
  financialTransactionId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditFiscalDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: doc, isLoading } = useQuery({
    queryKey: ['fiscal-documents', id],
    queryFn: () => fiscalDocumentApi.getById(id),
    enabled: !!id,
  });

  const branchIdForLists = doc?.branchId;
  const { data: suppliersResponse } = useQuery({
    queryKey: ['suppliers', branchIdForLists],
    queryFn: () => supplierApi.getAll(branchIdForLists ?? undefined, false, 1, 500),
    enabled: !!branchIdForLists,
  });
  const { data: customersResponse } = useQuery({
    queryKey: ['customers', branchIdForLists],
    queryFn: () => customerApi.getAll(branchIdForLists ?? undefined, false, 1, 500),
    enabled: !!branchIdForLists,
  });
  const { data: accountsPayable } = useQuery({
    queryKey: ['accounts-payable', branchIdForLists],
    queryFn: () =>
      accountPayableApi.getAll(DEFAULT_COMPANY_ID, branchIdForLists ?? undefined, undefined),
    enabled: !!branchIdForLists,
  });
  const { data: accountsReceivable } = useQuery({
    queryKey: ['accounts-receivable', branchIdForLists],
    queryFn: () =>
      accountReceivableApi.getAll(DEFAULT_COMPANY_ID, branchIdForLists ?? undefined, undefined),
    enabled: !!branchIdForLists,
  });
  const { data: transactions } = useQuery({
    queryKey: ['financial-transactions', branchIdForLists],
    queryFn: () => financialApi.getAll(DEFAULT_COMPANY_ID, branchIdForLists ?? undefined),
    enabled: !!branchIdForLists,
  });

  const suppliers = suppliersResponse?.data ?? [];
  const customers = customersResponse?.data ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  React.useEffect(() => {
    if (!doc) return;
    reset({
      type: doc.type as 'ENTRY' | 'EXIT',
      number: doc.number,
      series: doc.series ?? '',
      issueDate: new Date(doc.issueDate).toISOString().split('T')[0],
      totalAmount: Number(doc.totalAmount),
      status: doc.status as 'REGISTERED' | 'CANCELLED',
      supplierId: doc.supplierId ?? '',
      customerId: doc.customerId ?? '',
      accountPayableId: doc.accountPayableId ?? '',
      accountReceivableId: doc.accountReceivableId ?? '',
      financialTransactionId: doc.financialTransactionId ?? '',
      notes: doc.notes ?? '',
    });
  }, [doc, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateFiscalDocumentDto) => fiscalDocumentApi.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      toastSuccess('Documento fiscal atualizado com sucesso');
      router.push('/fiscal-documents');
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate({
      type: data.type as FiscalDocumentType,
      number: data.number.trim(),
      series: data.series?.trim() || undefined,
      issueDate: data.issueDate,
      totalAmount: data.totalAmount,
      status: data.status as FiscalDocumentStatus,
      supplierId: data.supplierId || undefined,
      customerId: data.customerId || undefined,
      accountPayableId: data.accountPayableId || undefined,
      accountReceivableId: data.accountReceivableId || undefined,
      financialTransactionId: data.financialTransactionId || undefined,
      notes: data.notes?.trim() || undefined,
    });
  };

  const type = watch('type');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <SectionCard>
          <div className="h-24 bg-muted animate-pulse rounded-xl" />
        </SectionCard>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="space-y-6">
        <PageHeader title="Documento fiscal não encontrado" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            O documento fiscal solicitado não foi encontrado.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Documento Fiscal"
        subtitle={`${doc.number}${doc.series ? ` - Série ${doc.series}` : ''}`}
      />
      <SectionCard title="Dados do Documento">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Tipo *</Label>
              <select
                {...register('type')}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Saída</option>
              </select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Status *</Label>
              <select
                {...register('status')}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="REGISTERED">Registrado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="number" className="text-sm text-muted-foreground mb-2">
                Número *
              </Label>
              <Input
                id="number"
                {...register('number')}
                className={errors.number ? 'border-destructive' : 'rounded-xl'}
              />
              {errors.number && (
                <p className="text-sm text-destructive mt-1">{errors.number.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="series" className="text-sm text-muted-foreground mb-2">
                Série
              </Label>
              <Input id="series" {...register('series')} className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issueDate" className="text-sm text-muted-foreground mb-2">
                Data de emissão *
              </Label>
              <Input
                id="issueDate"
                type="date"
                {...register('issueDate')}
                className={errors.issueDate ? 'border-destructive' : 'rounded-xl'}
              />
              {errors.issueDate && (
                <p className="text-sm text-destructive mt-1">{errors.issueDate.message}</p>
              )}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Valor total *</Label>
              <CurrencyInput
                placeholder="0,00"
                error={!!errors.totalAmount}
                value={watch('totalAmount')}
                onChange={(value) =>
                  setValue('totalAmount', value ?? 0, { shouldValidate: true })
                }
              />
              {errors.totalAmount && (
                <p className="text-sm text-destructive mt-1">
                  {errors.totalAmount.message}
                </p>
              )}
            </div>
          </div>
          {type === 'ENTRY' && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Fornecedor</Label>
              <SearchableSelect
                id="supplierId"
                options={[
                  { value: '', label: 'Nenhum' },
                  ...toSelectOptions(
                    suppliers.filter((s) => s.active && !s.deletedAt),
                    (s) => s.id,
                    (s) => s.name,
                  ),
                ]}
                value={watch('supplierId') || ''}
                onChange={(value) => setValue('supplierId', value || '', { shouldValidate: true })}
                placeholder="Selecione o fornecedor"
              />
            </div>
          )}
          {type === 'EXIT' && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Cliente</Label>
              <SearchableSelect
                id="customerId"
                options={[
                  { value: '', label: 'Nenhum' },
                  ...toSelectOptions(
                    customers.filter((c) => c.active && !c.deletedAt),
                    (c) => c.id,
                    (c) => c.name,
                  ),
                ]}
                value={watch('customerId') || ''}
                onChange={(value) => setValue('customerId', value || '', { shouldValidate: true })}
                placeholder="Selecione o cliente"
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Conta a pagar</Label>
              <SearchableSelect
                id="accountPayableId"
                options={[
                  { value: '', label: 'Nenhuma' },
                  ...toSelectOptions(
                    accountsPayable ?? [],
                    (a) => a.id,
                    (a) => `${a.description} - ${Number(a.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                  ),
                ]}
                value={watch('accountPayableId') || ''}
                onChange={(value) =>
                  setValue('accountPayableId', value || '', { shouldValidate: true })
                }
                placeholder="Vincular a CP"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Conta a receber</Label>
              <SearchableSelect
                id="accountReceivableId"
                options={[
                  { value: '', label: 'Nenhuma' },
                  ...toSelectOptions(
                    accountsReceivable ?? [],
                    (a) => a.id,
                    (a) => `${a.description} - ${Number(a.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                  ),
                ]}
                value={watch('accountReceivableId') || ''}
                onChange={(value) =>
                  setValue('accountReceivableId', value || '', { shouldValidate: true })
                }
                placeholder="Vincular a CR"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Transação</Label>
              <SearchableSelect
                id="financialTransactionId"
                options={[
                  { value: '', label: 'Nenhuma' },
                  ...toSelectOptions(
                    transactions ?? [],
                    (t) => t.id,
                    (t) =>
                      `${t.description || 'Transação'} - ${Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                  ),
                ]}
                value={watch('financialTransactionId') || ''}
                onChange={(value) =>
                  setValue('financialTransactionId', value || '', { shouldValidate: true })
                }
                placeholder="Vincular transação"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes" className="text-sm text-muted-foreground mb-2">
              Observações
            </Label>
            <Textarea id="notes" {...register('notes')} className="rounded-xl" rows={2} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
