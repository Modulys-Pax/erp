'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { benefitApi, CreateBenefitDto } from '@/lib/api/benefit';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';

const benefitSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  dailyCost: z.coerce.number().min(0, 'Custo diário não pode ser negativo'),
  employeeValue: z.coerce.number().min(0, 'Valor do funcionário não pode ser negativo'),
  includeWeekends: z.boolean().default(false),
  description: z.string().optional(),
  active: z.boolean().default(true),
  branchId: z.string().uuid('Selecione uma filial'),
});

type BenefitFormData = z.infer<typeof benefitSchema>;

export default function NewBenefitPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BenefitFormData>({
    resolver: zodResolver(benefitSchema),
    defaultValues: {
      active: true,
      includeWeekends: false,
      branchId: effectiveBranchId || '',
    },
  });

  // Atualizar branchId quando a filial efetiva mudar
  React.useEffect(() => {
    if (effectiveBranchId) {
      setValue('branchId', effectiveBranchId);
    }
  }, [effectiveBranchId, setValue]);

  const createMutation = useMutation({
    mutationFn: (data: CreateBenefitDto) => benefitApi.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['benefits'] });
      await queryClient.refetchQueries({ queryKey: ['benefits'] });
      toastSuccess('Benefício criado com sucesso');
      router.push('/benefits');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao criar benefício');
    },
  });

  const onSubmit = (data: BenefitFormData) => {
    if (!effectiveBranchId) {
      toastErrorFromException(new Error('Por favor, selecione uma filial na sidebar'), 'Filial não selecionada');
      return;
    }

    // Obter valores numéricos dos campos monetários (já vêm formatados pelo CurrencyInput)
    const dailyCostValue = watch('dailyCost');
    const employeeValueValue = watch('employeeValue');
    const dailyCost = dailyCostValue !== undefined && !isNaN(dailyCostValue) ? dailyCostValue : 0;
    const employeeValue = employeeValueValue !== undefined && !isNaN(employeeValueValue) ? employeeValueValue : 0;

    const submitData: CreateBenefitDto = {
      name: data.name,
      dailyCost,
      employeeValue,
      includeWeekends: data.includeWeekends,
      description: data.description || undefined,
      active: data.active,
      companyId: DEFAULT_COMPANY_ID,
      branchId: effectiveBranchId,
    };
    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Benefício"
        subtitle="Cadastre um novo benefício no catálogo"
      />

      <SectionCard title="Dados do Benefício">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm text-muted-foreground mb-2">
              Nome do Benefício *
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ex: Vale Transporte, Plano de Saúde, Vale Refeição, etc"
              className={errors.name ? 'border-destructive' : 'rounded-xl'}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Você pode escolher qualquer nome para o benefício
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dailyCost" className="text-sm text-muted-foreground mb-2">
                Custo Diário para a Empresa *
              </Label>
              <CurrencyInput
                id="dailyCost"
                placeholder="0,00"
                error={!!errors.dailyCost}
                value={watch('dailyCost')}
                onChange={(value) => {
                  setValue('dailyCost', value || 0, { shouldValidate: true });
                }}
              />
              {errors.dailyCost && (
                <p className="text-sm text-destructive mt-1">{errors.dailyCost.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Custo que a empresa terá por dia útil
              </p>
            </div>

            <div>
              <Label htmlFor="employeeValue" className="text-sm text-muted-foreground mb-2">
                Valor que o Funcionário Recebe *
              </Label>
              <CurrencyInput
                id="employeeValue"
                placeholder="0,00"
                error={!!errors.employeeValue}
                value={watch('employeeValue')}
                onChange={(value) => {
                  setValue('employeeValue', value || 0, { shouldValidate: true });
                }}
              />
              {errors.employeeValue && (
                <p className="text-sm text-destructive mt-1">{errors.employeeValue.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Valor que será creditado ao funcionário por dia
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm text-muted-foreground mb-2">
              Descrição
            </Label>
            <textarea
              id="description"
              {...register('description')}
              placeholder="Descrição do benefício..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground min-h-[80px]"
            />
          </div>

          {/* Campo de filial oculto - preenchido automaticamente com a filial efetiva */}
          <input type="hidden" {...register('branchId')} value={effectiveBranchId || ''} />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeWeekends"
              {...register('includeWeekends')}
              className="rounded border-border"
            />
            <Label htmlFor="includeWeekends" className="text-sm text-muted-foreground cursor-pointer">
              Contar sábados e domingos
            </Label>
            <p className="text-xs text-muted-foreground ml-2">
              Se marcado, o cálculo incluirá fins de semana
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="rounded border-border"
            />
            <Label htmlFor="active" className="text-sm text-muted-foreground cursor-pointer">
              Benefício ativo
            </Label>
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
