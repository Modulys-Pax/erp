'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { expenseApi, ExpenseType } from '@/lib/api/expense';
import { employeeApi } from '@/lib/api/employee';
import { useAuth } from '@/lib/auth/auth-context';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  employeeId: z.string().optional(),
  type: z.nativeEnum(ExpenseType),
  amount: z.coerce.number().min(0.01, 'Valor deve ser maior que 0'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  expenseDate: z.string().min(1, 'Data é obrigatória'),
  documentNumber: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewExpensePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { branchId: effectiveBranchId } = useEffectiveBranch();

  const { data: employees } = useQuery({
    queryKey: ['employees', effectiveBranchId],
    queryFn: () => employeeApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: ExpenseType.OTHER,
      expenseDate: new Date().toISOString().split('T')[0],
    },
  });

  const employeeId = watch('employeeId');
  const type = watch('type');
  const amount = watch('amount');

  const createMutation = useMutation({
    mutationFn: expenseApi.create,
    onSuccess: () => {
      toastSuccess('Despesa cadastrada com sucesso');
      router.push('/financial/expenses');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao cadastrar despesa'),
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      ...data,
      companyId: DEFAULT_COMPANY_ID,
      branchId: effectiveBranchId || user?.branchId || '',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Despesa"
        subtitle="Cadastre uma nova despesa"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <SectionCard title="Dados da Despesa">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Funcionário (opcional)</Label>
              <SearchableSelect
                options={[
                  { value: '', label: 'Nenhum' },
                  ...toSelectOptions(employees?.data || [], (e) => e.id, (e) => e.name),
                ]}
                value={employeeId || ''}
                onChange={(v) => setValue('employeeId', v || undefined)}
                placeholder="Selecione o funcionário"
              />
            </div>

            <div>
              <Label>Tipo *</Label>
              <SearchableSelect
                options={[
                  { value: 'TRANSPORT', label: 'Transporte' },
                  { value: 'MEAL', label: 'Refeição' },
                  { value: 'ACCOMMODATION', label: 'Hospedagem' },
                  { value: 'OTHER', label: 'Outros' },
                ]}
                value={type}
                onChange={(v) => setValue('type', v as ExpenseType)}
                placeholder="Selecione o tipo"
              />
            </div>

            <div>
              <Label>Valor *</Label>
              <CurrencyInput
                value={amount}
                onChange={(value) => setValue('amount', value || 0)}
                error={!!errors.amount}
              />
              {errors.amount && (
                <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label>Data *</Label>
              <Input type="date" {...register('expenseDate')} />
              {errors.expenseDate && (
                <p className="text-sm text-destructive mt-1">{errors.expenseDate.message}</p>
              )}
            </div>

            <div>
              <Label>Número do Documento</Label>
              <Input {...register('documentNumber')} placeholder="Ex: REC-001234" />
            </div>

            <div className="md:col-span-2">
              <Label>Descrição *</Label>
              <Textarea {...register('description')} placeholder="Descreva a despesa" />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {(isSubmitting || createMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </div>
        </SectionCard>
      </form>
    </div>
  );
}
