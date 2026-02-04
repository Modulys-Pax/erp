'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  vehicleApi,
  UpdateVehicleDto,
  VehicleStatusHistory,
  VEHICLE_PLATE_TYPES,
  type VehiclePlateType,
} from '@/lib/api/vehicle';
import { vehicleBrandApi } from '@/lib/api/vehicle-brand';
import { vehicleModelApi } from '@/lib/api/vehicle-model';
import { maintenanceLabelApi } from '@/lib/api/maintenance-label';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils/date';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';

const PLATE_TYPE_LABELS: Record<VehiclePlateType, string> = {
  CAVALO: 'Cavalo',
  PRIMEIRA_CARRETA: 'Primeira carreta',
  DOLLY: 'Dolly',
  SEGUNDA_CARRETA: 'Segunda carreta',
};

const vehicleSchema = z
  .object({
    plates: z
      .array(
        z.object({
          type: z.enum(VEHICLE_PLATE_TYPES as unknown as [string, ...string[]]),
          plate: z.string().min(1, 'Placa é obrigatória'),
        }),
      )
      .min(1, 'Informe pelo menos uma placa'),
    brandId: z.string().uuid('Selecione uma marca').optional().or(z.literal('')),
    modelId: z.string().uuid('Selecione um modelo').optional().or(z.literal('')),
    year: z.coerce.number().int().min(1900).max(2100).optional().or(z.nan()),
    color: z.string().optional(),
    chassis: z.string().optional(),
    renavam: z.string().optional(),
    currentKm: z.coerce.number().int().min(0).optional().or(z.nan()),
    status: z.enum(['ACTIVE', 'MAINTENANCE', 'STOPPED']).optional(),
    companyId: z.string().uuid('Selecione uma empresa'),
    branchId: z.string().uuid('Selecione uma filial').optional().or(z.literal('')),
    active: z.boolean(),
    replacementItems: z
      .array(
        z.object({
          name: z.string().optional(),
          replaceEveryKm: z.coerce.number().int().min(1, 'Troca em KM deve ser pelo menos 1').optional().or(z.nan()),
        }),
      )
      .optional()
      .default([]),
  })
  .refine(
    (data) => {
      const types = data.plates.map((p) => p.type);
      return new Set(types).size === types.length;
    },
    { message: 'Não repita o mesmo tipo (cavalo, carreta, dolly)', path: ['plates'] },
  );

