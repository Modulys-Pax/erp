'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { vehicleModelApi, VehicleModel } from '@/lib/api/vehicle-model';
import { vehicleBrandApi, VehicleBrand } from '@/lib/api/vehicle-brand';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toastSuccess, toastError, toastErrorFromException } from '@/lib/utils';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Car,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function VehicleModelsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialBrandId = searchParams.get('brandId') || '';

  const [selectedBrandId, setSelectedBrandId] = useState(initialBrandId);
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<VehicleModel | null>(null);
  const [modelName, setModelName] = useState('');
  const [modelBrandId, setModelBrandId] = useState('');
  const [modelActive, setModelActive] = useState(true);

  // Buscar marcas para filtro e seleção
  const { data: brands = [] } = useQuery({
    queryKey: ['vehicle-brands', true],
    queryFn: () => vehicleBrandApi.getAll(true),
  });

  // Buscar modelos
  const { data: models = [], isLoading } = useQuery({
    queryKey: ['vehicle-models', selectedBrandId, showInactive],
    queryFn: () => vehicleModelApi.getAll(selectedBrandId || undefined, showInactive),
  });

  // Atualizar seleção quando URL mudar
  useEffect(() => {
    if (initialBrandId) {
      setSelectedBrandId(initialBrandId);
    }
  }, [initialBrandId]);

  const createMutation = useMutation({
    mutationFn: (data: { brandId: string; name: string; active: boolean }) =>
      vehicleModelApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] });
      toastSuccess('Modelo criado com sucesso');
      closeDialog();
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao criar modelo'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { brandId?: string; name?: string; active?: boolean } }) =>
      vehicleModelApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] });
      toastSuccess('Modelo atualizado com sucesso');
      closeDialog();
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao atualizar modelo'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehicleModelApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] });
      toastSuccess('Modelo excluído com sucesso');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao excluir modelo'),
  });

  const openCreateDialog = () => {
    setEditingModel(null);
    setModelName('');
    setModelBrandId(selectedBrandId || '');
    setModelActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (model: VehicleModel) => {
    setEditingModel(model);
    setModelName(model.name);
    setModelBrandId(model.brandId);
    setModelActive(model.active);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingModel(null);
    setModelName('');
    setModelBrandId('');
    setModelActive(true);
  };

  const handleSubmit = () => {
    if (!modelName.trim()) {
      toastError('Informe o nome do modelo');
      return;
    }
    if (!modelBrandId) {
      toastError('Selecione uma marca');
      return;
    }

    if (editingModel) {
      updateMutation.mutate({
        id: editingModel.id,
        data: { brandId: modelBrandId, name: modelName.trim(), active: modelActive },
      });
    } else {
      createMutation.mutate({ brandId: modelBrandId, name: modelName.trim(), active: modelActive });
    }
  };

  const handleDelete = (model: VehicleModel) => {
    if (confirm(`Excluir o modelo "${model.name}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(model.id);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Opções de marcas para filtro
  const brandOptions = [
    { value: '', label: 'Todas as marcas' },
    ...toSelectOptions(brands, (b) => b.id, (b) => b.name),
  ];

  // Opções de marcas para seleção no modal (apenas ativas)
  const activeBrands = brands.filter((b) => b.active);
  const brandSelectOptions = toSelectOptions(activeBrands, (b) => b.id, (b) => b.name);

  // Nome da marca selecionada no filtro
  const selectedBrandName = selectedBrandId
    ? brands.find((b) => b.id === selectedBrandId)?.name
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modelos de Veículos"
        subtitle={
          selectedBrandName
            ? `Modelos da marca ${selectedBrandName}`
            : 'Gerencie os modelos de veículos disponíveis no sistema'
        }
        actions={
          <div className="flex gap-2">
            <Link href="/vehicle-brands">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Marcas
              </Button>
            </Link>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Modelo
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <SectionCard>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-64">
            <Label className="text-sm text-muted-foreground mb-4 mt-5 block">Filtrar por Marca</Label>
            <SearchableSelect
              options={brandOptions}
              value={selectedBrandId}
              onChange={setSelectedBrandId}
              placeholder="Todas as marcas"
            />
          </div>
          <label htmlFor="show-inactive" className="inline-flex items-center gap-2 cursor-pointer self-end pb-1">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <span className="text-sm font-medium leading-none">
              Mostrar inativos
            </span>
          </label>
        </div>
      </SectionCard>

      {/* Lista de Modelos */}
      <SectionCard
        title="Modelos Cadastrados"
        description={models.length > 0 ? `${models.length} modelo(s)` : undefined}
      >
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <EmptyState
            icon={Car}
            title="Nenhum modelo cadastrado"
            description={
              selectedBrandId
                ? 'Nenhum modelo encontrado para esta marca. Cadastre um novo modelo.'
                : 'Cadastre modelos de veículos para usá-los ao registrar novos veículos.'
            }
            action={{ label: 'Novo Modelo', onClick: openCreateDialog }}
          />
        ) : (
          <DataTable
            data={models}
            isLoading={isLoading}
            emptyMessage="Nenhum modelo encontrado"
            columns={[
              {
                key: 'name',
                header: 'Modelo',
                render: (model) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-foreground">{model.name}</span>
                  </div>
                ),
              },
              {
                key: 'brand',
                header: 'Marca',
                render: (model) => (
                  <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                    {model.brand?.name || '-'}
                  </Badge>
                ),
              },
              {
                key: 'active',
                header: 'Status',
                render: (model) =>
                  model.active ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inativo
                    </Badge>
                  ),
              },
              {
                key: 'actions',
                header: 'Ações',
                className: 'text-right',
                render: (model) => (
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(model)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(model)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingModel ? 'Editar Modelo' : 'Novo Modelo'}</DialogTitle>
            <DialogDescription>
              {editingModel
                ? 'Atualize as informações do modelo.'
                : 'Preencha os dados para criar um novo modelo de veículo.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Marca *</Label>
              <SearchableSelect
                options={brandSelectOptions}
                value={modelBrandId}
                onChange={setModelBrandId}
                placeholder="Selecione a marca"
              />
            </div>
            <div>
              <Label>Nome do Modelo *</Label>
              <Input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Ex: FH 540, R 450, Actros 2651..."
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="model-active"
                checked={modelActive}
                onCheckedChange={setModelActive}
              />
              <Label htmlFor="model-active">Modelo ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingModel ? (
                'Salvar'
              ) : (
                'Criar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
