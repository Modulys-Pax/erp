'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { tripApi, Trip, getTripStatusLabel } from '@/lib/api/trip';
import { formatCurrency } from '@/lib/utils/currency';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { customerApi } from '@/lib/api/customer';
import { vehicleApi, getVehicleOptionLabel } from '@/lib/api/vehicle';
import { EmptyState } from '@/components/ui/empty-state';
import { MapPin, Plus, Calendar, Truck, UserCircle, Edit } from 'lucide-react';
import { Can } from '@/components/auth/permission-gate';
import { formatDate } from '@/lib/utils/date';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'SCHEDULED', label: 'Agendada' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function TripsPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [vehicleId, setVehicleId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: trips = [], isLoading } = useQuery({
    queryKey: [
      'trips',
      effectiveBranchId,
      vehicleId,
      customerId,
      status,
      startDate,
      endDate,
    ],
    queryFn: () =>
      tripApi.getAll({
        branchId: effectiveBranchId ?? undefined,
        vehicleId: vehicleId || undefined,
        customerId: customerId || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
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

  const customerOptions =
    customersData?.data?.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const vehicleOptions =
    vehiclesData?.data?.map((v) => ({
      value: v.id,
      label: getVehicleOptionLabel(v),
    })) ?? [];

  const columns = [
    { key: 'route', header: 'Origem / Destino', render: (row: Trip) => row.origin + ' -> ' + row.destination },
    { key: 'customer', header: 'Cliente', render: (row: Trip) => row.customerName ?? row.customerId },
    { key: 'vehicle', header: 'Veículo', render: (row: Trip) => (row.vehiclePlates?.length ? row.vehiclePlates.join(' • ') : (row.vehiclePlate ?? row.vehicleId)) },
    { key: 'freightValue', header: 'Frete', render: (row: Trip) => formatCurrency(row.freightValue) },
    { key: 'status', header: 'Status', render: (row: Trip) => getTripStatusLabel(row.status) },
    {
      key: 'dates',
      header: 'Período',
      render: (row: Trip) =>
        row.scheduledDepartureAt
          ? formatDate(row.scheduledDepartureAt) + (row.scheduledArrivalAt ? ' até ' + formatDate(row.scheduledArrivalAt) : '')
          : '-',
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (row: Trip) => (
        <Can permission="trips.update">
          <Button variant="ghost" size="icon" asChild>
            <Link href={'/trips/' + row.id}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
        </Can>
      ),
    },
  ];

  const listAction = (
    <Can permission="trips.create">
      <Button asChild>
        <Link href="/trips/new">
          <Plus className="mr-2 h-4 w-4" />
          Nova viagem
        </Link>
      </Button>
    </Can>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Viagens"
        subtitle="Cadastre e acompanhe viagens. Ao cadastrar, uma Conta a Receber (Prevista) é gerada; ao concluir a viagem, a CR é marcada como Realizada."
      />
      <SectionCard title="Filtros">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <Label>Cliente</Label>
            <SearchableSelect
              options={[{ value: '', label: 'Todos' }, ...customerOptions]}
              value={customerId}
              onValueChange={setCustomerId}
              placeholder="Todos"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Veículo</Label>
            <SearchableSelect
              options={[{ value: '', label: 'Todos' }, ...vehicleOptions]}
              value={vehicleId}
              onValueChange={setVehicleId}
              placeholder="Todos"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Status</Label>
            <SearchableSelect
              options={STATUS_OPTIONS}
              value={status}
              onValueChange={setStatus}
              placeholder="Todos"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Data início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Data fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Listagem" actions={listAction}>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Nenhuma viagem encontrada"
            description="Cadastre uma viagem ou ajuste os filtros."
            action={listAction}
          />
        ) : (
          <DataTable columns={columns} data={trips} />
        )}
      </SectionCard>
    </div>
  );
}
