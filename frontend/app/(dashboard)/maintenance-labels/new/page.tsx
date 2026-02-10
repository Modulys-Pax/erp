'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceLabelApi, CreateMaintenanceLabelDto } from '@/lib/api/maintenance-label';
import { vehicleApi } from '@/lib/api/vehicle';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';

export default function NewMaintenanceLabelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles', effectiveBranchId],
    queryFn: () => vehicleApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
    enabled: !!effectiveBranchId,
  });

  const vehicles = vehiclesResponse?.data || [];

  const { data: selectedVehicle } = useQuery({
    queryKey: ['vehicles', selectedVehicleId],
    queryFn: () => vehicleApi.getById(selectedVehicleId),
    enabled: !!selectedVehicleId,
  });

  const replacementItems = selectedVehicle?.replacementItems ?? [];
  const allItemIds = replacementItems.map((r) => r.id);

  // Sem useEffect: quando o usuário não alterou nada, consideramos todos selecionados
  const effectiveSelectedIds =
    !hasUserToggled && replacementItems.length > 0 ? allItemIds : selectedProductIds;

  const handleVehicleChange = (value: string) => {
    setSelectedVehicleId(value || '');
    setHasUserToggled(false);
    setSelectedProductIds([]);
  };

  const toggleProduct = (id: string, checked: boolean) => {
    setHasUserToggled(true);
    setSelectedProductIds((prev) => {
      const base = hasUserToggled ? prev : allItemIds;
      return checked ? [...base, id] : base.filter((pid) => pid !== id);
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateMaintenanceLabelDto) =>
      maintenanceLabelApi.create(data),
    onSuccess: (label) => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceLabels'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toastSuccess('Etiqueta criada com sucesso');
      router.push(`/maintenance-labels/${label.id}`);
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao criar etiqueta');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!effectiveBranchId) {
      toastErrorFromException(
        new Error('Por favor, selecione uma filial na sidebar'),
        'Filial não selecionada',
      );
      return;
    }

    if (!selectedVehicleId) {
      toastErrorFromException(new Error('Selecione um veículo'), 'Veículo obrigatório');
      return;
    }

    if (effectiveSelectedIds.length === 0) {
      toastErrorFromException(
        new Error('Marque ao menos um item que foi trocado.'),
        'Itens obrigatórios',
      );
      return;
    }

    createMutation.mutate({
      vehicleId: selectedVehicleId,
      productIds: effectiveSelectedIds,
      companyId: DEFAULT_COMPANY_ID,
      branchId: effectiveBranchId,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Etiqueta de Manutenção"
        subtitle="Selecione o veículo e os itens de troca por KM para incluir na etiqueta"
      />

      <SectionCard title="Dados da Etiqueta">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="vehicle" className="text-sm text-muted-foreground mb-2 block">
              Veículo *
            </Label>
            <SearchableSelect
              id="vehicle"
              options={toSelectOptions(
                vehicles.filter((v) => v.active),
                (v) => v.id,
                (v) => {
                  const plateStr = v.plates?.[0]?.plate ?? v.plate ?? v.id;
                  const brandModel = [v.brandName, v.modelName].filter(Boolean).join(' ');
                  return brandModel ? `${plateStr} – ${brandModel}` : plateStr;
                },
              )}
              value={selectedVehicleId}
              onChange={handleVehicleChange}
              placeholder="Selecione um veículo"
              disabled={!effectiveBranchId || createMutation.isPending}
            />
          </div>

          {selectedVehicleId && replacementItems.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Marque os itens que foram trocados (a etiqueta mostrará todos) ({effectiveSelectedIds.length}/{replacementItems.length})
              </Label>
              <div className="border border-border rounded-xl p-4 bg-muted/30 max-h-64 overflow-y-auto">
                <ul className="space-y-2">
                  {replacementItems.map((item) => {
                      const isSelected = effectiveSelectedIds.includes(item.id);
                      return (
                        <li
                          key={item.id}
                          className={`flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg hover:bg-muted/50 ${createMutation.isPending ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          onClick={() => !createMutation.isPending && toggleProduct(item.id, !isSelected)}
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={`Incluir ${item.name} na etiqueta`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (!createMutation.isPending && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              toggleProduct(item.id, !isSelected);
                            }
                          }}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary ${
                              isSelected ? 'bg-primary' : ''
                            }`}
                            aria-hidden
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-primary-foreground" strokeWidth={2.5} />
                            )}
                          </span>
                          <span className="font-medium text-foreground flex-1">{item.name}</span>
                          <span className="text-muted-foreground text-xs shrink-0">
                            Troca a cada {item.replaceEveryKm?.toLocaleString('pt-BR') ?? '-'} KM
                          </span>
                        </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          {selectedVehicleId && replacementItems.length === 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              Este veículo não tem itens de troca por KM configurados. Cadastre-os na edição do veículo para gerar a etiqueta.
            </p>
          )}

          <div className="flex gap-2">
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
                createMutation.isPending ||
                !effectiveBranchId ||
                !selectedVehicleId ||
                effectiveSelectedIds.length === 0
              }
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Etiqueta'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
