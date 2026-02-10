'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  maintenanceApi,
  CreateMaintenanceOrderDto,
} from '@/lib/api/maintenance';
import { branchApi } from '@/lib/api/branch';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { vehicleApi } from '@/lib/api/vehicle';
import { employeeApi } from '@/lib/api/employee';
import { productApi } from '@/lib/api/product';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useSearchableSelect, toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { roundCurrency, roundQuantity } from '@/lib/utils/numbers';

const maintenanceSchema = z.object({
  vehicleIds: z
    .array(z.string().uuid())
    .min(1, 'Selecione pelo menos 1 placa')
    .max(4, 'Selecione no máximo 4 placas'),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE']),
  // String no input evita alteração por ponto flutuante (ex: 20000 → 19995)
  kmAtEntry: z
    .union([z.string(), z.number()])
    .refine((v) => v !== '' && v !== undefined && v !== null, {
      message: 'Informe a quilometragem na entrada',
    })
    .transform((v) => {
      const num = typeof v === 'number' ? v : parseInt(String(v).replace(/\D/g, ''), 10);
      return Number.isNaN(num) || num < 0 ? undefined : Math.round(num);
    })
    .refine((v) => v !== undefined && v >= 0, {
      message: 'Informe uma quilometragem válida',
    }),
  description: z.string().optional(),
  observations: z.string().optional(),
  companyId: z.string().uuid('Selecione uma empresa').optional(),
  branchId: z.string().uuid('Selecione uma filial').optional().or(z.literal('')),
  replacementItemsChanged: z.array(z.string().uuid()).optional().default([]),
  workers: z
    .array(
      z.object({
        employeeId: z.string().uuid('Selecione um funcionário'),
        isResponsible: z.boolean().default(false),
      }),
    )
    .optional(),
  services: z
    .array(
      z.object({
        description: z.string().min(1, 'Descrição é obrigatória'),
        cost: z.coerce.number().min(0).optional().or(z.nan()),
      }),
    )
    .optional(),
  materials: z
    .array(
      z.object({
        productId: z.string().uuid('Selecione um produto'),
        vehicleReplacementItemId: z.string().uuid().optional(),
        quantity: z.coerce.number().min(0.01, 'Quantidade deve ser maior que 0'),
        unitCost: z.coerce.number().min(0).optional().or(z.nan()),
      }),
    )
    .optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

// Componente para cada material (para usar hooks)
function MaterialField({
  index,
  field,
  products,
  selectedBranchId,
  register,
  watch,
  setValue,
  removeMaterial,
}: {
  index: number;
  field: { id: string };
  products: Array<{ id: string; name: string; code?: string; unit?: string; unitPrice?: number; totalStock?: number }>;
  selectedBranchId?: string;
  register: any;
  watch: any;
  setValue: any;
  removeMaterial: (index: number) => void;
}) {
  const selectedProductId = watch(`materials.${index}.productId`);
  const quantity = watch(`materials.${index}.quantity`);
  const selectedProduct = products?.find((p) => p.id === selectedProductId);
  // Usar unitPrice do produto diretamente
  const unitCost = selectedProduct?.unitPrice || 0;
  const totalCost = quantity && unitCost ? quantity * unitCost : 0;
  const availableStock = selectedProduct?.totalStock ?? 0;
  const exceedsStock = quantity && availableStock > 0 && quantity > availableStock;
  
  // Atualizar unitCost automaticamente quando produto mudar
  useEffect(() => {
    if (selectedProduct?.unitPrice && selectedProduct.unitPrice > 0) {
      setValue(`materials.${index}.unitCost`, selectedProduct.unitPrice, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [selectedProduct, index, setValue]);

  return (
    <div className="space-y-2 p-4 border rounded-xl">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label className="text-sm text-muted-foreground mb-2">
            Produto
          </Label>
          <SearchableSelect
            options={toSelectOptions(
              products || [],
              (p) => p.id,
              (p) => {
                let label = p.name;
                if (p.code) label += ` (${p.code})`;
                if (p.unit) label += ` - ${p.unit}`;
                return label;
              },
            )}
            value={watch(`materials.${index}.productId`)}
            onChange={(value) => setValue(`materials.${index}.productId`, value, { shouldValidate: true })}
            placeholder="Selecione um produto..."
          />
        </div>
        <div className="w-32">
          <Label className="text-sm text-muted-foreground mb-2">
            Quantidade
            {selectedProduct?.unit && (
              <span className="text-xs ml-1">({selectedProduct.unit})</span>
            )}
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={availableStock > 0 ? availableStock : undefined}
            {...register(`materials.${index}.quantity`, {
              valueAsNumber: true,
            })}
            className={exceedsStock ? 'border-destructive rounded-xl' : 'rounded-xl'}
          />
          {selectedProduct && (
            <p className={`text-xs mt-1 ${
              exceedsStock 
                ? 'text-destructive font-medium' 
                : availableStock < ((selectedProduct as { minQuantity?: number }).minQuantity ?? 0)
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-muted-foreground'
            }`}>
              Estoque disponível: {availableStock.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              {selectedProduct.unit && ` ${selectedProduct.unit}`}
              {exceedsStock && ' - Quantidade excede o estoque!'}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => removeMaterial(index)}
        >
          Remover
        </Button>
      </div>
      <div className="flex justify-between items-center">
        {totalCost > 0 && (
          <div className="text-sm font-medium text-foreground">
            Total: R$ {totalCost.toFixed(2)}
          </div>
        )}
        {exceedsStock && (
          <div className="text-sm text-destructive font-medium">
            ⚠️ Quantidade excede o estoque disponível
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewMaintenancePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      vehicleIds: [],
      replacementItemsChanged: [],
      workers: [],
      services: [],
      materials: [],
      branchId: effectiveBranchId || '',
      companyId: DEFAULT_COMPANY_ID,
    },
  });

  const selectedVehicleIds = watch('vehicleIds') ?? [];

  // Usar a filial efetiva (do contexto para admin, do perfil para não-admin)
  const selectedBranchId = effectiveBranchId;

  // Atualizar branchId quando effectiveBranchId mudar
  useEffect(() => {
    if (effectiveBranchId) {
      setValue('branchId', effectiveBranchId, { shouldValidate: false });
    }
  }, [effectiveBranchId, setValue]);

  const {
    fields: workerFields,
    append: appendWorker,
    remove: removeWorker,
  } = useFieldArray({
    control,
    name: 'workers',
  });

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({
    control,
    name: 'services',
  });

  const {
    fields: materialFields,
    append: appendMaterial,
    remove: removeMaterial,
  } = useFieldArray({
    control,
    name: 'materials',
  });

  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
    enabled: false, // Não precisamos buscar filiais se não vamos mostrar o campo
  });

  const branches = branchesResponse?.data || [];

  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles', selectedBranchId],
    queryFn: () =>
      vehicleApi.getAll(selectedBranchId || undefined, false, 1, 1000),
    enabled: !!selectedBranchId,
  });

  const vehicles = vehiclesResponse?.data || [];

  // Itens de troca por KM: união dos itens de todos os veículos selecionados
  const replacementItems = (() => {
    const ids = new Set<string>();
    const items: Array<{ id: string; name: string; replaceEveryKm: number }> = [];
    for (const vid of selectedVehicleIds) {
      const v = vehicles.find((x) => x.id === vid);
      for (const ri of v?.replacementItems ?? []) {
        if (!ids.has(ri.id)) {
          ids.add(ri.id);
          items.push(ri);
        }
      }
    }
    return items;
  })();

  const { data: employeesResponse } = useQuery({
    queryKey: ['employees', selectedBranchId],
    queryFn: () =>
      employeeApi.getAll(selectedBranchId || undefined, false, 1, 1000),
    enabled: !!selectedBranchId,
  });

  const employees = employeesResponse?.data || [];

  const { data: productsResponse } = useQuery({
    queryKey: ['products', selectedBranchId],
    queryFn: () =>
      productApi.getAll(selectedBranchId || undefined, false, 1, 1000),
    enabled: !!selectedBranchId,
  });

  const products = productsResponse?.data || [];



  const createMutation = useMutation({
    mutationFn: (data: CreateMaintenanceOrderDto) =>
      maintenanceApi.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['maintenanceDue'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await queryClient.refetchQueries({ queryKey: ['maintenance'] });
      router.push('/maintenance');
    },
    onError: (error: any) => {
      console.error('Erro ao criar ordem de manutenção:', error);
      alert(error?.response?.data?.message || 'Erro ao criar ordem de manutenção');
    },
  });

  const onSubmit = async (data: MaintenanceFormData) => {
    console.log('Form data:', data);
    console.log('Effective branch ID:', effectiveBranchId);
    
    // Usar a filial efetiva (do contexto para admin, do perfil para não-admin)
    const finalBranchId = effectiveBranchId;
    
    if (!finalBranchId) {
      // Se ainda não tiver branchId, mostrar erro
      alert('Por favor, selecione uma filial na sidebar');
      return;
    }

    if (!data.vehicleIds || data.vehicleIds.length === 0) {
      alert('Por favor, selecione pelo menos 1 placa');
      return;
    }

    if (!data.type) {
      alert('Por favor, selecione um tipo de manutenção');
      return;
    }

    // Validar estoque antes de enviar
    if (data.materials && data.materials.length > 0) {
      for (const material of data.materials) {
        const product = productsResponse?.data?.find((p) => p.id === material.productId);
        if (product) {
          const availableStock = product.totalStock ?? 0;
          if (material.quantity > availableStock) {
            alert(`Quantidade solicitada (${material.quantity}) excede o estoque disponível (${availableStock}) para o produto ${product.name}`);
            return;
          }
        }
      }
    }

    const submitData: CreateMaintenanceOrderDto = {
      vehicleIds: data.vehicleIds,
      type: data.type,
      kmAtEntry:
        data.kmAtEntry != null && data.kmAtEntry !== undefined && !Number.isNaN(Number(data.kmAtEntry))
          ? Math.round(Number(data.kmAtEntry))
          : undefined,
      description: data.description,
      observations: data.observations,
      companyId: DEFAULT_COMPANY_ID,
      branchId: finalBranchId,
      replacementItemsChanged:
        data.replacementItemsChanged && data.replacementItemsChanged.length > 0
          ? data.replacementItemsChanged
          : undefined,
      workers:
        data.workers && data.workers.length > 0 ? data.workers : undefined,
      services:
        data.services && data.services.length > 0
          ? data.services.map((s) => ({
              description: s.description,
              cost: s.cost != null && !Number.isNaN(s.cost) ? roundCurrency(s.cost) : undefined,
            }))
          : undefined,
      materials:
        data.materials && data.materials.length > 0
          ? data.materials
              .filter((m) => m.productId)
              .map((m) => {
                const product = productsResponse?.data?.find((p) => p.id === m.productId);
                const rawUnitCost =
                  m.unitCost != null && !Number.isNaN(m.unitCost) && m.unitCost > 0
                    ? m.unitCost
                    : product?.unitPrice && product.unitPrice > 0
                      ? product.unitPrice
                      : undefined;
                return {
                  productId: m.productId,
                  vehicleReplacementItemId: m.vehicleReplacementItemId,
                  quantity: roundQuantity(m.quantity),
                  unitCost: rawUnitCost != null ? roundCurrency(rawUnitCost) : undefined,
                };
              })
          : undefined,
    };

    try {
      await createMutation.mutateAsync(submitData);
    } catch {
      // Erro já tratado pelo mutation
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Ordem de Manutenção"
        subtitle="Crie uma nova ordem de manutenção"
      />

      <form 
        onSubmit={handleSubmit(
          onSubmit,
          (errors) => {
            console.error('Erros de validação:', errors);
            // Mostrar primeiro erro encontrado
            const firstError = Object.values(errors)[0];
            if (firstError?.message) {
              alert(`Erro: ${firstError.message}`);
            } else {
              alert('Por favor, preencha todos os campos obrigatórios');
            }
          }
        )} 
        className="space-y-6"
      >
        <SectionCard title="Dados Básicos">
          <div className="space-y-4">
            {/* Campo de filial oculto - preenchido automaticamente com a filial efetiva */}
            <input type="hidden" {...register('branchId')} value={effectiveBranchId || ''} />

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm text-muted-foreground mb-2">
                  Placas do combo (1 a 4) *
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione as placas que compõem o veículo nesta manutenção (cavalo, carretas, dolly)
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedVehicleIds.map((vid) => {
                    const v = vehicles.find((x) => x.id === vid);
                    const plateLabel = v?.plates?.[0] ? `${v.plates[0].plate} (${v.plates[0].type})` : v?.plate ?? vid;
                    return (
                      <div
                        key={vid}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm"
                      >
                        <span>{plateLabel}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setValue(
                              'vehicleIds',
                              selectedVehicleIds.filter((id) => id !== vid),
                              { shouldValidate: true }
                            );
                          }}
                          className="text-muted-foreground hover:text-destructive ml-1"
                          aria-label="Remover"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  {selectedVehicleIds.length < 4 && (
                    <SearchableSelect
                      options={toSelectOptions(
                        (vehicles || []).filter((v) => !selectedVehicleIds.includes(v.id)),
                        (v) => v.id,
                        (v) => {
                          const plateStr = v.plates?.[0]?.plate ?? v.plate ?? v.id;
                          return `${plateStr} ${v.brandName || ''} ${v.modelName || ''}`.trim();
                        },
                      )}
                      value=""
                      onChange={(value) => {
                        if (value && !selectedVehicleIds.includes(value)) {
                          setValue('vehicleIds', [...selectedVehicleIds, value], {
                            shouldValidate: true,
                          });
                        }
                      }}
                      placeholder="+ Adicionar placa..."
                      disabled={!selectedBranchId}
                    />
                  )}
                </div>
                {errors.vehicleIds && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.vehicleIds.message as string}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="type" className="text-sm text-muted-foreground mb-2">
                  Tipo *
                </Label>
                <SearchableSelect
                  id="type"
                  options={[
                    { value: 'PREVENTIVE', label: 'Preventiva' },
                    { value: 'CORRECTIVE', label: 'Corretiva' },
                  ]}
                  value={watch('type') || ''}
                  onChange={(value) => setValue('type', value as 'PREVENTIVE' | 'CORRECTIVE', { shouldValidate: true })}
                  placeholder="Selecione o tipo"
                  error={!!errors.type}
                />
                {errors.type && (
                  <p className="text-sm text-destructive mt-1">{errors.type.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="kmAtEntry" className="text-sm text-muted-foreground mb-2">
                  KM na Entrada *
                </Label>
                <Input
                  id="kmAtEntry"
                  type="text"
                  inputMode="numeric"
                  min={0}
                  placeholder="Ex: 10000"
                  required
                  {...register('kmAtEntry', { required: true })}
                  className="rounded-xl"
                />
                {errors.kmAtEntry && (
                  <p className="text-sm text-destructive mt-1">{errors.kmAtEntry.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm text-muted-foreground mb-2">
                Descrição
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                rows={3}
                className="rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="observations" className="text-sm text-muted-foreground mb-2">
                Observações
              </Label>
              <Textarea
                id="observations"
                {...register('observations')}
                rows={3}
                className="rounded-xl"
              />
            </div>
          </div>
        </SectionCard>

        {replacementItems.length > 0 && (
          <SectionCard title="Itens de troca por KM (do veículo)">
            <p className="text-sm text-muted-foreground mb-4">
              Marque quais itens foram trocados nesta ordem e informe os produtos do estoque usados em cada um.
            </p>
            <div className="space-y-6">
              {replacementItems.map((item) => {
                const isReplaced = (watch('replacementItemsChanged') ?? []).includes(item.id);
                const materialsForItem = (watch('materials') ?? []).map((m, i) => ({ ...m, index: i })).filter((m) => m.vehicleReplacementItemId === item.id);
                return (
                  <div key={item.id} className="border rounded-xl p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isReplaced}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setValue('replacementItemsChanged', [...(watch('replacementItemsChanged') ?? []), item.id], { shouldValidate: true });
                            } else {
                              setValue('replacementItemsChanged', (watch('replacementItemsChanged') ?? []).filter((id) => id !== item.id), { shouldValidate: true });
                              const indices = (watch('materials') ?? [])
                                .map((m, i) => (m.vehicleReplacementItemId === item.id ? i : -1))
                                .filter((i) => i >= 0)
                                .reverse();
                              indices.forEach((i) => removeMaterial(i));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">(troca a cada {item.replaceEveryKm?.toLocaleString('pt-BR')} km)</span>
                      </label>
                    </div>
                    {isReplaced && (
                      <div className="pl-6 space-y-2">
                        <p className="text-xs text-muted-foreground">Produtos do estoque usados para este item:</p>
                        {materialsForItem.map((m) => (
                          <div key={m.index} className="flex gap-2 items-end flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <SearchableSelect
                                options={toSelectOptions(
                                  products || [],
                                  (p) => p.id,
                                  (p) => (p.code ? `${p.name} (${p.code})` : p.name),
                                )}
                                value={watch(`materials.${m.index}.productId`)}
                                onChange={(value) => setValue(`materials.${m.index}.productId`, value, { shouldValidate: true })}
                                placeholder="Produto..."
                              />
                            </div>
                            <div className="w-24">
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                {...register(`materials.${m.index}.quantity`, { valueAsNumber: true })}
                                className="rounded-xl"
                              />
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => removeMaterial(m.index)}>
                              Remover
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendMaterial({ productId: '', vehicleReplacementItemId: item.id, quantity: 0.01, unitCost: 0 })}
                          disabled={!selectedBranchId}
                        >
                          Adicionar produto usado para este item
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        <SectionCard title="Funcionários">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => appendWorker({ employeeId: '', isResponsible: false })}
                disabled={!selectedBranchId}
              >
                Adicionar Funcionário
              </Button>
            </div>
            {workerFields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground mb-2">Funcionário</Label>
                  <SearchableSelect
                    options={toSelectOptions(
                      employees || [],
                      (e) => e.id,
                      (e) => e.name,
                    )}
                    value={watch(`workers.${index}.employeeId`)}
                    onChange={(value) => setValue(`workers.${index}.employeeId`, value, { shouldValidate: true })}
                    placeholder="Selecione um funcionário..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register(`workers.${index}.isResponsible`)}
                    className="rounded"
                  />
                  <Label className="text-sm text-muted-foreground">Responsável</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeWorker(index)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Serviços">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => appendService({ description: '', cost: 0 })}
              >
                Adicionar Serviço
              </Button>
            </div>
            {serviceFields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground mb-2">Descrição</Label>
                  <Input
                    {...register(`services.${index}.description`)}
                    placeholder="Ex: Troca de óleo e filtro"
                    className="rounded-xl"
                  />
                </div>
                <div className="w-40">
                  <Label className="text-sm text-muted-foreground mb-2">Custo</Label>
                  <CurrencyInput
                    placeholder="0,00"
                    error={!!errors.services?.[index]?.cost}
                    value={watch(`services.${index}.cost`)}
                    onChange={(value) => {
                      setValue(`services.${index}.cost`, value ?? undefined, { shouldValidate: true });
                    }}
                  />
                  {errors.services?.[index]?.cost && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.services[index]?.cost?.message}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeService(index)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Outros materiais">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Materiais consumidos na ordem que não estão vinculados a um item de troca por KM acima.
            </p>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendMaterial({ productId: '', quantity: 0.01, unitCost: 0 })
                }
                disabled={!selectedBranchId}
              >
                Adicionar Material
              </Button>
            </div>
            {materialFields
              .map((field, index) => ({ field, index }))
              .filter(({ index }) => !watch(`materials.${index}.vehicleReplacementItemId`))
              .map(({ field, index }) => (
                <MaterialField
                  key={field.id}
                  index={index}
                  field={field}
                  products={products}
                  selectedBranchId={selectedBranchId ?? undefined}
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  removeMaterial={removeMaterial}
                />
              ))}
          </div>
        </SectionCard>

        <div className="flex gap-4">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Salvando...' : 'Criar Ordem'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/maintenance')}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
