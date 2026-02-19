'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vacationApi, VacationStatus } from '@/lib/api/vacation';
import { formatCurrency } from '@/lib/utils/currency';
import { employeeApi } from '@/lib/api/employee';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toastSuccess, toastErrorFromException, toastError } from '@/lib/utils';
import { calculateVacation, VacationCalculationResult } from '@/lib/utils/vacation-calculator';
import { toInputDate } from '@/lib/utils/date';
import {
  VACATION_STATUS_LABELS,
  VACATION_STATUS_COLORS,
  type VacationStatus as VacationStatusType,
} from '@/lib/constants/status.constants';
import {
  Loader2,
  Calculator,
  Banknote,
  Minus,
  ArrowRight,
  Building2,
  AlertCircle,
  CheckCircle,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

const schema = z.object({
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().min(1, 'Data de término é obrigatória'),
  soldDays: z.coerce.number().min(0).max(10, 'Máximo de 10 dias podem ser vendidos').optional(),
  advance13thSalary: z.boolean().optional(),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditVacationPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const id = params.id as string;

  // Estado para controlar se já calculou
  const [hasCalculated, setHasCalculated] = useState(false);
  const [calculation, setCalculation] = useState<VacationCalculationResult | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number>(0);
  const initialLoadDone = useRef(false);
  const userHasEdited = useRef(false);

  // Buscar férias existente
  const { data: vacation, isLoading: isLoadingVacation } = useQuery({
    queryKey: ['vacations', id],
    queryFn: () => vacationApi.getById(id),
  });

  // Buscar funcionários
  const { data: employees } = useQuery({
    queryKey: ['employees', effectiveBranchId],
    queryFn: () => employeeApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      soldDays: 0,
      advance13thSalary: false,
    },
  });

  // Preencher formulário com dados existentes
  useEffect(() => {
    if (vacation) {
      reset({
        startDate: toInputDate(vacation.startDate),
        endDate: toInputDate(vacation.endDate),
        soldDays: vacation.soldDays || 0,
        advance13thSalary: vacation.advance13thSalary || false,
        observations: vacation.observations || '',
      });
    }
  }, [vacation, reset]);

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const soldDaysRaw = watch('soldDays');
  const soldDays = typeof soldDaysRaw === 'string' ? parseInt(soldDaysRaw, 10) || 0 : (soldDaysRaw || 0);
  const advance13thSalary = watch('advance13thSalary') || false;

  // Buscar dados do funcionário
  const selectedEmployee = useMemo(() => {
    if (!vacation?.employeeId || !employees?.data) return null;
    return employees.data.find((e) => e.id === vacation.employeeId);
  }, [vacation?.employeeId, employees?.data]);

  // Total de dias de férias por ano
  const TOTAL_VACATION_DAYS = 30;

  // Calcular quantidade de dias do período selecionado
  const daysFromDates = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }, [startDate, endDate]);

  // Dias restantes (30 - dias que vai tirar)
  const remainingDays = useMemo(() => {
    return Math.max(0, TOTAL_VACATION_DAYS - daysFromDates);
  }, [daysFromDates]);

  // Máximo de dias que pode vender
  const maxSellableDays = useMemo(() => {
    return Math.min(10, remainingDays);
  }, [remainingDays]);

  // Saldo de dias após venda
  const balanceAfterSale = useMemo(() => {
    return Math.max(0, remainingDays - soldDays);
  }, [remainingDays, soldDays]);

  // Calcular automaticamente quando carregar dados existentes
  useEffect(() => {
    if (
      !initialLoadDone.current &&
      vacation &&
      selectedEmployee?.monthlySalary &&
      startDate &&
      endDate &&
      daysFromDates > 0
    ) {
      const totalDaysToPay = Number(daysFromDates) + Number(soldDays);
      const result = calculateVacation({
        monthlySalary: Number(selectedEmployee.monthlySalary),
        totalDays: totalDaysToPay,
        soldDays: Number(soldDays),
        advance13thSalary: Boolean(advance13thSalary),
      });

      setCalculation(result);
      setCalculatedDays(daysFromDates);
      setHasCalculated(true);
      initialLoadDone.current = true;
    }
  }, [vacation, selectedEmployee, startDate, endDate, daysFromDates, soldDays, advance13thSalary]);

  // Resetar cálculo quando usuário alterar dados (após carga inicial)
  useEffect(() => {
    if (initialLoadDone.current && userHasEdited.current) {
      setHasCalculated(false);
      setCalculation(null);
    }
    // Marcar que houve edição após a primeira mudança
    if (initialLoadDone.current) {
      userHasEdited.current = true;
    }
  }, [startDate, endDate, soldDays, advance13thSalary]);

  // Verificar se pode calcular
  const canCalculate = useMemo(() => {
    return (
      selectedEmployee &&
      selectedEmployee.monthlySalary &&
      selectedEmployee.monthlySalary > 0 &&
      startDate &&
      endDate &&
      daysFromDates > 0 &&
      daysFromDates <= TOTAL_VACATION_DAYS &&
      soldDays <= maxSellableDays
    );
  }, [selectedEmployee, startDate, endDate, daysFromDates, soldDays, maxSellableDays]);

  // Função para calcular
  const handleCalculate = () => {
    if (!canCalculate || !selectedEmployee?.monthlySalary) {
      toastError('Preencha todos os campos obrigatórios');
      return;
    }

    if (daysFromDates > TOTAL_VACATION_DAYS) {
      toastError(`O período não pode exceder ${TOTAL_VACATION_DAYS} dias`);
      return;
    }

    if (soldDays > maxSellableDays) {
      toastError(`Máximo de ${maxSellableDays} dias podem ser vendidos (dias restantes: ${remainingDays})`);
      return;
    }

    const totalDaysToPay = Number(daysFromDates) + Number(soldDays);
    const result = calculateVacation({
      monthlySalary: Number(selectedEmployee.monthlySalary),
      totalDays: totalDaysToPay,
      soldDays: Number(soldDays),
      advance13thSalary: Boolean(advance13thSalary),
    });

    setCalculation(result);
    setCalculatedDays(daysFromDates);
    setHasCalculated(true);
  };

  const updateMutation = useMutation({
    mutationFn: (data: FormData & {
      monthlySalary?: number;
      vacationBase?: number;
      vacationThird?: number;
      vacationTotal?: number;
      soldDaysValue?: number;
      soldDaysThird?: number;
      soldDaysTotal?: number;
      advance13thValue?: number;
      grossTotal?: number;
      inss?: number;
      irrf?: number;
      totalDeductions?: number;
      netTotal?: number;
      fgts?: number;
      employerCost?: number;
    }) =>
      vacationApi.update(id, {
        startDate: data.startDate,
        endDate: data.endDate,
        days: calculatedDays,
        soldDays: data.soldDays || 0,
        advance13thSalary: data.advance13thSalary || false,
        observations: data.observations,
        // Campos financeiros
        monthlySalary: data.monthlySalary,
        vacationBase: data.vacationBase,
        vacationThird: data.vacationThird,
        vacationTotal: data.vacationTotal,
        soldDaysValue: data.soldDaysValue,
        soldDaysThird: data.soldDaysThird,
        soldDaysTotal: data.soldDaysTotal,
        advance13thValue: data.advance13thValue,
        grossTotal: data.grossTotal,
        inss: data.inss,
        irrf: data.irrf,
        totalDeductions: data.totalDeductions,
        netTotal: data.netTotal,
        fgts: data.fgts,
        employerCost: data.employerCost,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      toastSuccess('Férias atualizadas com sucesso');
      router.push('/vacations');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao atualizar férias'),
  });

  const onSubmit = (data: FormData) => {
    if (!hasCalculated || !calculation) {
      toastError('Calcule os valores antes de salvar');
      return;
    }

    updateMutation.mutate({
      ...data,
      // Incluir os valores calculados
      monthlySalary: calculation.monthlySalary,
      vacationBase: calculation.vacationBase,
      vacationThird: calculation.vacationThird,
      vacationTotal: calculation.vacationTotal,
      soldDaysValue: calculation.soldDaysBase,
      soldDaysThird: calculation.soldDaysThird,
      soldDaysTotal: calculation.soldDaysTotal,
      advance13thValue: calculation.advance13th,
      grossTotal: calculation.grossTotal,
      inss: calculation.inss,
      irrf: calculation.irrf,
      totalDeductions: calculation.totalDeductions,
      netTotal: calculation.netTotal,
      fgts: calculation.fgts,
      employerCost: calculation.employerCost,
    });
  };

  // Verificar se pode editar
  const canEdit = vacation && !['COMPLETED', 'CANCELLED'].includes(vacation.status);

  if (isLoadingVacation) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  if (!vacation) {
    return (
      <div className="space-y-6">
        <PageHeader title="Férias não encontrada" />
        <SectionCard>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground">Esta férias não foi encontrada ou foi removida.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/vacations')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para lista
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Editar Férias"
          subtitle={`Férias de ${vacation.employeeName || 'Funcionário'}`}
        />
        <SectionCard>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
            <p className="text-muted-foreground mb-2">
              Não é possível editar férias com status{' '}
              <Badge variant="outline" className={VACATION_STATUS_COLORS[vacation.status as VacationStatusType]}>
                {VACATION_STATUS_LABELS[vacation.status as VacationStatusType]}
              </Badge>
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/vacations')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para lista
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Férias"
        subtitle={`Férias de ${vacation.employeeName || 'Funcionário'}`}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Coluna da esquerda - Formulário */}
          <SectionCard title="Dados da Férias">
            <div className="grid gap-4">
              {/* Funcionário (somente leitura) */}
              <div>
                <Label>Funcionário</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{vacation.employeeName || 'Não identificado'}</p>
                  {selectedEmployee?.monthlySalary && (
                    <p className="text-sm text-muted-foreground">
                      Salário: {formatCurrency(selectedEmployee.monthlySalary)}
                    </p>
                  )}
                </div>
              </div>

              {/* Status atual */}
              <div>
                <Label>Status Atual</Label>
                <div className="pt-2">
                  <Badge variant="outline" className={VACATION_STATUS_COLORS[vacation.status as VacationStatusType]}>
                    {VACATION_STATUS_LABELS[vacation.status as VacationStatusType]}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início *</Label>
                  <Input type="date" {...register('startDate')} />
                  {errors.startDate && (
                    <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>
                  )}
                </div>

                <div>
                  <Label>Data de Término *</Label>
                  <Input type="date" {...register('endDate')} />
                  {errors.endDate && (
                    <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              {/* Resumo de dias */}
              {daysFromDates > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <p className="font-medium text-blue-800 dark:text-blue-200">Resumo de Dias</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                      <p className="text-xs text-muted-foreground">Total Anual</p>
                      <p className="font-bold text-lg">{TOTAL_VACATION_DAYS}</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                      <p className="text-xs text-muted-foreground">Tirando Agora</p>
                      <p className="font-bold text-lg text-blue-600">{daysFromDates}</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                      <p className="text-xs text-muted-foreground">Restantes</p>
                      <p className="font-bold text-lg text-green-600">{remainingDays}</p>
                    </div>
                  </div>
                  {daysFromDates > TOTAL_VACATION_DAYS && (
                    <p className="text-sm text-red-600">
                      O período não pode exceder {TOTAL_VACATION_DAYS} dias
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label>Vender Dias dos Restantes (Abono Pecuniário)</Label>
                <Input
                  type="number"
                  min={0}
                  max={maxSellableDays}
                  {...register('soldDays')}
                  placeholder="0"
                  disabled={remainingDays === 0}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {remainingDays > 0 ? (
                    <>
                      Máximo vendável: {maxSellableDays} dias (de {remainingDays} restantes)
                      {soldDays > 0 && (
                        <span className="ml-2 text-orange-600">
                          → Saldo após venda: {balanceAfterSale} dias
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-yellow-600">Nenhum dia restante para vender</span>
                  )}
                </p>
                {errors.soldDays && (
                  <p className="text-sm text-destructive mt-1">{errors.soldDays.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                <input
                  type="checkbox"
                  id="advance13thSalary"
                  {...register('advance13thSalary')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="advance13thSalary" className="cursor-pointer">
                  Antecipar 1ª parcela do 13º salário
                </Label>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea {...register('observations')} placeholder="Observações sobre as férias" />
              </div>

              {/* Botão Calcular */}
              {!hasCalculated && (
                <Button
                  type="button"
                  onClick={handleCalculate}
                  disabled={!canCalculate}
                  className="w-full"
                  size="lg"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular Valores
                </Button>
              )}
            </div>
          </SectionCard>

          {/* Coluna da direita - Resumo Financeiro */}
          <SectionCard
            title="Resumo Financeiro"
            description={hasCalculated ? 'Confira os valores antes de salvar' : 'Preencha os dados e clique em Calcular'}
          >
            {!hasCalculated ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calculator className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-sm text-center">
                  Altere os dados se necessário,
                  <br />
                  depois clique em <strong>Calcular Valores</strong>
                </p>
              </div>
            ) : !calculation ? (
              <div className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="h-12 w-12 mb-4 text-yellow-500" />
                <p className="text-sm text-muted-foreground text-center">
                  Erro ao calcular. Verifique os dados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dados base */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Salário Mensal</p>
                      <p className="text-lg font-semibold">{formatCurrency(calculation.monthlySalary)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Salário Diário</p>
                      <p className="font-medium">{formatCurrency(calculation.dailySalary)}</p>
                    </div>
                  </div>
                </div>

                {/* Férias */}
                <div className="border-l-4 border-l-blue-500 pl-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-blue-500" />
                    <p className="font-medium">Férias ({calculation.vacationDays} dias)</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Base</p>
                      <p className="font-medium">{formatCurrency(calculation.vacationBase)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">1/3 Constitucional</p>
                      <p className="font-medium">{formatCurrency(calculation.vacationThird)}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-between">
                    <p className="text-muted-foreground">Total Férias</p>
                    <p className="font-semibold text-blue-600">{formatCurrency(calculation.vacationTotal)}</p>
                  </div>
                </div>

                {/* Abono pecuniário */}
                {calculation.soldDays > 0 && (
                  <div className="border-l-4 border-l-purple-500 pl-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="h-4 w-4 text-purple-500" />
                      <p className="font-medium">Abono Pecuniário ({calculation.soldDays} dias)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Base</p>
                        <p className="font-medium">{formatCurrency(calculation.soldDaysBase)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">1/3 sobre abono</p>
                        <p className="font-medium">{formatCurrency(calculation.soldDaysThird)}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex justify-between">
                        <p className="text-muted-foreground">Total Abono</p>
                        <p className="font-semibold text-purple-600">{formatCurrency(calculation.soldDaysTotal)}</p>
                      </div>
                      <p className="text-xs text-green-600 mt-1">* Isento de INSS e IRRF</p>
                    </div>
                  </div>
                )}

                {/* 13º salário */}
                {calculation.advance13th > 0 && (
                  <div className="border-l-4 border-l-orange-500 pl-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="h-4 w-4 text-orange-500" />
                      <p className="font-medium">Adiantamento 13º Salário</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <p className="text-muted-foreground">1ª Parcela (50%)</p>
                      <p className="font-semibold text-orange-600">{formatCurrency(calculation.advance13th)}</p>
                    </div>
                  </div>
                )}

                {/* Total Bruto */}
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-green-800 dark:text-green-200">Total Bruto</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(calculation.grossTotal)}</p>
                  </div>
                </div>

                {/* Descontos */}
                <div className="border-l-4 border-l-red-500 pl-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Minus className="h-4 w-4 text-red-500" />
                    <p className="font-medium">Descontos</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">INSS</p>
                      <p className="font-medium text-red-600">- {formatCurrency(calculation.inss)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">IRRF</p>
                      <p className="font-medium text-red-600">- {formatCurrency(calculation.irrf)}</p>
                    </div>
                    <div className="pt-2 border-t flex justify-between">
                      <p className="text-muted-foreground">Total Descontos</p>
                      <p className="font-semibold text-red-600">- {formatCurrency(calculation.totalDeductions)}</p>
                    </div>
                  </div>
                </div>

                {/* Valor Líquido */}
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-5 w-5 text-primary" />
                      <p className="font-semibold text-primary">Valor Líquido a Receber</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(calculation.netTotal)}</p>
                  </div>
                </div>

                {/* Custo Empresa */}
                <div className="border-l-4 border-l-gray-400 pl-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <p className="font-medium text-muted-foreground">Custos da Empresa</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">FGTS (8%)</p>
                      <p className="font-medium">{formatCurrency(calculation.fgts)}</p>
                    </div>
                    <div className="pt-2 border-t flex justify-between">
                      <p className="text-muted-foreground">Custo Total Empresa</p>
                      <p className="font-semibold">{formatCurrency(calculation.employerCost)}</p>
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="pt-4 border-t space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setHasCalculated(false)}
                  >
                    Recalcular
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex justify-start gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.push('/vacations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </form>
    </div>
  );
}
