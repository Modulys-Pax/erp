'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  accountPayableApi,
  UpdateAccountPayableDto,
} from '@/lib/api/account-payable';
import { branchApi } from '@/lib/api/branch';
import { supplierApi } from '@/lib/api/supplier';
import { costCenterApi } from '@/lib/api/cost-center';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const accountPayableSchema = z
  .object({
    description: z.string().min(1, 'Descrição é obrigatória'),
    amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
    dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
    documentNumber: z.string().min(1, 'Número do documento é obrigatório'),
    notes: z.string().min(1, 'Observações são obrigatórias'),
    remetente: z.string().optional(),
    supplierId: z.string().uuid().optional().or(z.literal('')),
    costCenterId: z
      .string()
      .min(1, 'Centro de custo é obrigatório')
      .uuid('Selecione um centro de custo válido'),
    branchId: z.string().uuid('Selecione uma filial'),
  })
  .superRefine((data, ctx) => {
    const hasSupplier = !!data.supplierId?.trim();
    const hasRemetente = !!data.remetente?.trim();
    if (!hasSupplier && !hasRemetente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o fornecedor ou o remetente. A nota deve vir de algum lugar.',
        path: ['supplierId'],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o fornecedor ou o remetente. A nota deve vir de algum lugar.',
        path: ['remetente'],
      });
    }
  });

type AccountPayableFormData = z.infer<typeof accountPayableSchema>;

