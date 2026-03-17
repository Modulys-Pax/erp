'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { employeeApi, CreateEmployeeBenefitDto, UpdateEmployeeBenefitDto } from '@/lib/api/employee';
import { formatCurrency } from '@/lib/utils/currency';
import { benefitApi } from '@/lib/api/benefit';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toastSuccess, toastError } from '@/lib/utils/toast';
import { Plus, Pencil, Trash2, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import { ACTIVE_STATUS_COLORS } from '@/lib/constants/status.constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

const benefitSchema = z.object({
  employeeId: z.string().uuid(),
  benefitId: z.string().uuid('Selecione um benefício'),
  active: z.boolean().default(true),
  startDate: z.string().optional(),
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
});

type BenefitFormData = z.infer<typeof benefitSchema>;

export default function EmployeeBenefitsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: employee } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeeApi.getById(id),
  });

  const { data: benefits, isLoading } = useQuery({
    queryKey: ['employee-benefits', id],
    queryFn: () => employeeApi.getBenefits(id, undefined, true),
    enabled: !!id,
  });

  // Buscar benefícios disponíveis do catálogo
  const { data: availableBenefitsResponse } = useQuery({
    queryKey: ['available-benefits', employee?.branchId],
    queryFn: () => benefitApi.getAll(employee?.branchId, true, 1, 1000),
    enabled: !!employee?.branchId,
  });

  const availableBenefits = availableBenefitsResponse?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BenefitFormData>({
    resolver: zodResolver(benefitSchema),
    defaultValues: {
      employeeId: id,
      companyId: DEFAULT_COMPANY_ID,
      active: true,
      branchId: employee?.branchId ?? '',
    },
  });

  useEffect(() => {
    if (employee?.branchId) {
      setValue('branchId', employee.branchId);
    }
  }, [employee?.branchId, setValue]);

  const selectedBenefitId = watch('benefitId');
  const selectedBenefit = availableBenefits.find((b) => b.id === selectedBenefitId);

  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeBenefitDto) => employeeApi.createBenefit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-benefits'] });
      queryClient.invalidateQueries({ queryKey: ['employee-costs'] });
      queryClient.invalidateQueries({ queryKey: ['employee-detail-costs'] });
      setIsDialogOpen(false);
      reset();
      toastSuccess('Benefício criado com sucesso');
    },
    onError: (error: any) => {
      toastError('Erro ao criar benefício', error.response?.data?.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeBenefitDto }) =>
      employeeApi.updateBenefit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-benefits'] });
      queryClient.invalidateQueries({ queryKey: ['employee-costs'] });
      queryClient.invalidateQueries({ queryKey: ['employee-detail-costs'] });
      setIsDialogOpen(false);
      setEditingId(null);
      reset();
      toastSuccess('Benefício atualizado com sucesso');
    },
    onError: (error: any) => {
      toastError('Erro ao atualizar benefício', error.response?.data?.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeeApi.deleteBenefit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-benefits'] });
      queryClient.invalidateQueries({ queryKey: ['employee-costs'] });
      queryClient.invalidateQueries({ queryKey: ['employee-detail-costs'] });
      toastSuccess('Benefício excluído com sucesso');
    },
    onError: (error: any) => {
      toastError('Erro ao excluir benefício', error.response?.data?.message);
    },
  });

  const onSubmit = (data: BenefitFormData) => {
    const branchId = employee!.branchId;
    const payload = {
      ...data,
      companyId: DEFAULT_COMPANY_ID,
      branchId,
    };
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (employeeBenefit: any) => {
    setEditingId(employeeBenefit.id);
    setValue('benefitId', employeeBenefit.benefitId);
    setValue('active', employeeBenefit.active);
    setValue('startDate', employeeBenefit.startDate ? new Date(employeeBenefit.startDate).toISOString().split('T')[0] : '');
    if (employee?.branchId) setValue('branchId', employee.branchId);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este benefício?')) {
      deleteMutation.mutate(id);
    }
  };

  if (!employee) {
    return (
      <div className="space-y-6">
        <PageHeader title="Funcionário não encontrado" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            O funcionário solicitado não foi encontrado.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/employees/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={`Benefícios - ${employee.name}`}
          subtitle="Gerencie os benefícios do funcionário"
        />
      </div>

      {/* Tabela de Benefícios */}
      <SectionCard title="Benefícios">
        <div className="mb-4 flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={!employee?.branchId}
                onClick={() => {
                  setEditingId(null);
                  reset({
                    employeeId: id,
                    companyId: DEFAULT_COMPANY_ID,
                    active: true,
                    branchId: employee?.branchId ?? '',
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Benefício
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Editar Benefício' : 'Novo Benefício'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Benefício do Catálogo *</Label>
                    <Link
                      href="/benefits"
                      target="_blank"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Gerenciar Catálogo <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="mt-2">
                    <SearchableSelect
                      options={toSelectOptions(
                        availableBenefits,
                        (b) => b.id,
                        (b) => b.name,
                      )}
                      value={watch('benefitId') || ''}
                      onChange={(value) => setValue('benefitId', value, { shouldValidate: true })}
                      placeholder="Selecione um benefício..."
                      error={!!errors.benefitId}
                    />
                  </div>
                  {errors.benefitId && (
                    <p className="text-sm text-destructive mt-1">{errors.benefitId.message}</p>
                  )}
                  {selectedBenefit && (
                    <div className="mt-2 p-3 bg-muted rounded-xl text-sm">
                      <p className="font-medium text-foreground">{selectedBenefit.name}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Custo diário:</span>
                          <span className="ml-1 font-medium text-foreground">
                            {formatCurrency(selectedBenefit.dailyCost)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valor funcionário:</span>
                          <span className="ml-1 font-medium text-foreground">
                            {formatCurrency(selectedBenefit.employeeValue)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Inclui fins de semana:</span>
                          <span className="ml-1 font-medium text-foreground">
                            {selectedBenefit.includeWeekends ? 'Sim' : 'Não'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    {...register('startDate')}
                    className="mt-2"
                  />
                </div>

                <input type="hidden" {...register('branchId')} />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...register('active')}
                    className="rounded border-border"
                  />
                  <Label>Ativo</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingId(null);
                      reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingId ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

            <DataTable
              data={benefits || []}
              columns={[
                {
                  key: 'benefit',
                  header: 'Benefício',
                  render: (employeeBenefit: any) => (
                    <span className="font-medium text-foreground">
                      {employeeBenefit.benefit?.name || 'N/A'}
                    </span>
                  ),
                },
                {
                  key: 'dailyCost',
                  header: 'Custo Diário',
                  render: (employeeBenefit: any) => (
                    <span className="text-foreground">
                      {formatCurrency(employeeBenefit.benefit?.dailyCost || 0)}
                    </span>
                  ),
                  className: 'text-right',
                },
                {
                  key: 'employeeValue',
                  header: 'Valor Funcionário',
                  render: (employeeBenefit: any) => (
                    <span className="text-foreground">
                      {formatCurrency(employeeBenefit.benefit?.employeeValue || 0)}
                    </span>
                  ),
                  className: 'text-right',
                },
            {
              key: 'startDate',
              header: 'Início',
              render: (benefit) => (
                <span className="text-muted-foreground">
                  {benefit.startDate
                    ? formatDate(benefit.startDate)
                    : 'N/A'}
                </span>
              ),
            },
            {
              key: 'active',
              header: 'Status',
              render: (benefit) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs ${benefit.active ? ACTIVE_STATUS_COLORS.active : ACTIVE_STATUS_COLORS.inactive}`}
                >
                  {benefit.active ? 'Ativo' : 'Inativo'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Ações',
              render: (benefit) => (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(benefit)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(benefit.id)}
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
          isLoading={isLoading}
          emptyMessage="Nenhum benefício cadastrado"
        />
      </SectionCard>

      {/* Resumo */}
      {benefits && benefits.length > 0 && (
        <SectionCard title="Resumo">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total de Benefícios Ativos:</span>
            <span className="text-lg font-semibold text-foreground">
              {benefits.filter((b) => b.active).length}
            </span>
          </div>
          <div className="mt-2 p-3 bg-muted rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">
              O custo mensal é calculado automaticamente baseado em dias úteis do mês
            </p>
            <p className="text-xs text-muted-foreground">
              Sábados e domingos são excluídos (exceto se configurado no benefício)
            </p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
