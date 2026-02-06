'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { costCenterApi, CreateCostCenterDto } from '@/lib/api/cost-center';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  active: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function NewCostCenterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { active: true },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCostCenterDto) => costCenterApi.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      toastSuccess('Centro de custo cadastrado com sucesso');
      router.push('/cost-centers');
    },
  });

  const onSubmit = (data: FormData) => {
    if (!effectiveBranchId) return;
    createMutation.mutate({
      ...data,
      companyId: DEFAULT_COMPANY_ID,
      branchId: effectiveBranchId,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Novo Centro de Custo" subtitle="Cadastre um centro de custo" />
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
            <Button type="submit" disabled={createMutation.isPending || !effectiveBranchId}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
