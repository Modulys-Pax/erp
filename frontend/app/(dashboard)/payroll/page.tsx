'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  accountPayableApi,
  PayrollEmployeeDetail,
  ProcessPayrollResult,
  AccountPayable,
} from '@/lib/api/account-payable';
import { formatCurrency } from '@/lib/utils/currency';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import {
  getFilteredMonthOptions,
  getFilteredYearOptions,
  getAllowedSalaryPeriods,
} from '@/lib/utils/salary-period';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Plus,
  Banknote,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';
import { ExportButton } from '@/components/ui/export-button';

const MONTHS = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

// Gerar opções de ano para filtro (últimos 3 anos)
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= currentYear - 2; y--) {
    years.push({ value: y.toString(), label: y.toString() });
  }
  return years;
};

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Filtros da tabela (para visualização)
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());

  // Dialog de processamento
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processMonth, setProcessMonth] = useState<string>(currentMonth.toString());
  const [processYear, setProcessYear] = useState<string>(currentYear.toString());
  const [processResult, setProcessResult] = useState<ProcessPayrollResult | null>(null);

  // Opções de período para processamento
  const allowedPeriods = useMemo(() => getAllowedSalaryPeriods(), []);
  const processYearOptions = useMemo(() => getFilteredYearOptions(), []);
  const processMonthOptions = useMemo(
    () => getFilteredMonthOptions(parseInt(processYear) || currentYear),
    [processYear, currentYear],
  );

  // Opções de período para filtro (qualquer mês/ano dos últimos 3 anos)
  const filterYearOptions = useMemo(() => generateYearOptions(), []);
  const filterMonthOptions = MONTHS;

  // Buscar todas as contas a pagar de folha de pagamento (para listagem)
  const { data: allPayrollAccounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['payroll-accounts', effectiveBranchId],
    queryFn: () => accountPayableApi.getAll(undefined, effectiveBranchId || undefined),
    enabled: !!effectiveBranchId,
  });

  // Filtrar contas pelo mês/ano selecionado
  const filteredAccounts = useMemo(() => {
    const prefix = `FOLHA-${filterMonth.padStart(2, '0')}/${filterYear}-`;
    return allPayrollAccounts.filter((a) => a.documentNumber?.startsWith(prefix));
  }, [allPayrollAccounts, filterMonth, filterYear]);

  // Métricas das contas filtradas
  const metrics = useMemo(() => {
    const total = filteredAccounts.length;
    const pending = filteredAccounts.filter((a) => a.status === 'PENDING').length;
    const paid = filteredAccounts.filter((a) => a.status === 'PAID').length;
    const cancelled = filteredAccounts.filter((a) => a.status === 'CANCELLED').length;
    const totalPending = filteredAccounts
      .filter((a) => a.status === 'PENDING')
      .reduce((acc, a) => acc + a.amount, 0);
    const totalPaid = filteredAccounts
      .filter((a) => a.status === 'PAID')
      .reduce((acc, a) => acc + a.amount, 0);
    return { total, pending, paid, cancelled, totalPending, totalPaid };
  }, [filteredAccounts]);

  // Prévia da folha para o dialog de processamento
  const { data: preview = [], isLoading: isLoadingPreview } = useQuery({
    queryKey: ['payroll-preview', effectiveBranchId, processMonth, processYear],
    queryFn: () =>
      accountPayableApi.getPayrollPreview(
        parseInt(processMonth),
        parseInt(processYear),
        effectiveBranchId || '',
      ),
    enabled: !!effectiveBranchId && processDialogOpen,
  });

  // Métricas da prévia
  const previewMetrics = useMemo(() => {
    const total = preview.length;
    const toCreate = preview.filter((p) => p.status === 'created').length;
    const alreadyExists = preview.filter((p) => p.status === 'already_exists').length;
    const skipped = preview.filter((p) => p.status === 'skipped_no_salary').length;
    const totalAmount = preview
      .filter((p) => p.status === 'created')
      .reduce((acc, p) => acc + p.totalAmount, 0);
    return { total, toCreate, alreadyExists, skipped, totalAmount };
  }, [preview]);

  // Mutation para processar folha
  const processMutation = useMutation({
    mutationFn: () => {
      // Calcular data de vencimento automaticamente (dia 5 do próximo mês)
      const month = parseInt(processMonth);
      const year = parseInt(processYear);
      let dueMonth = month + 1;
      let dueYear = year;
      if (dueMonth > 12) {
        dueMonth = 1;
        dueYear++;
      }
      const dueDate = `${dueYear}-${dueMonth.toString().padStart(2, '0')}-05`;

      return accountPayableApi.processPayroll({
        referenceMonth: month,
        referenceYear: year,
        dueDate,
        companyId: DEFAULT_COMPANY_ID,
        branchId: effectiveBranchId || '',
      });
    },
    onSuccess: (data) => {
      setProcessResult(data);
      queryClient.invalidateQueries({ queryKey: ['payroll-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-preview'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      if (data.created > 0) {
        toastSuccess(`${data.created} conta(s) a pagar criada(s) com sucesso`);
      }
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao processar folha de pagamento'),
  });

  // Ajustar mês de processamento se o ano mudar e o mês não estiver disponível
  useEffect(() => {
    const validMonths = processMonthOptions.map((m) => m.value);
    if (!validMonths.includes(processMonth) && validMonths.length > 0) {
      setProcessMonth(validMonths[0]);
    }
  }, [processMonthOptions, processMonth]);

  const handleOpenProcessDialog = () => {
    setProcessMonth(currentMonth.toString());
    setProcessYear(currentYear.toString());
    setProcessResult(null);
    setProcessDialogOpen(true);
  };

  const handleProcess = () => {
    processMutation.mutate();
  };

  const handleCloseDialog = () => {
    setProcessResult(null);
    setProcessDialogOpen(false);
  };

  const getMonthName = (month: number) =>
    MONTHS.find((m) => m.value === month.toString())?.label || '';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'PAID':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pago
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPreviewStatusBadge = (status: string) => {
    switch (status) {
      case 'created':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            A processar
          </Badge>
        );
      case 'already_exists':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Já processado
          </Badge>
        );
      case 'skipped_no_salary':
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Sem salário base
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Folha de Pagamento"
        subtitle="Gerencie a folha de pagamento dos funcionários"
        actions={
          <Button onClick={handleOpenProcessDialog}>
            <FileText className="mr-2 h-4 w-4" />
            Apurar Folha de Pagamento
          </Button>
        }
      />

      {/* Filtros de Período (para visualização) */}
      <SectionCard title="Filtrar por Período">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Mês</Label>
            <SearchableSelect
              options={filterMonthOptions}
              value={filterMonth}
              onChange={setFilterMonth}
              placeholder="Selecione o mês"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Ano</Label>
            <SearchableSelect
              options={filterYearOptions}
              value={filterYear}
              onChange={setFilterYear}
              placeholder="Selecione o ano"
            />
          </div>
        </div>
      </SectionCard>

      {/* Métricas */}
      {isLoadingAccounts ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Registros"
            value={metrics.total}
            icon={Users}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Pendentes"
            value={formatCurrency(metrics.totalPending)}
            icon={Clock}
            className="border-l-4 border-l-yellow-500"
          />
          <StatCard
            title="Pagos"
            value={formatCurrency(metrics.totalPaid)}
            icon={CheckCircle}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Registros Pagos"
            value={metrics.paid}
            icon={Banknote}
            className="border-l-4 border-l-blue-500"
          />
        </div>
      )}

      {/* Lista de Folhas Processadas */}
      <SectionCard
        title={`Folha de Pagamento - ${getMonthName(parseInt(filterMonth))}/${filterYear}`}
        description={filteredAccounts.length > 0 ? `${filteredAccounts.length} registro(s)` : undefined}
        actions={
          <ExportButton<AccountPayable>
            data={filteredAccounts}
            filename={`folha-pagamento-${filterMonth}-${filterYear}`}
            title={`Folha de Pagamento - ${getMonthName(parseInt(filterMonth))}/${filterYear}`}
            columns={[
              { key: 'description', header: 'Funcionário' },
              { key: 'amount', header: 'Valor', getValue: (a) => formatCurrency(a.amount) },
              { key: 'dueDate', header: 'Vencimento', getValue: (a) => formatDate(a.dueDate) },
              { key: 'status', header: 'Status', getValue: (a) => a.status === 'PENDING' ? 'Pendente' : a.status === 'PAID' ? 'Pago' : 'Cancelado' },
              { key: 'paymentDate', header: 'Pago em', getValue: (a) => a.paymentDate ? formatDate(a.paymentDate) : '-' },
            ]}
          />
        }
      >
        {!isLoadingAccounts && filteredAccounts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma folha processada"
            description={`Não há folha de pagamento processada para ${getMonthName(parseInt(filterMonth))}/${filterYear}.`}
            action={{
              label: 'Processar Folha',
              onClick: handleOpenProcessDialog,
            }}
          />
        ) : (
          <DataTable
            data={filteredAccounts}
            isLoading={isLoadingAccounts}
            emptyMessage="Nenhum registro encontrado"
            rowClassName={(account: AccountPayable) =>
              account.status === 'PENDING'
                ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-l-2 border-l-yellow-500'
                : undefined
            }
            columns={[
              {
                key: 'description',
                header: 'Funcionário',
                render: (account) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{account.description}</span>
                      {account.notes && (
                        <p className="text-xs text-muted-foreground">
                          {account.riskAdditionLabel
                            ? account.notes.replace(/\bAdicional\b/g, account.riskAdditionLabel)
                            : account.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'amount',
                header: 'Valor',
                render: (account) => (
                  <span className="font-semibold text-foreground">
                    {formatCurrency(account.amount)}
                  </span>
                ),
                className: 'text-right',
              },
              {
                key: 'dueDate',
                header: 'Vencimento',
                render: (account) => (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{formatDate(account.dueDate)}</span>
                  </div>
                ),
              },
              {
                key: 'paymentDate',
                header: 'Pagamento',
                render: (account) => (
                  <span className="text-muted-foreground">
                    {account.paymentDate ? formatDate(account.paymentDate) : '-'}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (account) => getStatusBadge(account.status),
              },
            ]}
          />
        )}
      </SectionCard>

      {/* Dialog de Processamento */}
      <Dialog open={processDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Processar Folha de Pagamento
            </DialogTitle>
            <DialogDescription>
              Selecione o período e gere as contas a pagar para os funcionários
            </DialogDescription>
          </DialogHeader>

          {!processResult ? (
            <>
              <div className="space-y-4 py-4">
                {/* Seletores de Mês/Ano */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Mês *</Label>
                    <SearchableSelect
                      options={processMonthOptions}
                      value={processMonth}
                      onChange={setProcessMonth}
                      placeholder="Selecione o mês"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Ano *</Label>
                    <SearchableSelect
                      options={processYearOptions}
                      value={processYear}
                      onChange={setProcessYear}
                      placeholder="Selecione o ano"
                    />
                  </div>
                </div>

                {/* Aviso de períodos permitidos */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Períodos permitidos:</strong> {allowedPeriods.map((p) => p.label).join(', ')}
                  </p>
                </div>

                {/* Prévia */}
                {isLoadingPreview ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">
                        Resumo - {getMonthName(parseInt(processMonth))}/{processYear}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold text-lg">{previewMetrics.total}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">A processar</p>
                          <p className="font-semibold text-lg text-blue-600">{previewMetrics.toCreate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Já processados</p>
                          <p className="font-semibold text-lg text-green-600">{previewMetrics.alreadyExists}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor total</p>
                          <p className="font-semibold text-lg">{formatCurrency(previewMetrics.totalAmount)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Lista de funcionários na prévia */}
                    {preview.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-sm">Funcionários</h3>
                        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                          {preview.map((employee) => (
                            <div
                              key={employee.employeeId}
                              className="flex items-center justify-between p-3 hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                  <Users className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{employee.employeeName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Salário: {formatCurrency(employee.baseSalary)}
                                    {(employee.riskAdditionAmount ?? 0) > 0 && (
                                      <span className="ml-1">+ {employee.riskAdditionLabel || 'Adicional'}: {formatCurrency(employee.riskAdditionAmount!)}</span>
                                    )}
                                    {employee.benefits.length > 0 && (
                                      <span className="ml-1 text-green-600">
                                        + {employee.benefits.map((b) => `${b.benefitName} (${formatCurrency(b.amount)})`).join(', ')}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs font-semibold text-primary">
                                    Total: {formatCurrency(employee.totalAmount)}
                                  </p>
                                </div>
                              </div>
                              {getPreviewStatusBadge(employee.status)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>O que vai acontecer:</strong>
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                        <li>
                          Será criada uma <strong>Conta a Pagar</strong> para cada funcionário
                        </li>
                        <li>O valor inclui salário base + benefícios calculados</li>
                        <li>Vencimento: dia 5 do mês seguinte ao período</li>
                        <li>As contas aparecerão na tela de Contas a Pagar</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={processMutation.isPending || isLoadingPreview || previewMetrics.toCreate === 0}
                >
                  {processMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Processar ({previewMetrics.toCreate})
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {/* Resumo do Resultado */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-800 dark:text-green-200">
                    <CheckCircle className="h-4 w-4" />
                    Folha Processada com Sucesso!
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{processResult.totalEmployees}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{processResult.created}</p>
                      <p className="text-xs text-muted-foreground">Criados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{processResult.alreadyExists}</p>
                      <p className="text-xs text-muted-foreground">Já Existiam</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(processResult.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                    </div>
                  </div>
                </div>

                {/* Link para Contas a Pagar */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    As contas a pagar foram criadas. Acesse a tela de{' '}
                    <Link href="/accounts-payable" className="font-semibold underline">
                      Contas a Pagar
                    </Link>{' '}
                    para efetuar os pagamentos.
                  </p>
                </div>

                {/* Detalhes */}
                <div>
                  <h3 className="font-semibold mb-3">Detalhes por Funcionário</h3>
                  <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {processResult.details.map((detail) => (
                      <div
                        key={detail.employeeId}
                        className="flex items-center justify-between p-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{detail.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(detail.totalAmount)}
                            </p>
                          </div>
                        </div>
                        {detail.status === 'created' ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <Plus className="h-3 w-3 mr-1" />
                            Criado
                          </Badge>
                        ) : detail.status === 'already_exists' ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Já existia
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Ignorado
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleCloseDialog}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
