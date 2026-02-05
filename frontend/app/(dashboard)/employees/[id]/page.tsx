'use client';

import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { employeeApi, UpdateEmployeeDto } from '@/lib/api/employee';
import { userApi, UpdateUserDto, CreateUserDto } from '@/lib/api/user';
import { roleApi } from '@/lib/api/role';
import { branchApi } from '@/lib/api/branch';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toSelectOptions } from '@/lib/hooks/use-searchable-select';

const employeeSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    cpf: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    position: z.string().optional(),
    department: z.string().optional(),
    hireDate: z.string().optional(),
    monthlySalary: z
      .coerce.number()
      .min(0, 'Salário mensal não pode ser negativo')
      .optional()
      .or(z.nan()),
    companyId: z.string().uuid('Selecione uma empresa'),
    branchId: z.string().uuid('Selecione uma filial'),
    active: z.boolean(),
    hasSystemAccess: z.boolean().default(false),
    systemEmail: z.string().email('Email de acesso inválido').optional().or(z.literal('')),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional().or(z.literal('')),
    roleId: z.string().uuid('Selecione um cargo').optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.hasSystemAccess) {
      const emailToUse = data.systemEmail || data.email;
      if (!emailToUse) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email é obrigatório para acesso ao sistema',
          path: ['systemEmail'],
        });
      }

      if (!data.password || data.password.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Senha é obrigatória e deve ter no mínimo 6 caracteres',
          path: ['password'],
        });
      }

      if (!data.roleId || data.roleId === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cargo é obrigatório para acesso ao sistema',
          path: ['roleId'],
        });
      }
    }
  });

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();

  const { data: branchesResponse, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
    enabled: true,
  });

  const allBranches = branchesResponse?.data || [];
  const branches = isAdmin
    ? allBranches.filter((b) => b.active)
    : allBranches.filter((b) => b.active && b.id === effectiveBranchId);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeeApi.getById(id),
  });

  const { data: userList } = useQuery({
    queryKey: ['users-by-employee', id],
    queryFn: () => userApi.getAll(undefined, false, 1, 1, id),
  });

  const linkedUser = userList?.data?.[0] ?? null;

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.getAll(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      hasSystemAccess: false,
    },
  });

  // Ref para rastrear último funcionário resetado
  const lastEmployeeIdRef = useRef<string | null>(null);

  // Resetar formulário quando o funcionário for carregado (filial sempre do funcionário, nunca da sidebar)
  useEffect(() => {
    if (employee && !isLoading && lastEmployeeIdRef.current !== employee.id) {
      lastEmployeeIdRef.current = employee.id;
      const userHasAccess = !!linkedUser && linkedUser.active;
      reset({
        name: employee.name,
        cpf: employee.cpf || '',
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
        department: employee.department || '',
        hireDate: employee.hireDate
          ? new Date(employee.hireDate).toISOString().split('T')[0]
          : '',
        monthlySalary: employee.monthlySalary,
        companyId: employee.companyId,
        branchId: employee.branchId || '',
        active: employee.active,
        hasSystemAccess: userHasAccess,
        systemEmail: linkedUser?.email || employee.email || '',
        roleId: linkedUser?.role.id || '',
        password: '',
      });
    }
  }, [employee, isLoading, reset, linkedUser]);

  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const monthlySalaryValue = data.monthlySalary;
      const monthlySalary =
        monthlySalaryValue !== undefined && !isNaN(monthlySalaryValue)
          ? monthlySalaryValue
          : undefined;

      const submitData: UpdateEmployeeDto = {
        name: data.name,
        cpf: data.cpf || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        position: data.position || undefined,
        department: data.department || undefined,
        hireDate: data.hireDate || undefined,
        monthlySalary,
        companyId: DEFAULT_COMPANY_ID,
        branchId: data.branchId,
        active: data.active,
      };

      // Atualizar dados do funcionário
      const updatedEmployee = await employeeApi.update(id, submitData);

      // Gerenciar acesso ao sistema
      if (!data.hasSystemAccess) {
        if (linkedUser && linkedUser.active) {
          const userUpdate: UpdateUserDto = {
            active: false,
          };
          await userApi.update(linkedUser.id, userUpdate);
        }
        return { employee: updatedEmployee };
      }

      const systemEmail = data.systemEmail || data.email;

      if (linkedUser) {
        const userUpdate: UpdateUserDto = {
          email: systemEmail as string,
          roleId: data.roleId as string,
          active: true,
          branchId: data.branchId,
        };

        if (data.password && data.password.length >= 6) {
          userUpdate.newPassword = data.password;
        }

        const updatedUser = await userApi.update(linkedUser.id, userUpdate);
        return { employee: updatedEmployee, user: updatedUser };
      }

      const userPayload: CreateUserDto = {
        name: data.name,
        email: systemEmail as string,
        password: data.password as string,
        companyId: DEFAULT_COMPANY_ID,
        branchId: data.branchId,
        roleId: data.roleId as string,
        active: true,
        employeeId: id,
      };

      const newUser = await userApi.create(userPayload);

      return { employee: updatedEmployee, user: newUser };
    },
    onSuccess: async () => {
      // Invalidar queries relacionadas ao funcionário
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Invalidar queries de custos para atualizar os cálculos baseados no salário
      queryClient.invalidateQueries({ queryKey: ['employee-costs'] });
      queryClient.invalidateQueries({ queryKey: ['employee-detail-costs', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-by-employee', id] });
      await queryClient.refetchQueries({ queryKey: ['employees'] });
      toastSuccess('Funcionário atualizado com sucesso');
      router.push('/employees');
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    const monthlySalaryValue = watch('monthlySalary');
    const monthlySalary =
      monthlySalaryValue !== undefined && !isNaN(monthlySalaryValue)
        ? monthlySalaryValue
        : undefined;

    const submitData: EmployeeFormData = {
      ...data,
      monthlySalary,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <SectionCard>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

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
      <div className="flex items-center justify-between">
        <PageHeader
          title="Editar Funcionário"
          subtitle="Atualize os dados do funcionário"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/employees/${id}/payments`)}
          >
            Histórico de Pagamentos
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/employees/${id}/benefits`)}
          >
            Gerenciar Benefícios
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/employees/${id}/costs`)}
          >
            Ver Custos
          </Button>
        </div>
      </div>

      <SectionCard title="Dados do Funcionário">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm text-muted-foreground mb-2">
              Nome *
            </Label>
            <Input
              id="name"
              {...register('name')}
              className={errors.name ? 'border-destructive' : 'rounded-xl'}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cpf" className="text-sm text-muted-foreground mb-2">
                CPF
              </Label>
              <Input id="cpf" {...register('cpf')} className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="hireDate" className="text-sm text-muted-foreground mb-2">
                Data de Admissão
              </Label>
              <Input id="hireDate" type="date" {...register('hireDate')} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground mb-2">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={errors.email ? 'border-destructive' : 'rounded-xl'}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm text-muted-foreground mb-2">
                Telefone
              </Label>
              <Input id="phone" {...register('phone')} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position" className="text-sm text-muted-foreground mb-2">
                Cargo
              </Label>
              <Input id="position" {...register('position')} className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="department" className="text-sm text-muted-foreground mb-2">
                Departamento
              </Label>
              <Input id="department" {...register('department')} className="rounded-xl" />
            </div>
          </div>

          <div>
            <Label htmlFor="monthlySalary" className="text-sm text-muted-foreground mb-2">
              Salário Mensal
            </Label>
            <CurrencyInput
              id="monthlySalary"
              placeholder="0,00"
              error={!!errors.monthlySalary}
              value={watch('monthlySalary')}
              onChange={(value) => {
                setValue('monthlySalary', value || undefined, { shouldValidate: true });
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Salário mensal base do funcionário
            </p>
            {errors.monthlySalary && (
              <p className="text-sm text-destructive mt-1">
                {errors.monthlySalary.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="branchId" className="text-sm text-muted-foreground mb-2">
              Filial *
            </Label>
            <SearchableSelect
              id="branchId"
              options={toSelectOptions(
                branches,
                (b) => b.id,
                (b) => b.name,
              )}
              value={watch('branchId') || ''}
              onChange={(value) => setValue('branchId', value, { shouldValidate: true })}
              placeholder={isLoadingBranches ? 'Carregando...' : 'Selecione uma filial'}
              disabled={isLoadingBranches}
              error={!!errors.branchId}
            />
            {errors.branchId && (
              <p className="text-sm text-destructive mt-1">{errors.branchId.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="rounded border-border"
            />
            <Label htmlFor="active" className="text-sm text-muted-foreground cursor-pointer">
              Funcionário ativo
            </Label>
          </div>

          <div className="border-t pt-4 mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasSystemAccess"
                {...register('hasSystemAccess')}
                className="rounded border-border"
              />
              <Label
                htmlFor="hasSystemAccess"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Este funcionário terá acesso ao sistema
              </Label>
            </div>

            {watch('hasSystemAccess') && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Para funcionários com acesso ao sistema, o cargo é obrigatório e define as
                  permissões.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="systemEmail"
                      className="text-sm text-muted-foreground mb-2"
                    >
                      Email de acesso *
                    </Label>
                    <Input
                      id="systemEmail"
                      type="email"
                      placeholder="Se vazio, será usado o email do funcionário"
                      {...register('systemEmail')}
                      className={errors.systemEmail ? 'border-destructive' : 'rounded-xl'}
                    />
                    {errors.systemEmail && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.systemEmail.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="password"
                      className="text-sm text-muted-foreground mb-2"
                    >
                      Senha {linkedUser ? '(deixe em branco para manter)' : '*'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      {...register('password')}
                      className={errors.password ? 'border-destructive' : 'rounded-xl'}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="roleId" className="text-sm text-muted-foreground mb-2">
                    Cargo (permissão) *
                  </Label>
                  <SearchableSelect
                    id="roleId"
                    options={toSelectOptions(
                      roles.filter((role) => role.active),
                      (r) => r.id,
                      (r) => r.name,
                    )}
                    value={watch('roleId') || ''}
                    onChange={(value) => setValue('roleId', value, { shouldValidate: true })}
                    placeholder={isLoadingRoles ? 'Carregando...' : 'Selecione um cargo'}
                    disabled={isLoadingRoles}
                    error={!!errors.roleId}
                  />
                  {errors.roleId && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.roleId.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