type VehicleFormData = z.infer<typeof vehicleSchema>;

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [kmDialogOpen, setKmDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [kmValue, setKmValue] = useState('');
  const [kmNotes, setKmNotes] = useState('');
  const [statusValue, setStatusValue] = useState<
    'ACTIVE' | 'MAINTENANCE' | 'STOPPED'
  >('ACTIVE');
  const [statusNotes, setStatusNotes] = useState('');

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => vehicleApi.getById(id),
  });

  const { data: statusHistory } = useQuery({
    queryKey: ['vehicles', id, 'history'],
    queryFn: () => vehicleApi.getStatusHistory(id),
    enabled: !!vehicle,
  });

  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();

  const { data: maintenanceDue, isLoading: maintenanceDueLoading } = useQuery({
    queryKey: ['maintenanceDue', id, effectiveBranchId],
    queryFn: () =>
      maintenanceLabelApi.getDueByVehicle(id, effectiveBranchId || undefined),
    enabled: !!vehicle && !!effectiveBranchId,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    reset,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'plates',
  });

  const {
    fields: replacementFields,
    append: appendReplacement,
    remove: removeReplacement,
  } = useFieldArray({ control, name: 'replacementItems' });

  const selectedBrandId = watch('brandId');
  // Usar brandId do veículo se ainda não tiver selecionado no form
  const effectiveBrandId = selectedBrandId || vehicle?.brandId;

  const plateTypeOptions = VEHICLE_PLATE_TYPES.map((t) => ({
    value: t,
    label: PLATE_TYPE_LABELS[t],
  }));

  const { data: brands = [] } = useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: () => vehicleBrandApi.getAll(),
  });

  const { data: models = [] } = useQuery({
    queryKey: ['vehicle-models', effectiveBrandId],
    queryFn: () => vehicleModelApi.getAll(effectiveBrandId || undefined),
    enabled: !!effectiveBrandId,
  });

  // Ref para rastrear se já resetamos o formulário para este veículo
  const lastVehicleIdRef = useRef<string | null>(null);

  // Resetar formulário quando os dados do veículo carregarem
  useEffect(() => {
    if (vehicle && !isLoading && lastVehicleIdRef.current !== vehicle.id) {
      lastVehicleIdRef.current = vehicle.id;
      const plates =
        vehicle.plates?.length > 0
          ? vehicle.plates.map((p) => ({ type: p.type, plate: p.plate }))
          : [{ type: 'CAVALO' as VehiclePlateType, plate: vehicle.plate || '' }];
      const replacementItems =
        vehicle.replacementItems?.map((r) => ({
          name: r.name ?? '',
          replaceEveryKm: r.replaceEveryKm,
        })) ?? [];
      reset({
        plates,
        replacementItems,
        brandId: vehicle.brandId || '',
        modelId: vehicle.modelId || '',
        year: vehicle.year || undefined,
        color: vehicle.color || '',
        chassis: vehicle.chassis || '',
        renavam: vehicle.renavam || '',
        currentKm:
          vehicle.currentKm !== undefined && vehicle.currentKm !== null
            ? vehicle.currentKm
            : undefined,
        status: vehicle.status || 'ACTIVE',
        branchId: isAdmin ? (effectiveBranchId || '') : (vehicle.branchId || ''),
        companyId: DEFAULT_COMPANY_ID,
        active: vehicle.active,
      });
      if (
        vehicle.currentKm !== undefined &&
        vehicle.currentKm !== null
      ) {
        setKmValue(vehicle.currentKm.toString());
      }
      setStatusValue(vehicle.status || 'ACTIVE');
    }
  }, [vehicle, isLoading, reset, isAdmin, effectiveBranchId]);

  // Setar modelId depois que os modelos forem carregados
  useEffect(() => {
    if (
      vehicle &&
      vehicle.modelId &&
      models.length > 0 &&
      lastVehicleIdRef.current === vehicle.id
    ) {
      // Verificar se o modelo existe na lista de modelos carregados
      const modelExists = models.some((m) => m.id === vehicle.modelId);
      if (modelExists) {
        // Forçar atualização do valor no select
        setValue('modelId', vehicle.modelId, { shouldValidate: false, shouldDirty: false });
      }
    }
  }, [vehicle, models, setValue]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateVehicleDto) => vehicleApi.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'history'] });
      await queryClient.refetchQueries({ queryKey: ['vehicles'] });
      router.push('/vehicles');
    },
  });

  // Limpar modelo quando a marca mudar (mas não durante o carregamento inicial)
  useEffect(() => {
    // Não executar durante o carregamento inicial do veículo
    if (!vehicle || isLoading || lastVehicleIdRef.current !== vehicle.id) return;
    
    // Só limpar se a marca realmente mudou (não é o valor inicial)
    if (selectedBrandId && selectedBrandId !== vehicle.brandId) {
      const currentModelId = watch('modelId');
      // Se o modelo atual não pertence à marca selecionada, limpar
      if (currentModelId) {
        const currentModel = models.find((m) => m.id === currentModelId);
        if (!currentModel || currentModel.brandId !== selectedBrandId) {
          setValue('modelId', '');
        }
      }
    } else if (!selectedBrandId && vehicle.brandId) {
      // Se a marca foi removida mas o veículo tinha uma marca, limpar modelo
      setValue('modelId', '');
    }
  }, [selectedBrandId, models, watch, setValue, vehicle, isLoading]);

  const updateKmMutation = useMutation({
    mutationFn: (data: { currentKm: number; notes?: string }) =>
      vehicleApi.updateKm(id, data),
    onSuccess: (updatedVehicle) => {
      // Atualizar cache imediatamente para evitar validação com dados desatualizados
      queryClient.setQueryData(['vehicles', id], updatedVehicle);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'history'] });
      setKmDialogOpen(false);
      setKmValue('');
      setKmNotes('');
      toastSuccess('Quilometragem atualizada com sucesso');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao atualizar quilometragem');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: {
      status: 'ACTIVE' | 'MAINTENANCE' | 'STOPPED';
      km?: number;
      notes?: string;
    }) => vehicleApi.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', id, 'history'] });
      setStatusDialogOpen(false);
      setStatusNotes('');
    },
  });

  const onSubmit = (data: VehicleFormData) => {
    const submitData: UpdateVehicleDto = {
      plates: data.plates.map((p) => ({ type: p.type as VehiclePlateType, plate: p.plate.trim() })),
      replacementItems:
        data.replacementItems?.filter((r) => r.name?.trim())?.map((r) => ({
          name: r.name!.trim(),
          replaceEveryKm: Number(r.replaceEveryKm),
        })) ?? [],
      companyId: DEFAULT_COMPANY_ID,
      brandId: data.brandId || undefined,
      modelId: data.modelId || undefined,
      year: isNaN(data.year as number) ? undefined : data.year,
      currentKm: isNaN(data.currentKm as number)
        ? undefined
        : data.currentKm,
      branchId: isAdmin ? (effectiveBranchId || undefined) : (vehicle?.branchId || undefined),
    };
    updateMutation.mutate(submitData);
  };

  const handleUpdateKm = () => {
    const km = parseInt(kmValue);
    if (isNaN(km) || km < 0) {
      alert('Quilometragem inválida');
      return;
    }
    if (vehicle?.currentKm && km < vehicle.currentKm) {
      alert('A nova quilometragem não pode ser menor que a anterior');
      return;
    }
    updateKmMutation.mutate({
      currentKm: km,
      notes: kmNotes || undefined,
    });
  };

  const handleUpdateStatus = () => {
    updateStatusMutation.mutate({
      status: statusValue,
      km: vehicle?.currentKm,
      notes: statusNotes || undefined,
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

  if (!vehicle) {
    return (
      <div className="space-y-6">
        <PageHeader title="Veículo não encontrado" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            O veículo solicitado não foi encontrado.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Veículo"
        subtitle="Atualize os dados do veículo"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Dados do Veículo</CardTitle>
          <Button
            type="submit"
            form="vehicle-form"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardHeader>
        <CardContent>
          <form
            id="vehicle-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Placas (cavalo, carretas, dolly) *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const usedTypes = watch('plates').map((p) => p.type);
                    const next = VEHICLE_PLATE_TYPES.find((t) => !usedTypes.includes(t));
                    if (next) append({ type: next, plate: '' });
                  }}
                  disabled={fields.length >= VEHICLE_PLATE_TYPES.length}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar placa
                </Button>
              </div>
              {errors.plates?.message && typeof errors.plates.message === 'string' && (
                <p className="text-sm text-destructive mb-2">{errors.plates.message}</p>
              )}
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex gap-2 items-end flex-wrap rounded-xl border border-border p-3 bg-muted/30"
                  >
                    <div className="flex-1 min-w-[140px]">
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <SearchableSelect
                        id={`plate-type-${index}`}
                        options={plateTypeOptions.filter(
                          (o) =>
                            watch(`plates.${index}.type`) === o.value ||
                            !watch('plates')
                              .map((p) => p.type)
                              .filter((_, i) => i !== index)
                              .includes(o.value),
                        )}
                        value={watch(`plates.${index}.type`)}
                        onChange={(value) =>
                          setValue(`plates.${index}.type`, value as VehiclePlateType, {
                            shouldValidate: true,
                          })
                        }
                        placeholder="Tipo"
                        error={!!errors.plates?.[index]?.type}
                      />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <Label className="text-xs text-muted-foreground">Placa</Label>
                      <Input
                        {...register(`plates.${index}.plate`)}
                        placeholder="ABC1D23"
                        className={errors.plates?.[index]?.plate ? 'border-destructive' : ''}
                      />
                      {errors.plates?.[index]?.plate && (
                        <p className="text-xs text-destructive mt-0.5">
                          {errors.plates[index]?.plate?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Itens para troca por KM (opcional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendReplacement({ name: '', replaceEveryKm: 10000 })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar item
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Itens que serão trocados a cada X KM neste veículo (ex: Óleo Motor, Filtro de óleo). Não usam estoque.
              </p>
              <div className="space-y-3">
                {replacementFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex gap-2 items-end flex-wrap rounded-xl border border-border p-3 bg-muted/30"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <Label className="text-xs text-muted-foreground">Nome do item</Label>
                      <Input
                        id={`replacement-name-${index}`}
                        {...register(`replacementItems.${index}.name`)}
                        placeholder="Ex: Óleo Motor 15W40"
                        className={errors.replacementItems?.[index]?.name ? 'border-destructive' : ''}
                      />
                      {errors.replacementItems?.[index]?.name && (
                        <p className="text-xs text-destructive mt-0.5">
                          {errors.replacementItems[index]?.name?.message}
                        </p>
                      )}
                    </div>
                    <div className="w-32">
                      <Label className="text-xs text-muted-foreground">Troca a cada (KM)</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="10000"
                        {...register(`replacementItems.${index}.replaceEveryKm`, {
                          valueAsNumber: true,
                        })}
                        className={errors.replacementItems?.[index]?.replaceEveryKm ? 'border-destructive' : ''}
                      />
                      {errors.replacementItems?.[index]?.replaceEveryKm && (
                        <p className="text-xs text-destructive mt-0.5">
                          {errors.replacementItems[index]?.replaceEveryKm?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReplacement(index)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brandId">Marca</Label>
                <SearchableSelect
                  id="brandId"
                  options={toSelectOptions(
                    brands,
                    (b) => b.id,
                    (b) => b.name,
                  )}
                  value={watch('brandId') || ''}
                  onChange={(value) => {
                    setValue('brandId', value || '', { shouldValidate: true });
                    setValue('modelId', '', { shouldValidate: true });
                  }}
                  placeholder="Selecione uma marca"
                  error={!!errors.brandId}
                />
                {errors.brandId && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.brandId.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="modelId">Modelo</Label>
                <SearchableSelect
                  id="modelId"
                  options={toSelectOptions(
                    models,
                    (m) => m.id,
                    (m) => m.name,
                  )}
                  value={watch('modelId') || ''}
                  onChange={(value) => setValue('modelId', value || '', { shouldValidate: true })}
                  placeholder={effectiveBrandId ? 'Selecione um modelo' : 'Selecione primeiro uma marca'}
                  disabled={!effectiveBrandId}
                  error={!!errors.modelId}
                />
                {errors.modelId && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.modelId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Ano</Label>
                <Input
                  id="year"
                  type="number"
                  {...register('year', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="color">Cor</Label>
                <Input id="color" {...register('color')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chassis">Chassi</Label>
                <Input id="chassis" {...register('chassis')} />
              </div>
              <div>
                <Label htmlFor="renavam">RENAVAM</Label>
                <Input id="renavam" {...register('renavam')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentKm">Quilometragem Atual</Label>
                <Input
                  id="currentKm"
                  type="number"
                  {...register('currentKm', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <SearchableSelect
                  id="status"
                  options={[
                    { value: 'ACTIVE', label: 'Em Operação' },
                    { value: 'MAINTENANCE', label: 'Em Manutenção' },
                    { value: 'STOPPED', label: 'Parado' },
                  ]}
                  value={watch('status') || ''}
                  onChange={(value) => setValue('status', value as 'ACTIVE' | 'MAINTENANCE' | 'STOPPED' | undefined, { shouldValidate: true })}
                  placeholder="Selecione o status"
                  error={!!errors.status}
                />
                {errors.status && (
                  <p className="text-sm text-destructive mt-1">{errors.status.message}</p>
                )}
              </div>
            </div>

            <input
              type="hidden"
              {...register('branchId')}
              value={isAdmin ? (effectiveBranchId || '') : (vehicle?.branchId || '')}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                {...register('active')}
                className="rounded"
              />
              <Label htmlFor="active">Veículo ativo</Label>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximas trocas</CardTitle>
          <CardDescription>
            Produtos com troca por KM vinculados a este veículo (KM de referência:{' '}
            {maintenanceDue
              ? maintenanceDue.referenceKm.toLocaleString('pt-BR')
              : (vehicle?.currentKm !== undefined &&
                vehicle?.currentKm !== null)
                ? vehicle.currentKm.toLocaleString('pt-BR')
                : '—'}
            {' km — última marcação ou KM atual)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {maintenanceDueLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-muted animate-pulse rounded"
                />
              ))}
            </div>
          ) : !maintenanceDue || maintenanceDue.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto para troca por KM cadastrado neste veículo. Adicione produtos na seção &quot;Produtos para troca por KM&quot; ao editar o veículo acima.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Produto</th>
                    <th className="text-right py-2 font-medium">
                      Última troca (KM)
                    </th>
                    <th className="text-right py-2 font-medium">
                      Próxima troca (KM)
                    </th>
                    <th className="text-right py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceDue.items.map((item) => (
                    <tr key={item.id ?? item.productId} className="border-b last:border-0">
                      <td className="py-2">
                        <span className="font-medium">{item.name ?? item.productName}</span>
                        {item.replaceEveryKm && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            (a cada {item.replaceEveryKm.toLocaleString('pt-BR')} km)
                          </span>
                        )}
                      </td>
                      <td className="text-right py-2 tabular-nums">
                        {item.lastChangeKm.toLocaleString('pt-BR')}
                      </td>
                      <td className="text-right py-2 tabular-nums">
                        {item.nextChangeKm.toLocaleString('pt-BR')}
                      </td>
                      <td className="text-right py-2">
                        {item.status === 'ok' && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          >
                            No prazo
                          </Badge>
                        )}
                        {item.status === 'warning' && (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          >
                            Próximo de trocar
                          </Badge>
                        )}
                        {item.status === 'due' && (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          >
                            Trocar agora
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Atualize quilometragem ou status do veículo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Dialog open={kmDialogOpen} onOpenChange={setKmDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Atualizar Quilometragem
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atualizar Quilometragem</DialogTitle>
                  <DialogDescription>
                    Informe a nova quilometragem do veículo
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="km">Quilometragem Atual</Label>
                    <Input
                      id="km"
                      type="number"
                      value={kmValue}
                      onChange={(e) => setKmValue(e.target.value)}
                      placeholder={
                        vehicle?.currentKm !== undefined &&
                        vehicle?.currentKm !== null
                          ? `Atual: ${vehicle.currentKm.toLocaleString('pt-BR')} km`
                          : 'Ex: 50000'
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="kmNotes">Observações (opcional)</Label>
                    <Textarea
                      id="kmNotes"
                      value={kmNotes}
                      onChange={(e) => setKmNotes(e.target.value)}
                      placeholder="Ex: Atualização após viagem"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setKmDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpdateKm}
                    disabled={updateKmMutation.isPending}
                  >
                    {updateKmMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Alterar Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Status do Veículo</DialogTitle>
                  <DialogDescription>
                    Selecione o novo status do veículo
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="statusSelect">Status</Label>
                    <SearchableSelect
                      id="statusSelect"
                      options={[
                        { value: 'ACTIVE', label: 'Em Operação' },
                        { value: 'MAINTENANCE', label: 'Em Manutenção' },
                        { value: 'STOPPED', label: 'Parado' },
                      ]}
                      value={statusValue}
                      onChange={(value) =>
                        setStatusValue(
                          value as 'ACTIVE' | 'MAINTENANCE' | 'STOPPED',
                        )
                      }
                      placeholder="Selecione o status"
                    />
                  </div>
                  <div>
                    <Label htmlFor="statusNotes">Observações (opcional)</Label>
                    <Textarea
                      id="statusNotes"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Ex: Veículo entrando em manutenção preventiva"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setStatusDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações Atuais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Quilometragem:
              </span>{' '}
              <span className="text-sm text-foreground">
                {(vehicle?.currentKm !== undefined &&
                  vehicle?.currentKm !== null)
                  ? `${vehicle.currentKm.toLocaleString('pt-BR')} km`
                  : 'Não informada'}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Status:</span>{' '}
              <span className="text-sm">
                {vehicle?.status === 'ACTIVE' && (
                  <span className="text-blue-600 dark:text-blue-400">Em Operação</span>
                )}
                {vehicle?.status === 'MAINTENANCE' && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Em Manutenção
                  </span>
                )}
                {vehicle?.status === 'STOPPED' && (
                  <span className="text-muted-foreground">Parado</span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Status</CardTitle>
          <CardDescription>
            Registro de todas as mudanças de status e quilometragem
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusHistory && statusHistory.length > 0 ? (
            <div className="space-y-4">
              {statusHistory.map((item: VehicleStatusHistory) => (
                <div
                  key={item.id}
                  className="border-l-4 border-border pl-4 py-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {item.status === 'ACTIVE' && 'Em Operação'}
                          {item.status === 'MAINTENANCE' && 'Em Manutenção'}
                          {item.status === 'STOPPED' && 'Parado'}
                        </span>
                        {item.km !== undefined && (
                          <span className="text-sm text-muted-foreground">
                            • {item.km.toLocaleString('pt-BR')} km
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.maintenanceOrderId ? (
                            <span className="flex flex-col gap-0.5">
                              <Link
                                href={`/maintenance/${item.maintenanceOrderId}`}
                                className="text-primary hover:underline font-medium"
                              >
                                {item.notes}
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                Ver detalhes da ordem e nota anexada (quando houver) →
                              </span>
                            </span>
                          ) : (
                            item.notes
                          )}
                        </p>
                      )}
                      {item.maintenanceOrderId && !item.notes && (
                        <p className="text-sm mt-1">
                          <Link
                            href={`/maintenance/${item.maintenanceOrderId}`}
                            className="text-primary hover:underline font-medium"
                          >
                            Ver detalhes da ordem de manutenção (troca na estrada)
                          </Link>
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum histórico registrado ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
