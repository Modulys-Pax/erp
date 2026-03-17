'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, Employee } from '@/lib/api/employee';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, PaginationMeta } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Gift,
  Briefcase,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import { Can } from '@/components/auth/permission-gate';
import { ExportButton } from '@/components/ui/export-button';
import { formatCurrency } from '@/lib/utils/currency';
import { ACTIVE_STATUS_COLORS } from '@/lib/constants/status.constants';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Buscar dados para métricas (sem paginação)
  const { data: allEmployees } = useQuery({
    queryKey: ['employees-metrics', effectiveBranchId, showDeleted],
    queryFn: () => employeeApi.getAll(effectiveBranchId || undefined, showDeleted, 1, 1000),
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['employees', effectiveBranchId, showDeleted, page, limit],
    queryFn: () => employeeApi.getAll(effectiveBranchId || undefined, showDeleted, page, limit),
  });

  // Cálculo das métricas
  const metrics = useMemo(() => {
    const employees = allEmployees?.data || [];
    const total = employees.length;
    const active = employees.filter((e) => e.active).length;
    const inactive = employees.filter((e) => !e.active).length;
    const departments = new Set(employees.map((e) => e.department).filter(Boolean)).size;
    return { total, active, inactive, departments };
  }, [allEmployees]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['employee-costs'] });
      toastSuccess('Funcionário excluído com sucesso');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao excluir funcionário');
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Funcionário',
      render: (employee: Employee) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{employee.name}</p>
            {employee.cpf && (
              <p className="text-xs text-muted-foreground">CPF: {employee.cpf}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contato',
      render: (employee: Employee) => (
        <div className="space-y-1 text-sm">
          {employee.email && (
            <div className="flex items-center gap-2 text-foreground">
              <Mail className="h-3 w-3 text-muted-foreground" />
              {employee.email}
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              {employee.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'position',
      header: 'Cargo/Departamento',
      render: (employee: Employee) => (
        <div className="space-y-1 text-sm">
          {employee.position && (
            <div className="flex items-center gap-2 text-foreground">
              <Briefcase className="h-3 w-3 text-muted-foreground" />
              {employee.position}
            </div>
          )}
          {employee.department && (
            <p className="text-muted-foreground pl-5">{employee.department}</p>
          )}
        </div>
      ),
    },
    {
      key: 'hireDate',
      header: 'Admissão',
      render: (employee: Employee) => (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {employee.hireDate
            ? formatDate(employee.hireDate)
            : '-'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (employee: Employee) => (
        <Badge
          className={employee.active ? ACTIVE_STATUS_COLORS.active : ACTIVE_STATUS_COLORS.inactive}
        >
          {employee.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (employee: Employee) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Can permission="employees.update">
                <DropdownMenuItem asChild>
                  <Link href={`/employees/${employee.id}`} className="flex items-center">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
              </Can>
              <Can permission="employee-benefits.view">
                <DropdownMenuItem asChild>
                  <Link href={`/employees/${employee.id}/benefits`} className="flex items-center">
                    <Gift className="mr-2 h-4 w-4" />
                    Benefícios
                  </Link>
                </DropdownMenuItem>
              </Can>
              <Can permission="employees.delete">
                {!employee.deletedAt && (
                  <DropdownMenuItem
                    onClick={() => handleDelete(employee.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const pagination: PaginationMeta | undefined = response
    ? {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funcionários"
        subtitle="Gerencie os funcionários do sistema"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleted(!showDeleted);
                setPage(1);
              }}
            >
              {showDeleted ? 'Ocultar Excluídos' : 'Mostrar Excluídos'}
            </Button>
            <Can permission="employees.create">
              <Link href="/employees/new">
                <Button>Novo Funcionário</Button>
              </Link>
            </Can>
          </div>
        }
      />

      {/* Métricas */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Funcionários"
            value={metrics.total}
            icon={Users}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Ativos"
            value={metrics.active}
            icon={UserCheck}
            className="border-l-4 border-l-green-500"
          />
          <StatCard
            title="Inativos"
            value={metrics.inactive}
            icon={UserX}
            className="border-l-4 border-l-red-500"
          />
          <StatCard
            title="Departamentos"
            value={metrics.departments}
            icon={Briefcase}
            className="border-l-4 border-l-blue-500"
          />
        </div>
      )}

      {/* Lista */}
      <SectionCard
        title="Funcionários"
        description={response?.total ? `${response.total} funcionário(s)` : undefined}
        actions={
          <ExportButton<Employee>
            data={response?.data || []}
            filename="funcionarios"
            title="Lista de Funcionários"
            columns={[
              { key: 'name', header: 'Nome' },
              { key: 'cpf', header: 'CPF' },
              { key: 'position', header: 'Cargo' },
              { key: 'department', header: 'Departamento' },
              { key: 'hireDate', header: 'Admissão', getValue: (e) => e.hireDate ? formatDate(e.hireDate) : '-' },
              { key: 'monthlySalary', header: 'Salário', getValue: (e) => e.monthlySalary ? formatCurrency(e.monthlySalary) : '-' },
              { key: 'active', header: 'Status', getValue: (e) => e.active ? 'Ativo' : 'Inativo' },
            ]}
          />
        }
      >
        {!isLoading && response?.data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum funcionário cadastrado"
            description="Cadastre funcionários para gerenciá-los aqui."
            action={{ label: 'Novo Funcionário', href: '/employees/new' }}
          />
        ) : (
          <DataTable
            data={response?.data || []}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhum funcionário cadastrado"
            pagination={pagination}
            onPageChange={setPage}
            rowClassName={(employee: Employee) =>
              !employee.active
                ? 'opacity-60 bg-muted/30'
                : undefined
            }
          />
        )}
      </SectionCard>
    </div>
  );
}
