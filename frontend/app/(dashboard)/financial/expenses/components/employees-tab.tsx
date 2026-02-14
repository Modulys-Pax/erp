'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, EmployeeCostDetail } from '@/lib/api/employee';
import { formatCurrency } from '@/lib/utils/currency';
import { expenseApi, Expense, ExpenseType } from '@/lib/api/expense';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ExportButton } from '@/components/ui/export-button';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EXPENSE_TYPE_LABELS,
  EXPENSE_TYPE_COLORS,
  type ExpenseTypeEnum,
} from '@/lib/constants/status.constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  Users,
  TrendingUp,
  Briefcase,
  Gift,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Receipt,
  Car,
  Utensils,
  Building,
  MoreVertical,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/date';

export function EmployeesExpensesTab() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [subTab, setSubTab] = useState('costs');
  
  // State para custos
  const [costsPage, setCostsPage] = useState(1);
  const costsLimit = 10;
  
  // State para reembolsos
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filterBranchId = effectiveBranchId || undefined;

  // Query: custos com funcionários
  const { data: costsData, isLoading: costsLoading } = useQuery({
    queryKey: ['employee-costs', filterBranchId, costsPage],
    queryFn: () => employeeApi.getCosts(filterBranchId, costsPage, costsLimit),
  });

  // Query: lista de funcionários para filtro
  const { data: employees } = useQuery({
    queryKey: ['employees', effectiveBranchId],
    queryFn: () => employeeApi.getAll(effectiveBranchId || undefined, false, 1, 1000),
  });

  // Query: reembolsos/despesas de funcionários
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', effectiveBranchId, selectedEmployee, selectedType, startDate, endDate],
    queryFn: () =>
      expenseApi.getAll(
        effectiveBranchId || undefined,
        selectedEmployee || undefined,
        selectedType || undefined,
        startDate || undefined,
        endDate || undefined,
      ),
  });

  useEffect(() => {
    setCostsPage(1);
  }, [effectiveBranchId]);

  // Métricas de reembolsos
  const expenseMetrics = useMemo(() => {
    const total = expenses.length;
    const totalAmount = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    return { total, totalAmount };
  }, [expenses]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toastSuccess('Despesa excluída');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao excluir despesa'),
  });

  const handleDelete = (id: string) => {
    if (confirm('Excluir esta despesa?')) deleteMutation.mutate(id);
  };


  const formatNumber = (value: number | undefined | null) => {
    const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR').format(n);
  };

  const getTypeIcon = (type: ExpenseType) => {
    const icons = {
      [ExpenseType.TRANSPORT]: Car,
      [ExpenseType.MEAL]: Utensils,
      [ExpenseType.ACCOMMODATION]: Building,
      [ExpenseType.OTHER]: MoreVertical,
    };
    return icons[type] || Receipt;
  };

  return (
    <div className="space-y-6">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="costs">Custos Mensais</TabsTrigger>
          <TabsTrigger value="reimbursements">Reembolsos</TabsTrigger>
        </TabsList>

        {/* Aba: Custos Mensais com Funcionários */}
        <TabsContent value="costs" className="space-y-6 mt-4">
          {costsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : costsData ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  title="Total de Funcionários"
                  value={formatNumber(costsData.summary.totalEmployees)}
                  icon={Users}
                  className="border-l-4 border-l-primary"
                />
                <StatCard
                  title="Custo Mensal Total"
                  value={formatCurrency(costsData.summary.totalMonthlyCost)}
                  icon={DollarSign}
                  className="border-l-4 border-l-green-500"
                />
                <StatCard
                  title="Custo Anual Total"
                  value={formatCurrency(costsData.summary.totalAnnualCost)}
                  icon={TrendingUp}
                  className="border-l-4 border-l-blue-500"
                />
              </div>

              {/* Breakdown de Custos */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Salários</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(costsData.summary.totalMonthlySalaries)}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Benefícios</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(costsData.summary.totalMonthlyBenefits)}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Impostos</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(costsData.summary.totalMonthlyTaxes)}
                  </p>
                </div>
              </div>

              {/* Lista de Funcionários */}
              <SectionCard
                title="Funcionários e Custos"
                description={costsData.employees.total > 0 ? `${costsData.employees.total} funcionário(s)` : undefined}
                actions={
                  <ExportButton<EmployeeCostDetail>
                    data={costsData.employees.data}
                    filename="gastos-funcionarios"
                    title="Gastos com Funcionários"
                    columns={[
                      { key: 'employeeName', header: 'Funcionário' },
                      { key: 'position', header: 'Cargo' },
                      { key: 'monthlySalary', header: 'Salário', getValue: (e) => formatCurrency(e.monthlySalary ?? 0) },
                      { key: 'riskAddition', header: 'Insalubridade / Periculosidade', getValue: (e) => (e.riskAdditionLabel ? `${e.riskAdditionLabel}: ${formatCurrency(e.riskAdditionAmount ?? 0)}` : '—') },
                      { key: 'totalBenefits', header: 'Benefícios', getValue: (e) => formatCurrency(e.totalBenefits ?? 0) },
                      { key: 'totalTaxes', header: 'Impostos', getValue: (e) => formatCurrency(e.totalTaxes ?? 0) },
                      { key: 'totalMonthlyCost', header: 'Custo Mensal', getValue: (e) => formatCurrency(e.totalMonthlyCost ?? 0) },
                    ]}
                  />
                }
              >
                {costsData.employees.data.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Nenhum funcionário encontrado"
                    description="Cadastre funcionários para ver seus custos."
                    action={{ label: 'Novo Funcionário', href: '/employees/new' }}
                  />
                ) : (
                  <DataTable
                    data={costsData.employees.data}
                    pagination={
                      costsData.employees.totalPages > 1
                        ? {
                            page: costsData.employees.page,
                            limit: costsData.employees.limit,
                            total: costsData.employees.total,
                            totalPages: costsData.employees.totalPages,
                          }
                        : undefined
                    }
                    onPageChange={setCostsPage}
                    isLoading={costsLoading}
                    emptyMessage="Nenhum funcionário encontrado"
                    columns={[
                      {
                        key: 'employeeName',
                        header: 'Funcionário',
                        render: (employee) => (
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <Link
                                href={`/employees/${employee.employeeId}/costs`}
                                className="font-medium text-primary hover:underline"
                              >
                                {employee.employeeName}
                              </Link>
                              {employee.position && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {employee.position}
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      },
                      {
                        key: 'monthlySalary',
                        header: 'Salário',
                        render: (employee) => formatCurrency(employee.monthlySalary ?? 0),
                        className: 'text-right',
                      },
                      {
                        key: 'riskAddition',
                        header: 'Insalub. / Peric.',
                        render: (employee) => {
                          if (!employee.riskAdditionAmount || employee.riskAdditionAmount <= 0) return '—';
                          const label = employee.riskAdditionLabel || 'Adicional';
                          return (
                            <span title={label}>
                              {label}: {formatCurrency(employee.riskAdditionAmount)}
                            </span>
                          );
                        },
                        className: 'text-right',
                      },
                      {
                        key: 'totalBenefits',
                        header: 'Benefícios',
                        render: (employee) => formatCurrency(employee.totalBenefits ?? 0),
                        className: 'text-right',
                      },
                      {
                        key: 'totalTaxes',
                        header: 'Impostos',
                        render: (employee) => formatCurrency(employee.totalTaxes ?? 0),
                        className: 'text-right',
                      },
                      {
                        key: 'totalMonthlyCost',
                        header: 'Custo Mensal',
                        render: (employee) => (
                          <span className="font-semibold">{formatCurrency(employee.totalMonthlyCost ?? 0)}</span>
                        ),
                        className: 'text-right',
                      },
                    ]}
                  />
                )}
              </SectionCard>
            </>
          ) : (
            <EmptyState icon={DollarSign} title="Nenhum dado disponível" description="Não há dados de custos." />
          )}
        </TabsContent>

        {/* Aba: Reembolsos */}
        <TabsContent value="reimbursements" className="space-y-6 mt-4">
          {/* Métricas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total de Despesas"
              value={expenseMetrics.total}
              icon={Receipt}
              className="border-l-4 border-l-primary"
            />
            <StatCard
              title="Valor Total"
              value={formatCurrency(expenseMetrics.totalAmount)}
              icon={DollarSign}
              className="border-l-4 border-l-red-500"
            />
          </div>

          {/* Filtros */}
          <SectionCard title="Filtros">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Funcionário</Label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Todos' },
                    ...toSelectOptions(employees?.data || [], (e) => e.id, (e) => e.name),
                  ]}
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  placeholder="Todos os funcionários"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Tipo</Label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'TRANSPORT', label: 'Transporte' },
                    { value: 'MEAL', label: 'Refeição' },
                    { value: 'ACCOMMODATION', label: 'Hospedagem' },
                    { value: 'OTHER', label: 'Outros' },
                  ]}
                  value={selectedType}
                  onChange={setSelectedType}
                  placeholder="Todos os tipos"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Data Inicial</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Data Final</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </SectionCard>

          {/* Lista */}
          <SectionCard
            title="Despesas Cadastradas"
            description={expenses.length > 0 ? `${expenses.length} registro(s)` : undefined}
            actions={
              <Link href="/expenses/new">
                <Button size="sm">Nova Despesa</Button>
              </Link>
            }
          >
            {!expensesLoading && expenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nenhuma despesa cadastrada"
                description="Cadastre despesas para rastreá-las."
                action={{ label: 'Nova Despesa', href: '/expenses/new' }}
              />
            ) : (
              <DataTable
                data={expenses}
                isLoading={expensesLoading}
                emptyMessage="Nenhuma despesa encontrada"
                columns={[
                  {
                    key: 'description',
                    header: 'Descrição',
                    render: (expense) => {
                      const TypeIcon = getTypeIcon(expense.type);
                      return (
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                            <TypeIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <span className="font-medium text-foreground">{expense.description}</span>
                            {expense.employeeName && (
                              <p className="text-xs text-muted-foreground">{expense.employeeName}</p>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'type',
                    header: 'Tipo',
                    render: (expense) => {
                      const colors = EXPENSE_TYPE_COLORS[expense.type as ExpenseTypeEnum];
                      return (
                        <span
                          className={`inline-flex items-center rounded-full border border-border px-2 py-1 text-xs font-medium ${colors}`}
                        >
                          {EXPENSE_TYPE_LABELS[expense.type as ExpenseTypeEnum]}
                        </span>
                      );
                    },
                  },
                  {
                    key: 'date',
                    header: 'Data',
                    render: (expense) => (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(expense.expenseDate)}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'amount',
                    header: 'Valor',
                    render: (expense) => (
                      <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                    ),
                    className: 'text-right',
                  },
                  {
                    key: 'actions',
                    header: 'Ações',
                    className: 'text-right',
                    render: (expense) => (
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/expenses/${expense.id}`} className="flex items-center">
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            {!expense.financialTransactionId && (
                              <DropdownMenuItem onClick={() => handleDelete(expense.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
