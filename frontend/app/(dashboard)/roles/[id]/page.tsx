'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleApi, UpdateRoleDto, PermissionModule } from '@/lib/api/role';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toastSuccess, toastErrorFromException, toastError, cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

const roleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().or(z.literal('')),
  active: z.boolean(),
});

type RoleFormData = z.infer<typeof roleSchema>;

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const { data: role, isLoading: loadingRole } = useQuery({
    queryKey: ['roles', id],
    queryFn: () => roleApi.getById(id),
  });

  const { data: permissionModules = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleApi.getAllPermissions(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
  });

  // Carregar dados do cargo no form e permissões
  useEffect(() => {
    if (!role || loadingRole) return;

    reset({
      name: role.name,
      description: role.description || '',
      active: role.active,
    });

    // Carregar permissões do cargo
    if (role.permissions && !permissionsLoaded) {
      const permNames = role.permissions.map((p) => p.name);
      setSelectedPermissions(new Set(permNames));
      setPermissionsLoaded(true);
    }
  }, [role, loadingRole, reset, permissionsLoaded]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateRoleDto) => roleApi.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      toastSuccess('Cargo atualizado com sucesso');
      router.push('/roles');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao atualizar cargo');
    },
  });

  const onSubmit = (data: RoleFormData) => {
    if (!isAdmin && selectedPermissions.size === 0) {
      toastError('Selecione ao menos uma permissão para o cargo');
      return;
    }

    const submitData: UpdateRoleDto = {
      ...data,
      description: data.description || undefined,
      permissions: Array.from(selectedPermissions),
    };
    updateMutation.mutate(submitData);
  };

  // Toggle de módulo (abrir/fechar)
  const toggleModule = (module: string) => {
    setOpenModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  // Toggle de permissão individual
  const togglePermission = (permissionName: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionName)) {
        newSet.delete(permissionName);
      } else {
        newSet.add(permissionName);
      }
      return newSet;
    });
  };

  // Selecionar/desselecionar todas as permissões de um módulo
  const toggleAllModulePermissions = (modulePermissions: PermissionModule) => {
    const allPermissionNames = modulePermissions.permissions.map((p) => p.name);
    const allSelected = allPermissionNames.every((name) => selectedPermissions.has(name));

    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        allPermissionNames.forEach((name) => newSet.delete(name));
      } else {
        allPermissionNames.forEach((name) => newSet.add(name));
      }
      return newSet;
    });
  };

  // Verificar se todas as permissões de um módulo estão selecionadas
  const isModuleFullySelected = (modulePermissions: PermissionModule): boolean => {
    return modulePermissions.permissions.every((p) => selectedPermissions.has(p.name));
  };

  // Verificar se alguma permissão de um módulo está selecionada
  const isModulePartiallySelected = (modulePermissions: PermissionModule): boolean => {
    const hasAny = modulePermissions.permissions.some((p) => selectedPermissions.has(p.name));
    const hasAll = isModuleFullySelected(modulePermissions);
    return hasAny && !hasAll;
  };

  // Contar permissões selecionadas por módulo
  const getModuleSelectedCount = (modulePermissions: PermissionModule): number => {
    return modulePermissions.permissions.filter((p) => selectedPermissions.has(p.name)).length;
  };

  const isLoading = loadingRole || loadingPermissions;
  const isAdmin = role?.name === 'ADMIN' || role?.name === 'admin';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <SectionCard>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cargo não encontrado" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            O cargo solicitado não foi encontrado.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar Cargo: ${role.name}`}
        subtitle="Atualize os dados e permissões do cargo"
      />

      {isAdmin && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Cargo Administrador
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Este é o cargo de administrador do sistema. Ele possui acesso total automaticamente,
              independente das permissões selecionadas abaixo.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <SectionCard title="Dados do Cargo">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm text-muted-foreground mb-2 block">
                Nome *
              </Label>
              <Input
                id="name"
                {...register('name')}
                className={cn(errors.name ? 'border-destructive' : '', 'rounded-xl')}
                placeholder="Ex: Gerente, Operador, Financeiro"
                disabled={isAdmin}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
              {isAdmin && (
                <p className="text-xs text-muted-foreground mt-1">
                  O nome do cargo ADMIN não pode ser alterado.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="text-sm text-muted-foreground mb-2 block">
                Descrição
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                className="rounded-xl"
                placeholder="Descreva as responsabilidades deste cargo"
                rows={3}
              />
            </div>

            <label htmlFor="active" className="inline-flex items-center gap-2 cursor-pointer">
              <Switch
                id="active"
                checked={watch('active')}
                onCheckedChange={(checked) => setValue('active', checked)}
                disabled={isAdmin}
              />
              <span className="text-sm font-medium leading-none">Cargo ativo</span>
            </label>
          </div>
        </SectionCard>

        <SectionCard
          title="Permissões"
          description={
            isAdmin
              ? 'Admin tem acesso total (bypass automático)'
              : `${selectedPermissions.size} permissão(ões) selecionada(s)`
          }
        >
          <div className="space-y-2">
            {permissionModules.map((mod) => {
              const isOpen = openModules.has(mod.module);
              const isFullySelected = isModuleFullySelected(mod);
              const selectedCount = getModuleSelectedCount(mod);

              return (
                <Collapsible
                  key={mod.module}
                  open={isOpen}
                  onOpenChange={() => toggleModule(mod.module)}
                >
                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                      <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{mod.moduleName}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({mod.permissions.length} permissões)
                          </span>
                        </div>
                      </CollapsibleTrigger>

                      <div className="flex items-center gap-3">
                        {(selectedCount > 0 || isAdmin) && (
                          <Badge
                            variant="outline"
                            className={cn(
                              isAdmin || isFullySelected
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            )}
                          >
                            {isAdmin ? 'Acesso total' : `${selectedCount}/${mod.permissions.length}`}
                          </Badge>
                        )}
                        {!isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllModulePermissions(mod);
                            }}
                            className="text-xs"
                          >
                            {isFullySelected ? 'Desmarcar todas' : 'Marcar todas'}
                          </Button>
                        )}
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="px-4 py-3 border-t space-y-2 bg-background">
                        {mod.permissions.map((permission) => {
                          const isSelected = isAdmin || selectedPermissions.has(permission.name);

                          return (
                            <label
                              key={permission.name}
                              className={cn(
                                'flex items-start gap-3 p-3 rounded-lg transition-colors',
                                isAdmin
                                  ? 'bg-green-50/50 dark:bg-green-950/20'
                                  : isSelected
                                    ? 'bg-primary/5 border border-primary/20 cursor-pointer'
                                    : 'hover:bg-muted/50 cursor-pointer'
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => !isAdmin && togglePermission(permission.name)}
                                className="mt-0.5"
                                disabled={isAdmin}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-foreground">
                                    {permission.description}
                                  </span>
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-primary" />
                                  )}
                                </div>
                                <code className="text-xs text-muted-foreground font-mono">
                                  {permission.name}
                                </code>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </SectionCard>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              updateMutation.isPending ||
              (!isAdmin && selectedPermissions.size === 0)
            }
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
