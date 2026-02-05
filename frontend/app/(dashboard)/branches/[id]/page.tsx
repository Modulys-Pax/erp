'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchApi, UpdateBranchDto } from '@/lib/api/branch';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const branchSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  active: z.boolean(),
});

type BranchFormData = z.infer<typeof branchSchema>;

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: branch, isLoading } = useQuery({
    queryKey: ['branches', id],
    queryFn: () => branchApi.getById(id),
  });


  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
  });

  useEffect(() => {
    if (!branch || isLoading) return;
    reset({
      name: branch.name,
      code: branch.code || '',
      email: branch.email || '',
      phone: branch.phone || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      zipCode: branch.zipCode || '',
      active: branch.active,
    });
  }, [branch, isLoading, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBranchDto) => branchApi.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      await queryClient.refetchQueries({ queryKey: ['branches'] });
      toastSuccess('Filial atualizada com sucesso');
      router.push('/branches');
    },
  });

  const onSubmit = (data: BranchFormData) => {
    const submitData: UpdateBranchDto = {
      ...data,
      companyId: DEFAULT_COMPANY_ID,
      email: data.email || undefined,
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

  if (!branch) {
    return (
      <div className="space-y-6">
        <PageHeader title="Filial não encontrada" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            A filial solicitada não foi encontrada.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Filial"
        subtitle="Atualize os dados da filial"
      />

      <SectionCard title="Dados da Filial">
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
              <Label htmlFor="code" className="text-sm text-muted-foreground mb-2">
                Código
              </Label>
              <Input id="code" {...register('code')} className="rounded-xl" />
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

          <div>
            <Label htmlFor="address" className="text-sm text-muted-foreground mb-2">
              Endereço
            </Label>
            <Input id="address" {...register('address')} className="rounded-xl" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city" className="text-sm text-muted-foreground mb-2">
                Cidade
              </Label>
              <Input id="city" {...register('city')} className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="state" className="text-sm text-muted-foreground mb-2">
                Estado (UF)
              </Label>
              <Input id="state" maxLength={2} {...register('state')} className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="zipCode" className="text-sm text-muted-foreground mb-2">
                CEP
              </Label>
              <Input id="zipCode" {...register('zipCode')} className="rounded-xl" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="rounded border-border"
            />
            <Label htmlFor="active" className="text-sm text-muted-foreground cursor-pointer">
              Filial ativa
            </Label>
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
