'use client';

import { useParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/currency';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  maintenanceApi,
  MaintenanceOrder,
  CreateMaintenanceWorkerDto,
  CreateMaintenanceServiceDto,
  CreateMaintenanceMaterialDto,
  UpdateMaintenanceOrderDto,
  UpdateMaintenanceServiceWorkerDto,
} from '@/lib/api/maintenance';
import { employeeApi } from '@/lib/api/employee';
import { productApi } from '@/lib/api/product';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QuantityInput } from '@/components/ui/quantity-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPE_COLORS,
  MAINTENANCE_EVENT_LABELS,
  MAINTENANCE_TYPE_TEXT_COLORS,
} from '@/lib/constants/status.constants';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import { formatQuantity, normalizeQuantityByUnit } from '@/lib/utils/quantity';
import {
  Clock,
  DollarSign,
  Truck,
  Users,
  Wrench,
  Package,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Gauge,
  Shield,
  AlertTriangle,
  Download,
} from 'lucide-react';

export default function MaintenanceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [actionNotes, setActionNotes] = useState('');
  const [newWorkerEmployeeId, setNewWorkerEmployeeId] = useState('');
  const [newWorkerResponsible, setNewWorkerResponsible] = useState(false);
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newMaterialProductId, setNewMaterialProductId] = useState('');
  const [newMaterialQuantity, setNewMaterialQuantity] = useState<number | undefined>(undefined);
  const [newMaterialServiceId, setNewMaterialServiceId] = useState<string>('');
  const [printMode, setPrintMode] = useState<'summary' | 'full'>('summary');

  const { data: order, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceApi.getById(id),
  });

  const startMutation = useMutation({
    mutationFn: () => maintenanceApi.start(id, { notes: actionNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      setActionNotes('');
      toastSuccess('Ordem iniciada com sucesso');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => maintenanceApi.pause(id, { notes: actionNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      setActionNotes('');
      toastSuccess('Ordem pausada com sucesso');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => maintenanceApi.complete(id, { notes: actionNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceDue'] });
      setActionNotes('');
      toastSuccess('Ordem concluída com sucesso');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => maintenanceApi.cancel(id, { notes: actionNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceDue'] });
      setActionNotes('');
      toastSuccess('Ordem cancelada');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateMaintenanceOrderDto) => maintenanceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toastSuccess('Ordem atualizada com sucesso');
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toastError('Erro ao atualizar ordem', msg || undefined);
    },
  });

  const canAdd =
    order &&
    (order.status === 'OPEN' ||
      order.status === 'IN_PROGRESS' ||
      order.status === 'PAUSED');

  const { data: employeesResponse } = useQuery({
    queryKey: ['employees', order?.branchId],
    queryFn: () => employeeApi.getAll(order!.branchId, false, 1, 1000),
    enabled: !!order?.branchId && !!canAdd,
  });
  const employees = employeesResponse?.data ?? [];

  const { data: productsResponse } = useQuery({
    queryKey: ['products', order?.branchId],
    queryFn: () => productApi.getAll(order!.branchId, false, 1, 1000),
    enabled: !!order?.branchId && !!canAdd,
  });
  const products = productsResponse?.data ?? [];

  const handleAddWorker = () => {
    if (!order || !newWorkerEmployeeId) return;
    const existing: CreateMaintenanceWorkerDto[] = (order.workers ?? []).map(
      (w) => ({ employeeId: w.employeeId, isResponsible: w.isResponsible }),
    );
    updateMutation.mutate(
      { workers: [...existing, { employeeId: newWorkerEmployeeId, isResponsible: newWorkerResponsible }] },
      { onSuccess: () => { setNewWorkerEmployeeId(''); setNewWorkerResponsible(false); } },
    );
  };

  const handleAddService = () => {
    if (!order || !newServiceDescription.trim()) return;
    const existing: CreateMaintenanceServiceDto[] = (order.services ?? []).map(
      (s) => ({ description: s.description }),
    );
    updateMutation.mutate(
      { services: [...existing, { description: newServiceDescription.trim() }] },
      { onSuccess: () => { setNewServiceDescription(''); } },
    );
  };

  const handleAddMaterial = () => {
    if (!order || !newMaterialProductId || newMaterialQuantity == null || newMaterialQuantity <= 0) return;
    const product = products.find((p) => p.id === newMaterialProductId);
    const normalizedQty = normalizeQuantityByUnit(newMaterialQuantity, product?.unit);
    if (normalizedQty <= 0) return;
    const existing: CreateMaintenanceMaterialDto[] = (order.materials ?? []).map(
      (m) => ({
        productId: m.productId,
        maintenanceServiceId: m.maintenanceServiceId,
        vehicleReplacementItemId: m.vehicleReplacementItemId,
        quantity: m.quantity,
        unitCost: m.unitCost,
      }),
    );
    updateMutation.mutate(
      {
        materials: [
          ...existing,
          {
            productId: newMaterialProductId,
            quantity: normalizedQty,
            ...(newMaterialServiceId ? { maintenanceServiceId: newMaterialServiceId } : {}),
          },
        ],
      },
      { onSuccess: () => { setNewMaterialProductId(''); setNewMaterialQuantity(undefined); setNewMaterialServiceId(''); } },
    );
  };

  const buildServiceWorkersList = (): UpdateMaintenanceServiceWorkerDto[] => {
    const list: UpdateMaintenanceServiceWorkerDto[] = [];
    for (const s of order?.services ?? []) {
      for (const sw of s.serviceWorkers ?? []) {
        list.push({ maintenanceServiceId: s.id, employeeId: sw.employeeId });
      }
    }
    return list;
  };

  const handleAddServiceWorker = (maintenanceServiceId: string, employeeId: string) => {
    if (!order || !employeeId) return;
    const current = buildServiceWorkersList();
    if (current.some((sw) => sw.maintenanceServiceId === maintenanceServiceId && sw.employeeId === employeeId)) return;
    updateMutation.mutate({ serviceWorkers: [...current, { maintenanceServiceId, employeeId }] });
  };

  const handleRemoveServiceWorker = (maintenanceServiceId: string, employeeId: string) => {
    if (!order) return;
    const current = buildServiceWorkersList().filter(
      (sw) => !(sw.maintenanceServiceId === maintenanceServiceId && sw.employeeId === employeeId),
    );
    updateMutation.mutate({ serviceWorkers: current });
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ordem não encontrada" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            A ordem de manutenção solicitada não foi encontrada.
          </p>
        </SectionCard>
      </div>
    );
  }

  const canStart = order.status === 'OPEN' || order.status === 'PAUSED';
  const canPause = order.status === 'IN_PROGRESS';
  const canComplete = order.status === 'OPEN' || order.status === 'IN_PROGRESS' || order.status === 'PAUSED';
  const canCancel = order.status === 'OPEN' || order.status === 'IN_PROGRESS' || order.status === 'PAUSED';
  const isRoadsideChange = order.description === 'Troca na estrada';

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.orderNumber}
        subtitle={isRoadsideChange ? 'Troca na estrada' : 'Ordem de manutenção'}
        actions={
          <div className="flex items-center gap-2 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPrintMode('summary'); setTimeout(() => window.print(), 100); }}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Imprimir resumo
            </Button>
            {order.status === 'COMPLETED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPrintMode('full'); setTimeout(() => window.print(), 100); }}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Imprimir completa
              </Button>
            )}
            <Link href="/maintenance">
              <Button variant="outline">Voltar</Button>
            </Link>
          </div>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border p-4 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${MAINTENANCE_STATUS_COLORS[order.status]}`}>
            {order.status === 'OPEN' && <Clock className="h-5 w-5" />}
            {order.status === 'IN_PROGRESS' && <PlayCircle className="h-5 w-5" />}
            {order.status === 'PAUSED' && <PauseCircle className="h-5 w-5" />}
            {order.status === 'COMPLETED' && <CheckCircle className="h-5 w-5" />}
            {order.status === 'CANCELLED' && <XCircle className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-semibold text-foreground">{MAINTENANCE_STATUS_LABELS[order.status]}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4 flex items-center gap-4">
          <div
            data-badge-type={order.type}
            className={`p-3 rounded-lg ${MAINTENANCE_TYPE_COLORS[order.type]}`}
            style={{ color: order.type === 'CORRECTIVE' ? '#111111' : '#065f46' }}
          >
            {order.type === 'PREVENTIVE' ? <Shield className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p
              data-badge-type={order.type}
              className={`font-semibold ${MAINTENANCE_TYPE_TEXT_COLORS[order.type]}`}
              style={{ color: order.type === 'CORRECTIVE' ? '#111111' : '#065f46' }}
            >
              {MAINTENANCE_TYPE_LABELS[order.type]}
            </p>
          </div>
        </div>

        <StatCard
          title="Custo Total"
          value={formatCurrency(order.totalCost || 0)}
          icon={DollarSign}
          className="border-l-4 border-l-green-500"
        />

        <StatCard
          title="Tempo Total"
          value={formatTime(order.totalTimeMinutes)}
          icon={Clock}
          className="border-l-4 border-l-blue-500"
        />
      </div>

      {/* Troca na Estrada */}
      {isRoadsideChange && (
        <SectionCard title="Troca na Estrada" className="border-primary/30 bg-primary/5">
          <p className="text-sm text-muted-foreground mb-4">
            Registro de troca realizada fora da oficina.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {order.serviceDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm font-medium">{formatDate(order.serviceDate)}</p>
                </div>
              </div>
            )}
            {order.kmAtEntry != null && (
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">KM</p>
                  <p className="text-sm font-medium">{order.kmAtEntry.toLocaleString('pt-BR')} km</p>
                </div>
              </div>
            )}
          </div>
          {order.replacementItemsSummary && order.replacementItemsSummary.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Itens trocados:</p>
              <div className="flex flex-wrap gap-2">
                {order.replacementItemsSummary.map((item) => (
                  <Badge key={item.id} variant="secondary">{item.name}</Badge>
                ))}
              </div>
            </div>
          )}
          {order.attachmentFileName && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const blob = await maintenanceApi.getAttachment(order.id);
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank', 'noopener,noreferrer');
                } catch { toastError('Não foi possível abrir o anexo.'); }
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver nota ({order.attachmentFileName})
            </Button>
          )}
        </SectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Informações Gerais */}
        <SectionCard title="Informações">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Veículo</p>
                <p className="font-semibold">{order.vehiclePlate}</p>
              </div>
            </div>
            {order.kmAtEntry && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Gauge className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">KM na Entrada</p>
                  <p className="font-medium">{order.kmAtEntry.toLocaleString('pt-BR')} km</p>
                </div>
              </div>
            )}
            {order.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{order.description}</p>
              </div>
            )}
            {order.observations && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{order.observations}</p>
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Criada em {formatDateTime(order.createdAt)}
            </div>
          </div>
        </SectionCard>

        {/* Ações */}
        <SectionCard title="Ações">
          {(canStart || canPause || canComplete || canCancel) ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="actionNotes" className="text-sm">Observações</Label>
                <Textarea
                  id="actionNotes"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={2}
                  placeholder="Observações da ação..."
                  className="mt-1"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {canStart && (
                  <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="w-full">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {order.status === 'PAUSED' ? 'Retomar' : 'Iniciar'}
                  </Button>
                )}
                {canPause && (
                  <Button variant="outline" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending} className="w-full">
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Pausar
                  </Button>
                )}
                {canComplete && (
                  <Button
                    variant="default"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => confirm('Concluir esta ordem?') && completeMutation.mutate()}
                    disabled={completeMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => confirm('Cancelar esta ordem?') && cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Esta ordem está {MAINTENANCE_STATUS_LABELS[order.status].toLowerCase()} e não pode ser alterada.
            </p>
          )}
        </SectionCard>
      </div>

      {/* Funcionários */}
      <SectionCard title="Funcionários" description={`${order.workers?.length || 0} alocado(s)`}>
        {order.workers && order.workers.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {order.workers.map((worker) => (
              <div key={worker.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{worker.employeeName}</p>
                  {worker.isResponsible && <Badge variant="secondary" className="text-xs">Responsável</Badge>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum funcionário alocado</p>
        )}
        {canAdd && (
          <div className="pt-4 mt-4 border-t">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <SearchableSelect
                  options={toSelectOptions(employees.filter((e) => !order.workers?.some((w) => w.employeeId === e.id)), (e) => e.id, (e) => e.name)}
                  value={newWorkerEmployeeId}
                  onChange={setNewWorkerEmployeeId}
                  placeholder="Selecione..."
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={newWorkerResponsible} onChange={(e) => setNewWorkerResponsible(e.target.checked)} className="rounded" />
                Responsável
              </label>
              <Button size="sm" onClick={handleAddWorker} disabled={!newWorkerEmployeeId || updateMutation.isPending}>Adicionar</Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Serviços */}
      <SectionCard title="Serviços" description={`${order.services?.length || 0} registrado(s)`}>
        {order.services && order.services.length > 0 ? (
          <div className="space-y-2">
            {order.services.map((service) => (
              <div key={service.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{service.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum serviço registrado</p>
        )}
        {canAdd && (
          <div className="pt-4 mt-4 border-t">
            <div className="flex flex-wrap items-end gap-3">
              <Input placeholder="Descrição do serviço" value={newServiceDescription} onChange={(e) => setNewServiceDescription(e.target.value)} className="flex-1 min-w-[200px] rounded-xl" />
              <Button size="sm" onClick={handleAddService} disabled={!newServiceDescription.trim() || updateMutation.isPending}>Adicionar</Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Funcionários por serviço (obrigatório antes de concluir) */}
      {order.services && order.services.length > 0 && (
        <SectionCard
          title="Funcionários por serviço"
          description="Informe quem executou cada serviço (obrigatório antes de concluir)"
        >
          <div className="space-y-4">
            {order.services.map((service) => (
              <div key={service.id} className="p-3 rounded-lg border bg-card space-y-2">
                <p className="font-medium text-sm text-muted-foreground">{service.description}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {(service.serviceWorkers ?? []).map((sw) => (
                    <Badge key={sw.id} variant="secondary" className="gap-1">
                      {sw.employeeName}
                      {canAdd && (
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceWorker(service.id, sw.employeeId)}
                          className="ml-1 hover:text-destructive"
                          aria-label="Remover"
                        >
                          ×
                        </button>
                      )}
                    </Badge>
                  ))}
                  {canAdd && (
                    <SearchableSelect
                      options={toSelectOptions(
                        employees.filter(
                          (e) => !(service.serviceWorkers ?? []).some((sw) => sw.employeeId === e.id),
                        ),
                        (e) => e.id,
                        (e) => e.name,
                      )}
                      value=""
                      onChange={(value) => {
                        if (value) handleAddServiceWorker(service.id, value);
                      }}
                      placeholder="+ Adicionar funcionário..."
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Materiais */}
      <SectionCard title="Materiais" description={`${order.materials?.length || 0} utilizado(s)`}>
        {order.materials && order.materials.length > 0 ? (
          <div className="space-y-2">
            {order.materials.map((material) => (
              <div key={material.id} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{material.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatQuantity(material.quantity, material.productUnit, { showUnit: true })}
                      {material.unitCost !== undefined && ` × ${formatCurrency(material.unitCost)}`}
                    </p>
                  </div>
                </div>
                {material.totalCost !== undefined && (
                  <span className="font-semibold text-sm">{formatCurrency(Number(material.totalCost))}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum material utilizado</p>
        )}
        {canAdd && (
          <div className="pt-4 mt-4 border-t">
            <div className="flex flex-wrap items-end gap-3">
              {order.services && order.services.length > 0 && (
                <div className="w-48">
                  <Label className="text-xs text-muted-foreground">Serviço (opcional)</Label>
                  <SearchableSelect
                    options={[{ value: '', label: '— Nenhum —' }, ...toSelectOptions(order.services, (s) => s.id, (s) => s.description)]}
                    value={newMaterialServiceId}
                    onChange={setNewMaterialServiceId}
                    placeholder="Vincular a serviço..."
                  />
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <SearchableSelect
                  options={toSelectOptions(products, (p) => p.id, (p) => `${p.name}${p.code ? ` (${p.code})` : ''}${p.unit ? ` - ${p.unit}` : ''}`)}
                  value={newMaterialProductId}
                  onChange={setNewMaterialProductId}
                  placeholder="Selecione o produto..."
                />
              </div>
              <QuantityInput
                unitCode={products.find((p) => p.id === newMaterialProductId)?.unit}
                placeholder="Qtd"
                value={newMaterialQuantity}
                onChange={setNewMaterialQuantity}
                className="w-24 rounded-xl"
              />
              <Button size="sm" onClick={handleAddMaterial} disabled={!newMaterialProductId || newMaterialQuantity == null || newMaterialQuantity <= 0 || updateMutation.isPending}>Adicionar</Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Timeline */}
      {order.timeline && order.timeline.length > 0 && (
        <SectionCard title="Linha do Tempo">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {order.timeline.map((event, index) => (
                <div key={event.id} className="relative pl-10">
                  <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${
                    event.event === 'COMPLETED' ? 'bg-green-500' :
                    event.event === 'CANCELLED' ? 'bg-red-500' :
                    event.event === 'STARTED' || event.event === 'RESUMED' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`} />
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm">{MAINTENANCE_EVENT_LABELS[event.event]}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                    </div>
                    {event.notes && <p className="text-sm text-muted-foreground mt-1">{event.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Área de impressão (resumo: veículo + serviços | completa: tudo) */}
      <div className="maintenance-order-print-area hidden print:block bg-white text-black">
        <div className="max-w-3xl mx-auto p-8">
          <div className="border-b-2 border-slate-800 pb-4 mb-6">
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Ordem de Serviço</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{order.orderNumber}</h1>
            <div className="flex gap-4 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                {MAINTENANCE_STATUS_LABELS[order.status]}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                {MAINTENANCE_TYPE_LABELS[order.type]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Veículo</p>
              <p className="font-semibold text-slate-900">{order.vehiclePlate}</p>
            </div>
            {order.kmAtEntry != null && (
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">KM na entrada</p>
                <p className="font-semibold text-slate-900">{order.kmAtEntry.toLocaleString('pt-BR')} km</p>
              </div>
            )}
            {printMode === 'full' && (
              <>
                {order.serviceDate && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Data do serviço</p>
                    <p className="font-semibold text-slate-900">{formatDate(order.serviceDate)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Custo total</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(order.totalCost || 0)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Tempo total</p>
                  <p className="font-semibold text-slate-900">{formatTime(order.totalTimeMinutes)}</p>
                </div>
              </>
            )}
          </div>

          {(order.description || order.observations) && (
            <div className="mb-6 space-y-2">
              {order.description && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-0.5">Descrição</p>
                  <p className="text-sm text-slate-800">{order.description}</p>
                </div>
              )}
              {order.observations && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-0.5">Observações</p>
                  <p className="text-sm text-slate-800">{order.observations}</p>
                </div>
              )}
            </div>
          )}

          {order.services && order.services.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">Serviços</h2>
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {order.services.map((s) => (
                    <tr key={s.id} className="border-t border-slate-200">
                      <td className="py-2 px-3 text-slate-900">{s.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {printMode === 'full' && (
            <>
              {order.services?.filter((s) => (s.serviceWorkers?.length ?? 0) > 0).length ? (
                <div className="mb-6">
                  <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">Funcionários por serviço</h2>
                  <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Serviço</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Funcionário(s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.services
                        ?.filter((s) => (s.serviceWorkers?.length ?? 0) > 0)
                        .map((s) => (
                          <tr key={s.id} className="border-t border-slate-200">
                            <td className="py-2 px-3 text-slate-900">{s.description}</td>
                            <td className="py-2 px-3 text-slate-700">
                              {(s.serviceWorkers ?? []).map((sw) => sw.employeeName).join(', ')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {order.workers && order.workers.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">Funcionários (ordem)</h2>
                  <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Nome</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 w-28">Função</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.workers.map((w) => (
                        <tr key={w.id} className="border-t border-slate-200">
                          <td className="py-2 px-3 text-slate-900">{w.employeeName}</td>
                          <td className="py-2 px-3 text-slate-600">{w.isResponsible ? 'Responsável' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {order.materials && order.materials.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">Materiais</h2>
                  <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left py-2 px-3 font-semibold text-slate-700">Produto</th>
                        <th className="text-center py-2 px-3 font-semibold text-slate-700 w-20">Qtd</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.materials.map((m) => (
                        <tr key={m.id} className="border-t border-slate-200">
                          <td className="py-2 px-3 text-slate-900">{m.productName}</td>
                          <td className="py-2 px-3 text-center text-slate-700">
                            {formatQuantity(m.quantity, m.productUnit, { showUnit: true })}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-900 font-medium">
                            {m.totalCost != null ? formatCurrency(Number(m.totalCost)) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <span>Documento gerado em {formatDateTime(new Date().toISOString())}</span>
            <span>Ordem de Serviço · {order.orderNumber}</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          body .maintenance-order-print-area,
          body .maintenance-order-print-area * { visibility: visible; }
          body .maintenance-order-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            border: none !important;
          }
          .maintenance-order-print-area table { border-collapse: collapse; }
          .maintenance-order-print-area th,
          .maintenance-order-print-area td { border: 1px solid #e2e8f0; }
        }
      `}</style>
    </div>
  );
}
