'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  accountReceivableApi,
  UpdateAccountReceivableDto,
} from '@/lib/api/account-receivable';
import { branchApi } from '@/lib/api/branch';
import { customerApi } from '@/lib/api/customer';
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

const accountReceivableSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
  customerId: z.string().uuid().optional().or(z.literal('')),
  costCenterId: z.string().uuid().optional().or(z.literal('')),
  companyId: z.string().uuid('Selecione uma empresa'),
  branchId: z.string().uuid('Selecione uma filial'),
});

type AccountReceivableFormData = z.infer<typeof accountReceivableSchema>;

export default function EditAccountReceivablePage() {
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
  } = useForm<AccountReceivableFormData>({
    resolver: zodResolver(accountReceivableSchema),
  });

  const { data: accountReceivable, isLoading } = useQuery({
    queryKey: ['accounts-receivable', id],
    queryFn: () => accountReceivableApi.getById(id),
    enabled: !!id,
  });

  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
  });

  const branchIdForLists = accountReceivable?.branchId;

  const { data: customersResponse } = useQuery({
    queryKey: ['customers', branchIdForLists],
    queryFn: () => customerApi.getAll(branchIdForLists ?? undefined, false, 1, 500),
    enabled: !!branchIdForLists,
  });

  const { data: costCentersResponse } = useQuery({
    queryKey: ['cost-centers', branchIdForLists],
    queryFn: () => costCenterApi.getAll(branchIdForLists ?? undefined, 1, 500),
    enabled: !!branchIdForLists,
  });

  const branches = branchesResponse?.data || [];
  const customers = customersResponse?.data ?? [];
  const costCenters = costCentersResponse?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: UpdateAccountReceivableDto) =>
      accountReceivableApi.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
      await queryClient.refetchQueries({ queryKey: ['accounts-receivable'] });
      toastSuccess('Conta a receber atualizada com sucesso');
      router.push('/accounts-receivable');
    },
  });

  React.useEffect(() => {
    if (!accountReceivable) return;
    const amount = Number(accountReceivable.amount);
    reset({
      description: accountReceivable.description,
      amount: Number.isNaN(amount) ? undefined : amount,
      dueDate: new Date(accountReceivable.dueDate).toISOString().split('T')[0],
      documentNumber: accountReceivable.documentNumber || '',
      notes: accountReceivable.notes || '',
      customerId: accountReceivable.customerId || '',
      costCenterId: accountReceivable.costCenterId || '',
      companyId: accountReceivable.companyId ?? DEFAULT_COMPANY_ID,
      branchId: accountReceivable.branchId,
    });
  }, [accountReceivable, reset]);

  const onSubmit = (data: AccountReceivableFormData) => {
    const amountValue = watch('amount');
    const amount =
      amountValue !== undefined && !isNaN(amountValue) ? amountValue : undefined;
    if (amount === undefined || amount < 0.01) return;
    updateMutation.mutate({
      ...data,
      amount,
      companyId: DEFAULT_COMPANY_ID,
      customerId: data.customerId || undefined,
      costCenterId: data.costCenterId || undefined,
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

  if (!accountReceivable) {
    return (
      <div className="space-y-6">
        <PageHeader title="Conta a receber não encontrada" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            A conta a receber solicitada não foi encontrada.
          </p>
        </SectionCard>
      </div>
    );
  }

  if (accountReceivable.status === 'RECEIVED') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Editar Conta a Receber"
          subtitle="Esta conta a receber já foi recebida e não pode ser editada."
          actions={<Button onClick={() => router.back()}>Voltar</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Conta a Receber"
        subtitle="Edite os dados da conta a receber"
      />

      <SectionCard title="Dados da Conta a Receber">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          key={accountReceivable.id}
        >
          <div>
            <Label htmlFor="description" className="text-sm text-muted-foreground mb-2">
              Descrição *
            </Label>
            <Input
              id="description"
              defaultValue={accountReceivable.description}
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
            <div>
              <Label className="text-sm text-muted-foreground mb-2">Centro de custo</Label>
              <SearchableSelect
                id="costCenterId"
                options={[
                  { value: '', label: 'Nenhum' },
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
            </div>
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

          <div>
            <Label htmlFor="documentNumber" className="text-sm text-muted-foreground mb-2">
              Número do Documento
            </Label>
            <Input
              id="documentNumber"
              defaultValue={accountReceivable.documentNumber || ''}
              {...register('documentNumber')}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm text-muted-foreground mb-2">
              Observações
            </Label>
            <Textarea
              id="notes"
              defaultValue={accountReceivable.notes || ''}
              {...register('notes')}
              className="rounded-xl"
            />
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
