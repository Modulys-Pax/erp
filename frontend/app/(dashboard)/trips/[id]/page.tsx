'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tripApi,
  Trip,
  UpdateTripDto,
  getTripStatusLabel,
  CreateTripExpenseDto,
} from '@/lib/api/trip';
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
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Can } from '@/components/auth/permission-gate';

const schema = z.object({
  customerId: z.string().min(1),
  vehicleIds: z
    .array(z.string().uuid())
    .min(1, 'Selecione pelo menos 1 placa')
    .max(4, 'Selecione no máximo 4 placas'),
  driverId: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  freightValue: z.coerce.number().min(0),
  status: z.enum(['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  scheduledDepartureAt: z.string().optional(),
  scheduledArrivalAt: z.string().optional(),
  actualDepartureAt: z.string().optional(),
  actualArrivalAt: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const expenseSchema = z.object({
  tripExpenseTypeId: z.string().min(1, 'Selecione o tipo'),
  amount: z.coerce.number().min(0.01, 'Valor obrigatório'),
  description: z.string().optional(),
  expenseDate: z.string().min(1, 'Data obrigatória'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripApi.getById(id),
    enabled: !!id,
  });

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

  const { data: expenseTypes = [] } = useQuery({
    queryKey: ['trip-expense-types', effectiveBranchId],
    queryFn: () => tripApi.getExpenseTypes(effectiveBranchId ?? undefined),
  });

  const vehicles = vehiclesData?.data ?? [];
  const customerOptions =
    customersData?.data?.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const driverOptions =
    employeesData?.data?.map((e) => ({ value: e.id, label: e.name })) ?? [];
  const expenseTypeOptions =
    expenseTypes?.map((t) => ({ value: t.id, label: t.name })) ?? [];

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: trip
      ? {
          customerId: trip.customerId,
          vehicleIds: (trip.vehicleIds && trip.vehicleIds.length > 0)
            ? trip.vehicleIds
            : (trip.vehicleId ? [trip.vehicleId] : []),
          driverId: trip.driverId,
          origin: trip.origin,
          destination: trip.destination,
          freightValue: trip.freightValue,
          status: trip.status,
          scheduledDepartureAt: trip.scheduledDepartureAt
            ? trip.scheduledDepartureAt.slice(0, 16)
            : '',
          scheduledArrivalAt: trip.scheduledArrivalAt
            ? trip.scheduledArrivalAt.slice(0, 16)
            : '',
          actualDepartureAt: trip.actualDepartureAt
            ? trip.actualDepartureAt.slice(0, 16)
            : '',
          actualArrivalAt: trip.actualArrivalAt
            ? trip.actualArrivalAt.slice(0, 16)
            : '',
          notes: trip.notes ?? '',
        }
      : undefined,
  });

  const selectedVehicleIds = watch('vehicleIds') ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTripDto) => tripApi.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trips', 'trip'] });
      toastSuccess(
        trip?.status !== 'COMPLETED'
          ? 'Viagem atualizada.'
          : 'Viagem concluída. Conta a Receber marcada como Realizada.'
      );
    },
    onError: (err) => toastErrorFromException(err, 'Erro ao atualizar viagem'),
  });

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: new Date().toISOString().slice(0, 10),
      amount: 0,
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: CreateTripExpenseDto) =>
      tripApi.createExpense(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trip', id] });
      toastSuccess('Despesa adicionada. Conta a Pagar gerada e vinculada ao veículo.');
      setExpenseDialogOpen(false);
      expenseForm.reset({
        tripExpenseTypeId: '',
        amount: 0,
        description: '',
        expenseDate: new Date().toISOString().slice(0, 10),
      });
    },
    onError: (err) =>
      toastErrorFromException(err, 'Erro ao adicionar despesa'),
  });

  const removeExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => tripApi.removeExpense(id, expenseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trip', id] });
      toastSuccess('Despesa removida.');
    },
    onError: (err) =>
      toastErrorFromException(err, 'Erro ao remover despesa'),
  });

  const onSubmitExpense = (data: ExpenseFormData) => {
    createExpenseMutation.mutate({
      tripExpenseTypeId: data.tripExpenseTypeId,
      amount: data.amount,
      description: data.description,
      expenseDate: data.expenseDate,
    });
  };

  const onSubmit = (data: FormData) => {
    updateMutation.mutate({
      customerId: data.customerId,
      vehicleIds: data.vehicleIds,
      driverId: data.driverId,
      origin: data.origin,
      destination: data.destination,
      freightValue: data.freightValue,
      status: data.status,
      scheduledDepartureAt: data.scheduledDepartureAt || undefined,
      scheduledArrivalAt: data.scheduledArrivalAt || undefined,
      actualDepartureAt: data.actualDepartureAt || undefined,
      actualArrivalAt: data.actualArrivalAt || undefined,
      notes: data.notes || undefined,
    });
  };

  if (isLoading || !trip) {
    return (
      <div className="space-y-6">
        <PageHeader title="Viagem" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const statusBadgeClass: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Viagem: ${trip.origin} → ${trip.destination}`}
        subtitle={
          trip.accountReceivableId
            ? 'Conta a Receber vinculada. Ao marcar como Concluída, a CR será atualizada para Realizada.'
            : undefined
        }
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/trips">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <Badge className={statusBadgeClass[trip.status] ?? ''}>
            {getTripStatusLabel(trip.status)}
          </Badge>
        </div>
      </PageHeader>

      {(trip.totalExpenses !== undefined || trip.profit !== undefined) && (
        <SectionCard title="Resumo financeiro da viagem">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Valor do frete
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(trip.freightValue)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Total despesas
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(trip.totalExpenses ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Lucro
              </p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(trip.profit ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Margem %
              </p>
              <p className="text-lg font-semibold">
                {(trip.marginPercent ?? 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Despesas da viagem"
        action={
          <Can permission="trips.create">
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar despesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar despesa</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Ao salvar, uma Conta a Pagar será gerada e vinculada ao
                  veículo da viagem.
                </p>
                <form
                  onSubmit={expenseForm.handleSubmit(onSubmitExpense)}
                  className="space-y-4"
                >
                  <div>
                    <Label>Tipo *</Label>
                    <Controller
                      name="tripExpenseTypeId"
                      control={expenseForm.control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={expenseTypeOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Selecione o tipo"
                          className="mt-1"
                        />
                      )}
                    />
                    {expenseForm.formState.errors.tripExpenseTypeId && (
                      <p className="text-sm text-destructive mt-1">
                        {expenseForm.formState.errors.tripExpenseTypeId.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Valor (R$) *</Label>
                    <Controller
                      name="amount"
                      control={expenseForm.control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          min={0.01}
                          {...field}
                          className="mt-1"
                        />
                      )}
                    />
                    {expenseForm.formState.errors.amount && (
                      <p className="text-sm text-destructive mt-1">
                        {expenseForm.formState.errors.amount.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Data *</Label>
                    <Controller
                      name="expenseDate"
                      control={expenseForm.control}
                      render={({ field }) => (
                        <Input type="date" {...field} className="mt-1" />
                      )}
                    />
                    {expenseForm.formState.errors.expenseDate && (
                      <p className="text-sm text-destructive mt-1">
                        {expenseForm.formState.errors.expenseDate.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Controller
                      name="description"
                      control={expenseForm.control}
                      render={({ field }) => (
                        <Input
                          placeholder="Opcional"
                          {...field}
                          className="mt-1"
                        />
                      )}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={createExpenseMutation.isPending}
                    >
                      {createExpenseMutation.isPending
                        ? 'Salvando...'
                        : 'Adicionar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setExpenseDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        }
      >
        {trip.expenses && trip.expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Tipo</th>
                  <th className="text-left py-2 font-medium">Data</th>
                  <th className="text-right py-2 font-medium">Valor</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {trip.expenses.map((exp) => (
                  <tr key={exp.id} className="border-b last:border-0">
                    <td className="py-2">
                      {exp.tripExpenseTypeName ?? exp.tripExpenseTypeId}
                    </td>
                    <td className="py-2">
                      {formatDate(exp.expenseDate)}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-2">
                      <Can permission="trips.update">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            if (
                              confirm(
                                'Remover esta despesa? A Conta a Pagar será desvinculada da viagem.'
                              )
                            )
                              removeExpenseMutation.mutate(exp.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Nenhuma despesa lançada. Clique em &quot;Adicionar despesa&quot; para
            registrar combustível, pedágio, etc. Uma Conta a Pagar será gerada
            automaticamente.
          </p>
        )}
      </SectionCard>

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
                    placeholder="Cliente"
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
                    placeholder="Motorista"
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
                  <Input {...field} className="mt-1" />
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
                  <Input {...field} className="mt-1" />
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
                  value={field.value}
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
                <Input {...field} className="mt-1" />
              )}
            />
          </div>
          <Can permission="trips.update">
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/trips">Cancelar</Link>
              </Button>
            </div>
          </Can>
        </form>
      </SectionCard>
    </div>
  );
}
