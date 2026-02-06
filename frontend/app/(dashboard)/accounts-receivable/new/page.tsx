'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  accountReceivableApi,
  CreateAccountReceivableDto,
} from '@/lib/api/account-receivable';
import { branchApi } from '@/lib/api/branch';
import { customerApi } from '@/lib/api/customer';
import { costCenterApi } from '@/lib/api/cost-center';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';

const accountReceivableSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
  customerId: z.string().uuid().optional().or(z.literal('')),
  costCenterId: z.string().uuid().optional().or(z.literal('')),
  branchId: z.string().uuid('Selecione uma filial'),
});

type AccountReceivableFormData = z.infer<typeof accountReceivableSchema>;

export default function NewAccountReceivablePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<AccountReceivableFormData>({
    resolver: zodResolver(accountReceivableSchema),
    defaultValues: {
      amount: undefined,
      branchId: effectiveBranchId || '',
      customerId: '',
      costCenterId: '',
    },
  });

  // Atualizar branchId quando a filial efetiva mudar
  React.useEffect(() => {
    if (effectiveBranchId) {
      setValue('branchId', effectiveBranchId);
    }
  }, [effectiveBranchId, setValue]);

  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
    enabled: false,
  });

  const { data: customersResponse } = useQuery({
    queryKey: ['customers', effectiveBranchId],
    queryFn: () => customerApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
    enabled: !!effectiveBranchId,
  });

  const { data: costCentersResponse } = useQuery({
    queryKey: ['cost-centers', effectiveBranchId],
    queryFn: () => costCenterApi.getAll(effectiveBranchId ?? undefined, 1, 500),
    enabled: !!effectiveBranchId,
  });

  const branches = branchesResponse?.data || [];
  const customers = customersResponse?.data || [];
  const costCenters = costCentersResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CreateAccountReceivableDto) =>
      accountReceivableApi.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
      await queryClient.refetchQueries({ queryKey: ['accounts-receivable'] });
      toastSuccess('Conta a receber cadastrada com sucesso');
      router.push('/accounts-receivable');
    },
  });

  const onSubmit = (data: AccountReceivableFormData) => {
    const amountValue = watch('amount');
    const amount =
      amountValue !== undefined && !isNaN(amountValue) ? amountValue : undefined;
    if (amount === undefined || amount < 0.01) return;
    createMutation.mutate({
      ...data,
      amount,
      companyId: DEFAULT_COMPANY_ID,
      branchId: data.branchId,
      customerId: data.customerId || undefined,
      costCenterId: data.costCenterId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Conta a Receber"
        subtitle="Cadastre uma nova conta a receber"
      />

      <SectionCard title="Dados da Conta a Receber">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="description" className="text-sm text-muted-foreground mb-2">
              Descrição *
            </Label>
            <Input
              id="description"
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

          {/* Campo de filial oculto - preenchido automaticamente com a filial efetiva */}
          <input type="hidden" {...register('branchId')} value={effectiveBranchId || ''} />

          <div>
            <Label htmlFor="documentNumber" className="text-sm text-muted-foreground mb-2">
              Número do Documento
            </Label>
            <Input
              id="documentNumber"
              {...register('documentNumber')}
              className="rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm text-muted-foreground mb-2">
              Observações
            </Label>
            <Textarea id="notes" {...register('notes')} className="rounded-xl" />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
