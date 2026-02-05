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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';

export default function NewMaintenanceLabelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

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

  const createMutation = useMutation({
    mutationFn: (data: CreateMaintenanceLabelDto) =>
      maintenanceLabelApi.create(data),
    onSuccess: (label) => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceLabels'] });
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

    if (replacementItems.length === 0) {
      toastErrorFromException(
        new Error('Este veículo não possui itens de troca por KM. Cadastre-os na edição do veículo.'),
        'Itens obrigatórios',
      );
      return;
    }

    createMutation.mutate({
      vehicleId: selectedVehicleId,
      companyId: DEFAULT_COMPANY_ID,
      branchId: effectiveBranchId,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Etiqueta de Manutenção"
        subtitle="Crie uma etiqueta com todos os itens de troca por KM do veículo"
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
                  return `${plateStr}${v.brandName || v.modelName ? ` ${v.brandName || ''} ${v.modelName || ''}`.trim() : ''}`;
                },
              )}
              value={selectedVehicleId}
              onChange={(value) => setSelectedVehicleId(value || '')}
              placeholder="Selecione um veículo"
              disabled={!effectiveBranchId || createMutation.isPending}
            />
            {selectedVehicleId && replacementItems.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Itens que serão incluídos na etiqueta ({replacementItems.length})
                </Label>
                <div className="border border-border rounded-xl p-4 bg-muted/30 max-h-64 overflow-y-auto">
                  <ul className="space-y-2">
                    {replacementItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-muted/50"
                      >
                        <span className="font-medium text-foreground">{item.name}</span>
                        <span className="text-muted-foreground text-xs shrink-0 ml-2">
                          Troca a cada {item.replaceEveryKm?.toLocaleString('pt-BR') ?? '-'} KM
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {selectedVehicleId && replacementItems.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                Este veículo não tem itens de troca por KM configurados. Cadastre-os na edição do veículo para gerar a etiqueta.
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
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !effectiveBranchId ||
                !selectedVehicleId ||
                replacementItems.length === 0
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
