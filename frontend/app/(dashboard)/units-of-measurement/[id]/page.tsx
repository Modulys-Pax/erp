'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitOfMeasurementApi, UpdateUnitOfMeasurementDto } from '@/lib/api/unit-of-measurement';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const unitOfMeasurementSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().or(z.literal('')),
  active: z.boolean(),
});

type UnitOfMeasurementFormData = z.infer<typeof unitOfMeasurementSchema>;

export default function EditUnitOfMeasurementPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: unit, isLoading } = useQuery({
    queryKey: ['units-of-measurement', id],
    queryFn: () => unitOfMeasurementApi.getById(id),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UnitOfMeasurementFormData>({
    resolver: zodResolver(unitOfMeasurementSchema),
  });

  useEffect(() => {
    if (!unit || isLoading) return;
    reset({
      code: unit.code,
      name: unit.name,
      description: unit.description || '',
      active: unit.active,
    });
  }, [unit, isLoading, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUnitOfMeasurementDto) => unitOfMeasurementApi.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measurement'] });
      await queryClient.refetchQueries({ queryKey: ['units-of-measurement'] });
      toastSuccess('Unidade de medida atualizada com sucesso');
      router.push('/units-of-measurement');
    },
  });

  const onSubmit = (data: UnitOfMeasurementFormData) => {
    const submitData: UpdateUnitOfMeasurementDto = {
      ...data,
      description: data.description || undefined,
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

  if (!unit) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unidade de medida não encontrada" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            A unidade de medida solicitada não foi encontrada.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Unidade de Medida"
        subtitle="Atualize os dados da unidade de medida"
      />

      <SectionCard title="Dados da Unidade de Medida">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code" className="text-sm text-muted-foreground mb-2">
                Código *
              </Label>
              <Input
                id="code"
                {...register('code')}
                className={errors.code ? 'border-destructive' : 'rounded-xl'}
                placeholder="Ex: UN, KG, L, M"
              />
              {errors.code && (
                <p className="text-sm text-destructive mt-1">{errors.code.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="name" className="text-sm text-muted-foreground mb-2">
                Nome *
              </Label>
              <Input
                id="name"
                {...register('name')}
                className={errors.name ? 'border-destructive' : 'rounded-xl'}
                placeholder="Ex: Unidade, Quilograma, Litro"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm text-muted-foreground mb-2">
              Descrição
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              className="rounded-xl"
              placeholder="Descreva a unidade de medida"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="rounded border-border"
            />
            <Label htmlFor="active" className="text-sm text-muted-foreground cursor-pointer">
              Unidade de medida ativa
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
