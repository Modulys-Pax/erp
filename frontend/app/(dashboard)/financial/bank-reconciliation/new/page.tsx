'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bankReconciliationApi } from '@/lib/api/bank-reconciliation';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastSuccess } from '@/lib/utils';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const schema = z.object({
  description: z.string().optional(),
  referenceMonth: z.number().min(1).max(12),
  referenceYear: z.number().min(2000).max(2100),
});
type FormData = z.infer<typeof schema>;

export default function NewBankStatementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const now = new Date();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      referenceMonth: now.getMonth() + 1,
      referenceYear: now.getFullYear(),
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      bankReconciliationApi.createStatement({
        branchId: effectiveBranchId!,
        description: data.description || undefined,
        referenceMonth: data.referenceMonth,
        referenceYear: data.referenceYear,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      toastSuccess('Extrato criado');
      router.push(`/financial/bank-reconciliation/${created.id}`);
    },
  });

  const onSubmit = (data: FormData) => {
    if (!effectiveBranchId) return;
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Novo Extrato Bancário" subtitle="Crie um extrato para conciliar itens" />
      <SectionCard title="Dados do extrato">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input id="description" {...register('description')} className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="referenceMonth">Mês de referência *</Label>
              <select
                id="referenceMonth"
                {...register('referenceMonth', { valueAsNumber: true })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                {MONTHS.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="referenceYear">Ano *</Label>
              <Input
                id="referenceYear"
                type="number"
                {...register('referenceYear', { valueAsNumber: true })}
                className="rounded-xl"
              />
              {errors.referenceYear && (
                <p className="text-sm text-destructive">{errors.referenceYear.message}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !effectiveBranchId}>
              {createMutation.isPending ? 'Criando...' : 'Criar extrato'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