export default function EditAccountPayablePage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AccountPayableFormData>({
    resolver: zodResolver(accountPayableSchema),
  });

  const { data: accountPayable, isLoading } = useQuery({
    queryKey: ['accounts-payable', id],
    queryFn: () => accountPayableApi.getById(id),
    enabled: !!id,
  });

  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
  });

  const branchIdForLists = accountPayable?.branchId;

  const { data: suppliersResponse } = useQuery({
    queryKey: ['suppliers', branchIdForLists],
    queryFn: () => supplierApi.getAll(branchIdForLists ?? undefined, false, 1, 500),
    enabled: !!branchIdForLists,
  });

  const { data: costCentersResponse } = useQuery({
    queryKey: ['cost-centers', branchIdForLists],
    queryFn: () => costCenterApi.getAll(branchIdForLists ?? undefined, 1, 500),
    enabled: !!branchIdForLists,
  });

  const branches = branchesResponse?.data || [];
  const suppliers = suppliersResponse?.data ?? [];
  const costCenters = costCentersResponse?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: UpdateAccountPayableDto) =>
      accountPayableApi.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      await queryClient.refetchQueries({ queryKey: ['accounts-payable'] });
      toastSuccess('Conta a pagar atualizada com sucesso');
      router.push('/accounts-payable');
    },
  });

  React.useEffect(() => {
    if (!accountPayable) return;
    const amount = Number(accountPayable.amount);
    reset({
      description: accountPayable.description,
      amount: Number.isNaN(amount) ? undefined : amount,
      dueDate: new Date(accountPayable.dueDate).toISOString().split('T')[0],
      documentNumber: accountPayable.documentNumber || '',
      notes: accountPayable.notes || '',
      remetente: accountPayable.remetente || '',
      supplierId: accountPayable.supplierId || '',
      costCenterId: accountPayable.costCenterId || '',
      branchId: accountPayable.branchId,
    });
  }, [accountPayable, reset]);

  const onSubmit = (data: AccountPayableFormData) => {
    const amountValue = watch('amount');
    const amount =
      amountValue !== undefined && !isNaN(amountValue) ? amountValue : undefined;
    if (amount === undefined || amount < 0.01) return;
    updateMutation.mutate({
      ...data,
      amount,
      companyId: DEFAULT_COMPANY_ID,
      documentNumber: data.documentNumber,
      notes: data.notes,
      remetente: data.remetente?.trim() || undefined,
      supplierId: data.supplierId?.trim() || undefined,
      costCenterId: data.costCenterId,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <SectionCard>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!accountPayable) {
    return (
      <div className="space-y-6">
        <PageHeader title="Conta a pagar não encontrada" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            A conta a pagar solicitada não foi encontrada.
          </p>
        </SectionCard>
      </div>
    );
  }

  if (accountPayable.status === 'PAID') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Editar Conta a Pagar"
          subtitle="Esta conta a pagar já foi paga e não pode ser editada."
          actions={<Button onClick={() => router.back()}>Voltar</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Conta a Pagar"
        subtitle="Edite os dados da conta a pagar"
      />

      <SectionCard title="Dados da Conta a Pagar">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          key={accountPayable.id}
        >
          <div>
            <Label htmlFor="description" className="text-sm text-muted-foreground mb-2">
              Descrição *
            </Label>
            <Input
              id="description"
              defaultValue={accountPayable.description}
              {...register('description')}
              className={errors.description ? 'border-destructive' : 'rounded-xl'}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount" className="text-sm text-muted-foreground mb-2">
                Valor *
              </Label>
              <CurrencyInput
                id="amount"
                placeholder="0,00"
                error={!!errors.amount}
                value={watch('amount')}
                onChange={(value) => {
                  setValue('amount', value ?? undefined, { shouldValidate: true });
                }}
              />
              {errors.amount && (
                <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="dueDate" className="text-sm text-muted-foreground mb-2">
                Data de Vencimento *
              </Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
                className={errors.dueDate ? 'border-destructive' : 'rounded-xl'}
              />
              {errors.dueDate && (
                <p className="text-sm text-destructive mt-1">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2">
                Fornecedor <span className="text-muted-foreground"></span>
              </Label>
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
              {errors.supplierId && (
                <p className="text-sm text-destructive mt-1">{errors.supplierId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="remetente" className="text-sm text-muted-foreground mb-2">
                Remetente <span className="text-muted-foreground"></span>
              </Label>
              <Input
                id="remetente"
                {...register('remetente')}
                placeholder="Nome do remetente da nota"
                className={errors.remetente ? 'border-destructive rounded-xl' : 'rounded-xl'}
              />
              {errors.remetente && (
                <p className="text-sm text-destructive mt-1">{errors.remetente.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Centro de custo *</Label>
              <SearchableSelect
                id="costCenterId"
                options={[
                  { value: '', label: 'Selecione' },
                  ...toSelectOptions(
                    costCenters.filter((c) => c.active),
                    (c) => c.id,
                    (c) => `${c.code} - ${c.name}`,
                  ),
                ]}
                value={watch('costCenterId') || ''}
                onChange={(value) => setValue('costCenterId', value || '', { shouldValidate: true })}
                placeholder="Selecione o centro de custo"
              />
              {errors.costCenterId && (
                <p className="text-sm text-destructive mt-1">{errors.costCenterId.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="branchId" className="text-sm text-muted-foreground mb-2">
                Filial *
              </Label>
              <SearchableSelect
                id="branchId"
                options={toSelectOptions(
                  branches,
                  (b) => b.id,
                  (b) => b.name,
                )}
                value={watch('branchId') || ''}
                onChange={(value) => setValue('branchId', value, { shouldValidate: true })}
                placeholder="Selecione uma filial"
                error={!!errors.branchId}
              />
              {errors.branchId && (
                <p className="text-sm text-destructive mt-1">
                  {errors.branchId.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="documentNumber" className="text-sm text-muted-foreground mb-2">
              Número do Documento *
            </Label>
            <Input
              id="documentNumber"
              {...register('documentNumber')}
              className={errors.documentNumber ? 'border-destructive rounded-xl' : 'rounded-xl'}
            />
            {errors.documentNumber && (
              <p className="text-sm text-destructive mt-1">{errors.documentNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm text-muted-foreground mb-2">
              Observações *
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              className={errors.notes ? 'border-destructive rounded-xl' : 'rounded-xl'}
            />
            {errors.notes && (
              <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
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
