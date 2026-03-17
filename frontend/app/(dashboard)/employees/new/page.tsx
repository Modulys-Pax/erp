'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi, CreateEmployeeDto } from '@/lib/api/employee';
import { userApi, CreateUserDto } from '@/lib/api/user';
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
import {
  INSALUBRITY_OPTIONS,
  RISK_ADDITION_LABELS,
  type InsalubrityDegree,
} from '@/lib/constants/risk-addition.constants';
import { useEffect } from 'react';

const employeeSchema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório'),
    cpf: z.string().min(1, 'CPF é obrigatório'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().min(1, 'Telefone é obrigatório'),
    position: z.string().min(1, 'Cargo é obrigatório'),
    department: z.string().min(1, 'Departamento é obrigatório'),
    hireDate: z.string().min(1, 'Data de admissão é obrigatória'),
    monthlySalary: z
      .coerce.number()
      .refine((n) => !Number.isNaN(n) && n >= 0, 'Salário mensal é obrigatório'),
    branchId: z.string().uuid('Selecione uma filial'),
    active: z.boolean().default(true),
    riskAdditionType: z.enum(['INSALUBRIDADE', 'PERICULOSIDADE']).optional().or(z.literal('')),
    insalubrityDegree: z.enum(['MINIMO', 'MEDIO', 'MAXIMO']).optional().or(z.literal('')),
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
          message: 'Permissão é obrigatória para acesso ao sistema',
          path: ['roleId'],
        });
      }
    }
    if (data.riskAdditionType === 'INSALUBRIDADE' && !data.insalubrityDegree) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione o grau de insalubridade',
        path: ['insalubrityDegree'],
      });
    }
  });

type EmployeeFormData = z.infer<typeof employeeSchema>;

