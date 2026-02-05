'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi, CreateProductDto } from '@/lib/api/product';
import { unitOfMeasurementApi } from '@/lib/api/unit-of-measurement';
import { branchApi } from '@/lib/api/branch';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
  unitOfMeasurementId: z.string().uuid().optional().or(z.literal('')),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0, 'Preço unitário não pode ser negativo').optional().or(z.nan()),
  minQuantity: z.coerce.number().min(0, 'Quantidade mínima não pode ser negativa').optional().or(z.nan()),
  branchId: z.string().uuid('Selecione uma filial'),
  active: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      active: true,
      branchId: effectiveBranchId || '',
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
    enabled: false, // Não precisamos buscar filiais se não vamos mostrar o campo
  });

  const branches = branchesResponse?.data || [];

  // Buscar unidades de medida do backend
  const { data: unitsOfMeasurement = [], isLoading: isLoadingUnits } = useQuery({
    queryKey: ['units-of-measurement'],
    queryFn: () => unitOfMeasurementApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductDto) => productApi.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.refetchQueries({ queryKey: ['products'] });
      toastSuccess('Produto criado com sucesso');
      router.push('/products');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao criar produto');
    },
  });

  const onSubmit = (data: ProductFormData) => {
    // Validar se branchId está presente
    if (!effectiveBranchId) {
      toastErrorFromException(new Error('Por favor, selecione uma filial na sidebar'), 'Filial não selecionada');
      return;
    }

    // Obter valor numérico do campo unitPrice (já vem formatado pelo CurrencyInput)
    const unitPriceValue = watch('unitPrice');
    const unitPrice = unitPriceValue !== undefined && !isNaN(unitPriceValue) ? unitPriceValue : undefined;

    const submitData: CreateProductDto = {
      name: data.name,
      code: data.code || undefined,
      description: data.description || undefined,
      unitOfMeasurementId: data.unitOfMeasurementId && data.unitOfMeasurementId.trim() !== '' ? data.unitOfMeasurementId : undefined,
      unit: data.unit || undefined,
      unitPrice,
      minQuantity: data.minQuantity !== undefined && !isNaN(data.minQuantity) ? data.minQuantity : undefined,
      companyId: DEFAULT_COMPANY_ID,
      branchId: effectiveBranchId,
      active: data.active,
    };
    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Produto"
        subtitle="Cadastre um novo produto"
      />

      <SectionCard title="Dados do Produto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm text-muted-foreground mb-2">
              Nome *
            </Label>
            <Input
              id="name"
              {...register('name')}
              className={errors.name ? 'border-destructive' : 'rounded-xl'}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code" className="text-sm text-muted-foreground mb-2">
                Código
              </Label>
              <Input id="code" {...register('code')} className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="unitOfMeasurementId" className="text-sm text-muted-foreground mb-2">
                Unidade de Medida
              </Label>
              <SearchableSelect
                id="unitOfMeasurementId"
                options={toSelectOptions(
                  unitsOfMeasurement.filter((unit) => unit.active),
                  (unit) => unit.id,
                  (unit) => `${unit.code} - ${unit.name}`,
                )}
                value={watch('unitOfMeasurementId') || ''}
                onChange={(value) => setValue('unitOfMeasurementId', value || '', { shouldValidate: true })}
                placeholder={isLoadingUnits ? 'Carregando...' : 'Selecione uma unidade'}
                disabled={isLoadingUnits}
                error={!!errors.unitOfMeasurementId}
              />
              {errors.unitOfMeasurementId && (
                <p className="text-sm text-destructive mt-1">{errors.unitOfMeasurementId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unitPrice" className="text-sm text-muted-foreground mb-2">
                Preço Unitário
              </Label>
              <CurrencyInput
                id="unitPrice"
                placeholder="0,00"
                error={!!errors.unitPrice}
                value={watch('unitPrice')}
                onChange={(value) => {
                  setValue('unitPrice', value || undefined, { shouldValidate: true });
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Preço por unidade de medida
              </p>
              {errors.unitPrice && (
                <p className="text-sm text-destructive mt-1">
                  {errors.unitPrice.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="minQuantity" className="text-sm text-muted-foreground mb-2">
                Quantidade Mínima em Estoque
              </Label>
              <Input
                id="minQuantity"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...register('minQuantity', { valueAsNumber: true })}
                className={errors.minQuantity ? 'border-destructive rounded-xl' : 'rounded-xl'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quantidade mínima para alerta de estoque baixo
              </p>
              {errors.minQuantity && (
                <p className="text-sm text-destructive mt-1">
                  {errors.minQuantity.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm text-muted-foreground mb-2">
              Descrição
            </Label>
            <Input id="description" {...register('description')} className="rounded-xl" />
          </div>

          {/* Campo de filial oculto - preenchido automaticamente com a filial efetiva */}
          <input type="hidden" {...register('branchId')} value={effectiveBranchId || ''} />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="rounded border-border"
            />
            <Label htmlFor="active" className="text-sm text-muted-foreground cursor-pointer">
              Produto ativo
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
