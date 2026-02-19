'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  maintenanceLabelApi,
  RegisterProductChangeDto,
} from '@/lib/api/maintenance-label';
import { maintenanceApi } from '@/lib/api/maintenance';
import { vehicleApi } from '@/lib/api/vehicle';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';
import { roundCurrency } from '@/lib/utils/numbers';
import { Plus, Trash2 } from 'lucide-react';

type FormData = {
  vehicleIds: string[];
  changeKm: string;
  serviceDate: string; // YYYY-MM-DD
  items: Array<{
    vehicleReplacementItemId: string;
    cost: string | number; // CurrencyInput pode setar number
  }>;
};

const defaultItem: FormData['items'][0] = {
  vehicleReplacementItemId: '',
  cost: '',
};

export default function NewProductChangePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { watch, setValue, register, handleSubmit, control } = useForm<FormData>({
    defaultValues: {
      vehicleIds: [],
      changeKm: '',
      serviceDate: '',
      items: [defaultItem],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const selectedVehicleIds = watch('vehicleIds') ?? [];

  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles', effectiveBranchId],
    queryFn: () =>
      vehicleApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
    enabled: !!effectiveBranchId,
  });

  const vehicles = vehiclesResponse?.data || [];

  // Itens de troca: união dos itens de todos os veículos selecionados
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

  const items = watch('items');
  const totalCost = items.reduce((sum, item) => {
    const raw = item.cost;
    const c =
      raw != null && raw !== ''
        ? Number(typeof raw === 'number' ? raw : String(raw).replace(',', '.'))
        : 0;
    return sum + (Number.isFinite(c) && c >= 0 ? c : 0);
  }, 0);

  const registerMutation = useMutation({
    mutationFn: (data: RegisterProductChangeDto) =>
      maintenanceLabelApi.registerProductChange(data),
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao registrar troca');
    },
  });

  const onSubmit = (data: FormData) => {
    if (!effectiveBranchId) {
      toastErrorFromException(
        new Error('Por favor, selecione uma filial na sidebar'),
        'Filial não selecionada',
      );
      return;
    }

    if (!data.vehicleIds?.length) {
      toastErrorFromException(new Error('Selecione pelo menos 1 placa'), 'Placas obrigatórias');
      return;
    }

    const changeKmNum = data.changeKm?.trim()
      ? Number(String(data.changeKm).replace(/\D/g, ''))
      : NaN;
    if (!Number.isFinite(changeKmNum) || changeKmNum < 0) {
      toastErrorFromException(
        new Error('Informe uma quilometragem válida'),
        'KM inválido',
      );
      return;
    }

    const validItems = data.items.filter(
      (i) => i.vehicleReplacementItemId && i.vehicleReplacementItemId.length > 0,
    );
    if (validItems.length === 0) {
      toastErrorFromException(
        new Error('Adicione pelo menos um item trocado'),
        'Itens obrigatórios',
      );
      return;
    }

    const payload: RegisterProductChangeDto = {
      vehicleIds: data.vehicleIds,
      changeKm: Math.round(changeKmNum),
      items: validItems.map((i) => {
        const raw = i.cost;
        const costNum =
          raw != null && raw !== ''
            ? Number(typeof raw === 'number' ? raw : String(raw).replace(',', '.'))
            : undefined;
        return {
          vehicleReplacementItemId: i.vehicleReplacementItemId,
          cost:
            costNum !== undefined &&
            Number.isFinite(costNum) &&
            costNum >= 0
              ? roundCurrency(costNum)
              : undefined,
        };
      }),
      serviceDate: data.serviceDate?.trim()
        ? data.serviceDate.trim()
        : undefined,
      companyId: DEFAULT_COMPANY_ID,
      branchId: effectiveBranchId,
    };

    (async () => {
      try {
        const result = await registerMutation.mutateAsync(payload);
        const fileToUpload = fileInputRef.current?.files?.[0] ?? attachmentFile;
        if (fileToUpload && fileToUpload.size > 0) {
          await maintenanceApi.uploadAttachment(result.orderId, fileToUpload);
        }
        queryClient.invalidateQueries({ queryKey: ['maintenanceLabels'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['maintenanceDue'] });
        queryClient.invalidateQueries({ queryKey: ['vehicle-costs'] });
        queryClient.invalidateQueries({ queryKey: ['maintenance'] });
        queryClient.invalidateQueries({ queryKey: ['account-payable'] });
        toastSuccess('Troca registrada com sucesso');
        router.push('/product-changes');
      } catch {
        // erro já tratado em onError
      }
    })();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar Troca na Estrada"
        subtitle="Registre os itens que foram trocados na estrada (um ou mais)"
      />

      <SectionCard title="Dados da Troca">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Placas (1 a 4) *
            </Label>
            <div className="flex flex-wrap gap-2">
              {selectedVehicleIds.map((vid) => {
                const v = vehicles.find((x) => x.id === vid);
                const plateLabel = v?.plates?.[0]
                  ? `${v.plates[0].plate} (${v.plates[0].type})`
                  : v?.plate ?? vid;
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
                        setValue('items', [{ ...defaultItem }]);
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
                    vehicles.filter((v) => v.active && !selectedVehicleIds.includes(v.id)),
                    (v) => v.id,
                    (v) => {
                      const plateStr = v.plates?.[0]?.plate ?? v.plate ?? v.id;
                      return `${plateStr}${v.brandName || v.modelName ? ` ${v.brandName || ''} ${v.modelName || ''}`.trim() : ''}`;
                    },
                  )}
                  value=""
                  onChange={(value) => {
                    if (value && !selectedVehicleIds.includes(value)) {
                      setValue('vehicleIds', [...selectedVehicleIds, value], {
                        shouldValidate: true,
                      });
                      setValue('items', [{ ...defaultItem }]);
                    }
                  }}
                  placeholder="+ Adicionar placa..."
                  disabled={!effectiveBranchId || registerMutation.isPending}
                />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="changeKm" className="text-sm text-muted-foreground mb-2 block">
              Quilometragem da Troca (KM) *
            </Label>
            <Input
              id="changeKm"
              type="text"
              inputMode="numeric"
              placeholder="Ex: 60000"
              className="rounded-xl"
              disabled={registerMutation.isPending}
              required
              {...register('changeKm', { required: true })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              KM em que os itens foram trocados na estrada
            </p>
          </div>

          <div>
            <Label htmlFor="serviceDate" className="text-sm text-muted-foreground mb-2 block">
              Data de realização do serviço
            </Label>
            <Input
              id="serviceDate"
              type="date"
              className="rounded-xl"
              disabled={registerMutation.isPending}
              {...register('serviceDate')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Data em que o serviço foi realizado na rua (opcional)
            </p>
          </div>

          <div>
            <Label htmlFor="attachment" className="text-sm text-muted-foreground mb-2 block">
              Anexar nota (PDF ou imagem)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="attachment"
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                className="rounded-xl max-w-xs"
                disabled={registerMutation.isPending}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              />
              {attachmentFile && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {attachmentFile.name}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Nota de terceiro (ex.: oficina na estrada). Você poderá visualizar o anexo depois na ordem de manutenção.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-muted-foreground">
                Itens trocados *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...defaultItem })}
                disabled={
                  selectedVehicleIds.length === 0 ||
                  replacementItems.length === 0 ||
                  registerMutation.isPending
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar item
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const costVal = watch(`items.${index}.cost`);
                const costNum =
                  costVal != null && costVal !== ''
                    ? Number(
                        typeof costVal === 'number'
                          ? costVal
                          : String(costVal).replace(',', '.'),
                      )
                    : undefined;
                return (
                <div
                  key={field.id}
                  className="flex gap-3 items-end p-3 border rounded-xl bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Item
                    </Label>
                    <SearchableSelect
                      options={replacementItems.map((r) => ({
                        value: r.id,
                        label: `${r.name} (Troca a cada ${r.replaceEveryKm.toLocaleString('pt-BR')} KM)`,
                      }))}
                      value={watch(`items.${index}.vehicleReplacementItemId`)}
                      onChange={(value) =>
                        setValue(`items.${index}.vehicleReplacementItemId`, value || '')
                      }
                      placeholder="Selecione o item"
                      disabled={
                        selectedVehicleIds.length === 0 ||
                        replacementItems.length === 0 ||
                        registerMutation.isPending
                      }
                    />
                  </div>
                  <div className="w-40">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Custo (R$)
                    </Label>
                    <CurrencyInput
                      placeholder="0,00"
                      className="rounded-xl"
                      disabled={registerMutation.isPending}
                      value={costNum !== undefined && !Number.isNaN(costNum) ? costNum : undefined}
                      onChange={(value) =>
                        setValue(`items.${index}.cost`, value ?? '', {
                          shouldValidate: true,
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1 || registerMutation.isPending}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
              })}
            </div>
            {replacementItems.length === 0 && selectedVehicleIds.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Este veículo não tem itens de troca por KM configurados. Configure na
                edição do veículo.
              </p>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex justify-end py-2">
              <span className="text-sm font-medium text-foreground">
                Total: R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                registerMutation.isPending ||
                !effectiveBranchId ||
                selectedVehicleIds.length === 0 ||
                !watch('changeKm')?.trim() ||
                validItemsLength(watch('items')) === 0
              }
            >
              {registerMutation.isPending ? 'Registrando...' : 'Registrar Troca'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

function validItemsLength(items: FormData['items']): number {
  return items.filter(
    (i) => i.vehicleReplacementItemId && i.vehicleReplacementItemId.length > 0,
  ).length;
}
