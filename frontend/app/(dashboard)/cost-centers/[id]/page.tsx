'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costCenterApi, UpdateCostCenterDto } from '@/lib/api/cost-center';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function EditCostCenterPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: costCenter, isLoading } = useQuery({
    queryKey: ['cost-centers', id],
    queryFn: () => costCenterApi.getById(id),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!costCenter || isLoading) return;
    reset({
      code: costCenter.code,
      name: costCenter.name,
      active: costCenter.active,
    });
  }, [costCenter, isLoading, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCostCenterDto) => costCenterApi.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      toastSuccess('Centro de custo atualizado com sucesso');
      router.push('/cost-centers');
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate({
      ...data,
      companyId: DEFAULT_COMPANY_ID,
      branchId: costCenter!.branchId,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <SectionCard><div className="h-24 bg-muted animate-pulse rounded-xl" /></SectionCard>
      </div>
    );
  }
  if (!costCenter) {
    return (
      <div className="space-y-6">
        <PageHeader title="Centro de custo não encontrado" />
        <SectionCard><p className="text-sm text-muted-foreground text-center py-8">Centro de custo não encontrado.</p></SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Centro de Custo" subtitle="Atualize os dados do centro de custo" />
      <SectionCard title="Dados do Centro de Custo">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input id="code" {...register('code')} className={errors.code ? 'border-destructive' : 'rounded-xl'} />
              {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" {...register('name')} className={errors.name ? 'border-destructive' : 'rounded-xl'} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" {...register('active')} className="rounded border-border" />
            <Label htmlFor="active" className="cursor-pointer">Centro de custo ativo</Label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={updateMutation.isPending}>Salvar</Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
