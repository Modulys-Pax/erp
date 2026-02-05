'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchApi, CreateBranchDto } from '@/lib/api/branch';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const branchSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  active: z.boolean().default(true),
});

type BranchFormData = z.infer<typeof branchSchema>;

export default function NewBranchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      active: true,
    },
  });


  const createMutation = useMutation({
    mutationFn: (data: CreateBranchDto) => branchApi.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      await queryClient.refetchQueries({ queryKey: ['branches'] });
      toastSuccess('Filial cadastrada com sucesso');
      router.push('/branches');
    },
  });

  const onSubmit = (data: BranchFormData) => {
    const submitData: CreateBranchDto = {
      ...data,
      companyId: DEFAULT_COMPANY_ID,
      email: data.email || undefined,
    };
    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Filial"
        subtitle="Cadastre uma nova filial"
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