export default function NewEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId, isAdmin } = useEffectiveBranch();
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors },
    setValue,
    setError,
    trigger,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      active: true,
      branchId: '',
      riskAdditionType: '',
      insalubrityDegree: '',
      hasSystemAccess: false,
    },
  });

  const { data: branchesResponse, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(false, 1, 1000),
    enabled: true,
  });

  const allBranches = branchesResponse?.data || [];
  const branches = isAdmin
    ? allBranches.filter((b) => b.active)
    : allBranches.filter((b) => b.active && b.id === effectiveBranchId);

  // Buscar roles do backend para uso quando funcionário tiver acesso ao sistema
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.getAll(),
  });

  // Quando "acesso ao sistema" estiver marcado, validar campos de acesso para exibir mensagens de erro
  const hasSystemAccessValue = watch('hasSystemAccess');
  useEffect(() => {
    if (hasSystemAccessValue) {
      trigger(['systemEmail', 'password', 'roleId']);
    }
  }, [hasSystemAccessValue, trigger]);

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      // Obter valor numérico do campo monthlySalary (já vem formatado pelo CurrencyInput)
      const monthlySalaryValue = data.monthlySalary;
      const monthlySalary =
        monthlySalaryValue !== undefined && !isNaN(monthlySalaryValue)
          ? monthlySalaryValue
          : undefined;

      const employeePayload: CreateEmployeeDto = {
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
        riskAdditionType: data.riskAdditionType || undefined,
        insalubrityDegree: data.riskAdditionType === 'INSALUBRIDADE' ? (data.insalubrityDegree as 'MINIMO' | 'MEDIO' | 'MAXIMO') : undefined,
      };

      // Criar funcionário
      const employee = await employeeApi.create(employeePayload);

      // Se não tiver acesso ao sistema, finaliza aqui
      if (!data.hasSystemAccess) {
        return { employee };
      }

      // Determinar email de acesso ao sistema
      const systemEmail = data.systemEmail || data.email;

      const userPayload: CreateUserDto = {
        name: data.name,
        email: systemEmail as string,
        password: data.password as string,
        companyId: DEFAULT_COMPANY_ID,
        branchId: data.branchId,
        roleId: data.roleId as string,
        active: true,
        employeeId: employee.id,
      };

      const user = await userApi.create(userPayload);

      return { employee, user };
    },
    onSuccess: async () => {
      // Invalidar queries relacionadas ao funcionário
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Invalidar queries de custos para atualizar os cálculos
      queryClient.invalidateQueries({ queryKey: ['employee-costs'] });
      await queryClient.refetchQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toastSuccess('Funcionário cadastrado com sucesso');
      router.push('/employees');
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    // Obter valor numérico do campo monthlySalary (já vem formatado pelo CurrencyInput)
    const monthlySalaryValue = watch('monthlySalary');
    const monthlySalary = monthlySalaryValue !== undefined && !isNaN(monthlySalaryValue) ? monthlySalaryValue : undefined;

    const submitData: EmployeeFormData = {
      ...data,
      monthlySalary,
    };
    createMutation.mutate(submitData);
  };

  const hasSystemAccess = watch('hasSystemAccess');
  const roleId = watch('roleId');
  const selectedRoleForCargo =
    hasSystemAccess && roleId ? roles.find((r) => r.id === roleId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Funcionário"
        subtitle="Cadastre um novo funcionário"
      />

      <SectionCard title="Dados do Funcionário">
        <form
          onSubmit={handleSubmit(onSubmit, (errs) => {
            Object.entries(errs).forEach(([field, err]) => {
              setError(field as keyof EmployeeFormData, {
                type: 'manual',
                message: (err?.message as string) ?? 'Erro de validação',
              });
            });
            const values = getValues();
            if (values.hasSystemAccess) {
              const emailToUse = (values.systemEmail || values.email || '').trim();
              if (!emailToUse) {
                setError('systemEmail', {
                  type: 'manual',
                  message: 'Email é obrigatório para acesso ao sistema',
                });
              }
              if (!values.password || values.password.length < 6) {
                setError('password', {
                  type: 'manual',
                  message: 'Senha é obrigatória e deve ter no mínimo 6 caracteres',
                });
              }
              if (!values.roleId || values.roleId === '') {
                setError('roleId', {
                  type: 'manual',
                  message: 'Permissão é obrigatória para acesso ao sistema',
                });
              }
            }
          })}
          className="space-y-4"
        >
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
                CPF *
              </Label>
              <Input
                id="cpf"
                {...register('cpf')}
                className={errors.cpf ? 'border-destructive rounded-xl' : 'rounded-xl'}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive mt-1">{errors.cpf.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="hireDate" className="text-sm text-muted-foreground mb-2">
                Data de Admissão *
              </Label>
              <Input
                id="hireDate"
                type="date"
                {...register('hireDate')}
                className={errors.hireDate ? 'border-destructive rounded-xl' : 'rounded-xl'}
              />
              {errors.hireDate && (
                <p className="text-sm text-destructive mt-1">{errors.hireDate.message}</p>
              )}
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
                Telefone *
              </Label>
              <Input
                id="phone"
                {...register('phone')}
                className={errors.phone ? 'border-destructive rounded-xl' : 'rounded-xl'}
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position" className="text-sm text-muted-foreground mb-2">
                Cargo *
              </Label>
              <Input
                id="position"
                {...register('position')}
                className={errors.position ? 'border-destructive rounded-xl' : 'rounded-xl'}
              />
              {errors.position && (
                <p className="text-sm text-destructive mt-1">{errors.position.message}</p>
              )}
              {selectedRoleForCargo && (
                <p className="text-xs text-muted-foreground mt-1">
                  Permissão: {selectedRoleForCargo.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="department" className="text-sm text-muted-foreground mb-2">
                Departamento *
              </Label>
              <Input
                id="department"
                {...register('department')}
                className={errors.department ? 'border-destructive rounded-xl' : 'rounded-xl'}
              />
              {errors.department && (
                <p className="text-sm text-destructive mt-1">{errors.department.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="monthlySalary" className="text-sm text-muted-foreground mb-2">
              Salário Mensal *
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

          <div className="border-t pt-4 mt-4 space-y-4">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Adicional de risco (insalubridade ou periculosidade)
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Por lei (CLT), não é permitido acumular os dois; escolha apenas um.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="riskAdditionType"
                  checked={(watch('riskAdditionType') || '') === ''}
                  onChange={() => {
                    setValue('riskAdditionType', '', { shouldValidate: true });
                    setValue('insalubrityDegree', '', { shouldValidate: true });
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">Nenhum</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="riskAdditionType"
                  checked={watch('riskAdditionType') === 'PERICULOSIDADE'}
                  onChange={() => {
                    setValue('riskAdditionType', 'PERICULOSIDADE', { shouldValidate: true });
                    setValue('insalubrityDegree', '', { shouldValidate: true });
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">{RISK_ADDITION_LABELS.PERICULOSIDADE}</span>
              </label>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="riskAdditionType"
                    checked={watch('riskAdditionType') === 'INSALUBRIDADE'}
                    onChange={() => setValue('riskAdditionType', 'INSALUBRIDADE', { shouldValidate: true })}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{RISK_ADDITION_LABELS.INSALUBRIDADE}</span>
                </label>
                {watch('riskAdditionType') === 'INSALUBRIDADE' && (
                  <div className="ml-6 mt-2 space-y-2">
                    {(Object.entries(INSALUBRITY_OPTIONS) as [InsalubrityDegree, typeof INSALUBRITY_OPTIONS[InsalubrityDegree]][]).map(([degree, opt]) => (
                      <label key={degree} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="insalubrityDegree"
                          checked={watch('insalubrityDegree') === degree}
                          onChange={() => setValue('insalubrityDegree', degree, { shouldValidate: true })}
                          className="rounded border-border"
                        />
                        <span className="text-sm">
                          {opt.label} — R$ {opt.valueMonthly.toFixed(2)}/mês
                        </span>
                        <span className="text-xs text-muted-foreground">({opt.example})</span>
                      </label>
                    ))}
                    {errors.insalubrityDegree && (
                      <p className="text-sm text-destructive mt-1">{errors.insalubrityDegree.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
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
              value={watch('branchId')}
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

            {hasSystemAccessValue && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Para funcionários com acesso ao sistema, a permissão é obrigatória e define as
                  permissões de acesso.
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
                      className={errors.systemEmail ? 'border-destructive rounded-xl' : 'rounded-xl'}
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
                      Senha *
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      {...register('password')}
                      className={errors.password ? 'border-destructive rounded-xl' : 'rounded-xl'}
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
                    Permissão *
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
