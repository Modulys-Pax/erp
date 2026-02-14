'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { productApi, UpdateProductDto } from '@/lib/api/product';
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
import { getQuantityInputStep } from '@/lib/utils/quantity';

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
  unitOfMeasurementId: z.string().uuid().optional().or(z.literal('')),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().min(0, 'Preço unitário não pode ser negativo').optional().or(z.nan()),
  minQuantity: z.coerce.number().min(0, 'Quantidade mínima não pode ser negativa').optional().or(z.nan()),
  supplierId: z.string().uuid().optional().or(z.literal('')),
  companyId: z.string().uuid('Selecione uma empresa'),
  branchId: z.string().uuid('Selecione uma filial'),
  active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();

  const { data: product, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: () => productApi.getById(id),
  });

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  // Ref para rastrear último produto resetado
  const lastProductIdRef = useRef<string | null>(null);

  // Resetar formulário quando o produto for carregado
  useEffect(() => {
    if (product && !isLoading && lastProductIdRef.current !== product.id) {
      lastProductIdRef.current = product.id;
      reset({
        name: product.name,
        code: product.code || '',
        description: product.description || '',
        unitOfMeasurementId: (product as any).unitOfMeasurementId || '',
        unit: product.unit || '',
        unitPrice: product.unitPrice,
        minQuantity: product.minQuantity,
        supplierId: (product as any).supplierId || '',
        companyId: product.companyId,
        // Para admin: usar filial efetiva; para não-admin: manter a filial do produto
        branchId: isAdmin ? (effectiveBranchId || '') : (product.branchId || ''),
        active: product.active,
      });
    }
  }, [product, isLoading, reset, isAdmin, effectiveBranchId]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProductDto) => productApi.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.refetchQueries({ queryKey: ['products'] });
      toastSuccess('Produto atualizado com sucesso');
      router.push('/products');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao atualizar produto');
    },
  });

  const onSubmit = (data: ProductFormData) => {
    // Obter valor numérico do campo unitPrice (já vem formatado pelo CurrencyInput)
    const unitPriceValue = watch('unitPrice');
    const unitPrice = unitPriceValue !== undefined && !isNaN(unitPriceValue) ? unitPriceValue : undefined;

    const submitData: UpdateProductDto = {
      name: data.name,
      code: data.code || undefined,
      description: data.description || undefined,
      unitOfMeasurementId: data.unitOfMeasurementId && data.unitOfMeasurementId.trim() !== '' ? data.unitOfMeasurementId : undefined,
      unit: data.unit || undefined,
      unitPrice,
      minQuantity: data.minQuantity !== undefined && !isNaN(data.minQuantity) ? data.minQuantity : undefined,
      companyId: DEFAULT_COMPANY_ID,
      branchId: isAdmin ? (effectiveBranchId || undefined) : (product?.branchId || undefined),
      active: data.active,
    };
    updateMutation.mutate(submitData);
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

  if (!product) {
    return (
      <div className="space-y-6">
        <PageHeader title="Produto não encontrado" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            O produto solicitado não foi encontrado.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Produto"
        subtitle="Atualize os dados do produto"
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
                {(watch('unitOfMeasurementId') && unitsOfMeasurement.find((u) => u.id === watch('unitOfMeasurementId'))?.code) && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({unitsOfMeasurement.find((u) => u.id === watch('unitOfMeasurementId'))?.code})
                  </span>
                )}
              </Label>
              <Input
                id="minQuantity"
                type="number"
                step={getQuantityInputStep(unitsOfMeasurement.find((u) => u.id === watch('unitOfMeasurementId'))?.code)}
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
          <input type="hidden" {...register('branchId')} value={isAdmin ? (effectiveBranchId || '') : (product?.branchId || '')} />

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
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
