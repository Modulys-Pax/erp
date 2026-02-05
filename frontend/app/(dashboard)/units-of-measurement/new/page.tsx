'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unitOfMeasurementApi, CreateUnitOfMeasurementDto } from '@/lib/api/unit-of-measurement';
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
  active: z.boolean().default(true),
});

type UnitOfMeasurementFormData = z.infer<typeof unitOfMeasurementSchema>;

export default function NewUnitOfMeasurementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UnitOfMeasurementFormData>({
    resolver: zodResolver(unitOfMeasurementSchema),
    defaultValues: {
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUnitOfMeasurementDto) => unitOfMeasurementApi.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['units-of-measurement'] });
      await queryClient.refetchQueries({ queryKey: ['units-of-measurement'] });
      toastSuccess('Unidade de medida cadastrada com sucesso');
      router.push('/units-of-measurement');
    },
  });

  const onSubmit = (data: UnitOfMeasurementFormData) => {
    const submitData: CreateUnitOfMeasurementDto = {
      ...data,
      description: data.description || undefined,
    };
    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Unidade de Medida"
        subtitle="Cadastre uma nova unidade de medida"
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
              <p className="text-xs text-muted-foreground mt-1">
                Código único da unidade de medida (ex: UN, KG, L, M, M2, M3)
              </p>
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
