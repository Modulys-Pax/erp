'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  stockMovementApi,
  CreateStockMovementDto,
  StockMovementType,
} from '@/lib/api/stock';
import { branchApi } from '@/lib/api/branch';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { productApi } from '@/lib/api/product';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { getQuantityInputStep, normalizeQuantityByUnit } from '@/lib/utils/quantity';

const movementSchema = z.object({
  productId: z.string().uuid('Selecione um produto'),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser maior que 0'),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
  companyId: z.string().uuid('Selecione uma empresa'),
  branchId: z.string().uuid('Selecione uma filial'),
});

type MovementFormData = z.infer<typeof movementSchema>;

export default function NewStockMovementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      companyId: DEFAULT_COMPANY_ID,
    },
  });


  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
  });
  const branches = branchesResponse?.data || [];

  // Definir branchId e companyId iniciais
  React.useEffect(() => {
    // Para admin: usar effectiveBranchId se disponível (da sidebar), senão deixar vazio para seleção manual
    // Para não-admin: sempre usar effectiveBranchId (filial do perfil)
    if (effectiveBranchId) {
      setValue('branchId', effectiveBranchId, { shouldValidate: false });
    } else if (!isAdmin) {
      // Não-admin sem filial: não deveria acontecer, mas garante que não fique vazio
      // Este caso não deveria ocorrer, mas é uma proteção
    }
    // Sempre inicializar companyId com o valor padrão
    setValue('companyId', DEFAULT_COMPANY_ID, { shouldValidate: false });
  }, [effectiveBranchId, isAdmin, setValue]);

  const selectedBranchId = watch('branchId');
  const selectedProductId = watch('productId');
  
  // Usar selectedBranchId do formulário para buscar produtos
  // Para admin: pode selecionar no formulário mesmo sem selecionar na sidebar
  // Para não-admin: sempre usa a filial do perfil (já setada no useEffect)
  const { data: productsResponse, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', selectedBranchId],
    queryFn: () =>
      productApi.getAll(selectedBranchId || undefined, false, 1, 1000),
    enabled: !!selectedBranchId,
  });
  const products = productsResponse?.data || [];
  
  // Buscar o produto selecionado para obter o unitPrice
  const selectedProduct = products?.find((p) => p.id === selectedProductId);

  const createMutation = useMutation({
    mutationFn: (data: CreateStockMovementDto) => stockMovementApi.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.refetchQueries({ queryKey: ['stockMovements'] });
      await queryClient.refetchQueries({ queryKey: ['stock'] });
      toastSuccess('Entrada de estoque criada com sucesso');
      router.push('/stock/movements');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao criar entrada de estoque');
    },
  });

  const onSubmit = (data: MovementFormData) => {
    // Buscar o produto selecionado para obter o unitPrice
    const product = products?.find((p) => p.id === data.productId);
    
    if (!product) {
      alert('Produto não encontrado');
      return;
    }

    if (!product.unitPrice || product.unitPrice <= 0) {
      alert('O produto selecionado não possui preço unitário cadastrado. Cadastre o preço do produto antes de registrar a entrada.');
      return;
    }

    const quantity = normalizeQuantityByUnit(data.quantity, product?.unit);
    if (quantity <= 0) {
      alert('Quantidade deve ser maior que zero. Para unidade em inteiros, use pelo menos 1.');
      return;
    }
    const submitData: CreateStockMovementDto = {
      type: StockMovementType.ENTRY, // Sempre entrada
      productId: data.productId,
      quantity,
      unitCost: product.unitPrice, // Usar o unitPrice do produto cadastrado
      documentNumber: data.documentNumber || undefined,
      notes: data.notes || undefined,
      companyId: DEFAULT_COMPANY_ID,
      branchId: data.branchId,
    };
    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Entrada de Estoque"
        subtitle="Registre uma nova entrada de produto no estoque"
      />

      <SectionCard title="Dados da Entrada">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="productId" className="text-sm text-muted-foreground mb-2">
              Produto *
            </Label>
            <SearchableSelect
              id="productId"
              options={toSelectOptions(
                products || [],
                (p) => p.id,
                (p) => `${p.name}${p.code ? ` (${p.code})` : ''}`,
              )}
              value={watch('productId')}
              onChange={(value) => setValue('productId', value, { shouldValidate: true })}
              placeholder={
                isLoadingProducts
                  ? 'Carregando produtos...'
                  : !selectedBranchId
                    ? 'Selecione uma filial primeiro'
                    : products?.length === 0
                      ? 'Nenhum produto cadastrado'
                      : 'Selecione um produto'
              }
              disabled={!selectedBranchId || isLoadingProducts}
              error={!!errors.productId}
            />
            {errors.productId && (
              <p className="text-sm text-destructive mt-1">
                {errors.productId.message}
              </p>
            )}
            {!selectedBranchId && (
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin 
                  ? 'Selecione uma filial acima para carregar os produtos'
                  : 'Filial não configurada. Entre em contato com o administrador.'}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="quantity" className="text-sm text-muted-foreground mb-2">
              Quantidade *
              {selectedProduct?.unit && (
                <span className="text-muted-foreground font-normal ml-1">({selectedProduct.unit})</span>
              )}
            </Label>
            <Input
              id="quantity"
              type="number"
              step={getQuantityInputStep(selectedProduct?.unit)}
              min="0.01"
              {...register('quantity')}
              className={errors.quantity ? 'border-destructive rounded-xl' : 'rounded-xl'}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive mt-1">
                {errors.quantity.message}
              </p>
            )}
          </div>

          {selectedProduct && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Custo Unitário:</span>
                <span className="text-lg font-semibold text-foreground">
                  {selectedProduct.unitPrice
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(selectedProduct.unitPrice)
                    : 'Não cadastrado'}
                </span>
              </div>
              {selectedProduct.unitPrice && (
                <p className="text-xs text-muted-foreground mt-2">
                  Valor cadastrado no produto. Será usado automaticamente na entrada.
                </p>
              )}
              {!selectedProduct.unitPrice && (
                <p className="text-xs text-destructive mt-2">
                  ⚠️ O produto não possui preço unitário cadastrado. Cadastre o preço do produto antes de registrar a entrada.
                </p>
              )}
            </div>
          )}

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
              placeholder={isAdmin ? "Selecione uma filial" : "Filial do seu perfil"}
              disabled={!isAdmin} // Não-admin não pode alterar (só usa a própria filial)
              error={!!errors.branchId}
            />
            {errors.branchId && (
              <p className="text-sm text-destructive mt-1">
                {errors.branchId.message}
              </p>
            )}
            {!isAdmin && (
              <p className="text-xs text-muted-foreground mt-1">
                Você só pode criar movimentações para a sua própria filial
              </p>
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
