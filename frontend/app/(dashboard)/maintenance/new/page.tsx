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
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useSearchableSelect, toSelectOptions } from '@/lib/hooks/use-searchable-select';

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
  services: z
    .array(
      z.object({
        description: z.string().min(1, 'Descrição é obrigatória'),
      }),
    )
    .min(1, 'Informe ao menos um serviço a ser realizado'),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

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
  } =   useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      vehicleIds: [],
      services: [{ description: '' }],
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
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({
    control,
    name: 'services',
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

    const validServices = (data.services ?? []).filter(
      (s) => s.description && String(s.description).trim().length > 0,
    );
    if (validServices.length === 0) {
      alert('Informe ao menos um serviço a ser realizado');
      return;
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
      services: validServices.map((s) => ({
        description: s.description!.trim(),
      })),
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
                  Placas (1 a 4) *
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

        <SectionCard title="Serviços">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => appendService({ description: '' })}
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

        <p className="text-sm text-muted-foreground">
          Após criar a ordem, você poderá imprimir o resumo (veículo e serviços), adicionar materiais por serviço e informar quais funcionários executaram cada serviço antes de concluir.
        </p>

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
