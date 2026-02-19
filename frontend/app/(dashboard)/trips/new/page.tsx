'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { tripApi, CreateTripDto, TripStatus } from '@/lib/api/trip';
import { customerApi } from '@/lib/api/customer';
import { vehicleApi, getVehicleOptionLabel } from '@/lib/api/vehicle';
import { employeeApi } from '@/lib/api/employee';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';

const schema = z.object({
  customerId: z.string().min(1, 'Selecione o cliente'),
  vehicleIds: z
    .array(z.string().uuid())
    .min(1, 'Selecione pelo menos 1 placa')
    .max(4, 'Selecione no máximo 4 placas'),
  driverId: z.string().min(1, 'Selecione o motorista'),
  origin: z.string().min(1, 'Origem é obrigatória'),
  destination: z.string().min(1, 'Destino é obrigatório'),
  freightValue: z.coerce.number().min(0, 'Valor deve ser ≥ 0'),
  status: z.enum(['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  scheduledDepartureAt: z.string().optional(),
  scheduledArrivalAt: z.string().optional(),
  actualDepartureAt: z.string().optional(),
  actualArrivalAt: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewTripPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleIds: [],
      status: 'DRAFT',
      freightValue: 0,
    },
  });

  const selectedVehicleIds = watch('vehicleIds') ?? [];

  const { data: customersData } = useQuery({
    queryKey: ['customers', effectiveBranchId],
    queryFn: () =>
      customerApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
  });
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', effectiveBranchId],
    queryFn: () =>
      vehicleApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
  });
  const { data: employeesData } = useQuery({
    queryKey: ['employees', effectiveBranchId],
    queryFn: () =>
      employeeApi.getAll(effectiveBranchId ?? undefined, false, 1, 500),
  });

  const vehicles = vehiclesData?.data ?? [];
  const customerOptions =
    customersData?.data?.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const driverOptions =
    employeesData?.data?.map((e) => ({ value: e.id, label: e.name })) ?? [];

  const createMutation = useMutation({
    mutationFn: (data: CreateTripDto) => tripApi.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      toastSuccess('Viagem cadastrada. Conta a Receber (Prevista) gerada.');
      router.push('/trips');
    },
    onError: (err) => toastErrorFromException(err, 'Erro ao cadastrar viagem'),
  });

  const onSubmit = (data: FormData) => {
    if (!effectiveBranchId || !data.vehicleIds?.length) return;
    createMutation.mutate({
      customerId: data.customerId,
      vehicleIds: data.vehicleIds,
      driverId: data.driverId,
      origin: data.origin,
      destination: data.destination,
      freightValue: data.freightValue,
      status: data.status as TripStatus,
      scheduledDepartureAt: data.scheduledDepartureAt || undefined,
      scheduledArrivalAt: data.scheduledArrivalAt || undefined,
      actualDepartureAt: data.actualDepartureAt || undefined,
      actualArrivalAt: data.actualArrivalAt || undefined,
      notes: data.notes || undefined,
      branchId: effectiveBranchId,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Viagem"
        subtitle="Ao cadastrar, uma Conta a Receber com status Prevista é criada. Ao marcar a viagem como Concluída, a CR será atualizada para Realizada."
      />
      <SectionCard title="Dados da viagem">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Cliente *</Label>
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={customerOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Selecione o cliente"
                    className="mt-1"
                  />
                )}
              />
              {errors.customerId && (
                <p className="text-sm text-destructive mt-1">
                  {errors.customerId.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm text-muted-foreground mb-2">
                Placas (1 a 4) *
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedVehicleIds.map((vid) => {
                  const v = vehicles.find((x) => x.id === vid);
                  const plateLabel = v ? getVehicleOptionLabel(v) : vid;
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
                            { shouldValidate: true },
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
                      vehicles.filter((v) => !selectedVehicleIds.includes(v.id)),
                      (v) => v.id,
                      (v) => getVehicleOptionLabel(v),
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
                    disabled={!effectiveBranchId}
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
              <Label>Motorista *</Label>
              <Controller
                name="driverId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={driverOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Selecione o motorista"
                    className="mt-1"
                  />
                )}
              />
              {errors.driverId && (
                <p className="text-sm text-destructive mt-1">
                  {errors.driverId.message}
                </p>
              )}
            </div>
            <div>
              <Label>Valor do frete (R$) *</Label>
              <Controller
                name="freightValue"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...field}
                    className="mt-1"
                  />
                )}
              />
              {errors.freightValue && (
                <p className="text-sm text-destructive mt-1">
                  {errors.freightValue.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Origem *</Label>
              <Controller
                name="origin"
                control={control}
                render={({ field }) => (
                  <Input placeholder="Ex: São Paulo" {...field} className="mt-1" />
                )}
              />
              {errors.origin && (
                <p className="text-sm text-destructive mt-1">
                  {errors.origin.message}
                </p>
              )}
            </div>
            <div>
              <Label>Destino *</Label>
              <Controller
                name="destination"
                control={control}
                render={({ field }) => (
                  <Input placeholder="Ex: Curitiba" {...field} className="mt-1" />
                )}
              />
              {errors.destination && (
                <p className="text-sm text-destructive mt-1">
                  {errors.destination.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Data/hora prevista saída</Label>
              <Controller
                name="scheduledDepartureAt"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="mt-1"
                  />
                )}
              />
            </div>
            <div>
              <Label>Data/hora prevista chegada</Label>
              <Controller
                name="scheduledArrivalAt"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="mt-1"
                  />
                )}
              />
            </div>
            <div>
              <Label>Data/hora real saída</Label>
              <Controller
                name="actualDepartureAt"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="mt-1"
                  />
                )}
              />
            </div>
            <div>
              <Label>Data/hora real chegada</Label>
              <Controller
                name="actualArrivalAt"
                control={control}
                render={({ field }) => (
                  <Input
                    type="datetime-local"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="mt-1"
                  />
                )}
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={[
                    { value: 'DRAFT', label: 'Rascunho' },
                    { value: 'SCHEDULED', label: 'Agendada' },
                    { value: 'IN_PROGRESS', label: 'Em andamento' },
                    { value: 'COMPLETED', label: 'Concluída' },
                    { value: 'CANCELLED', label: 'Cancelada' },
                  ]}
                  value={field.value ?? 'DRAFT'}
                  onValueChange={field.onChange}
                  className="mt-1 max-w-xs"
                />
              )}
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="Observações da viagem"
                  {...field}
                  className="mt-1"
                />
              )}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Cadastrar viagem'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/trips')}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
