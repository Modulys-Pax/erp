'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi, UpdateCustomerDto } from '@/lib/api/customer';
import { DEFAULT_COMPANY_ID } from '@/lib/constants/company.constants';
import { PageHeader } from '@/components/layout/page-header';
import { toastSuccess } from '@/lib/utils';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaskedInput } from '@/components/ui/masked-input';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  document: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => customerApi.getById(id),
  });

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!customer || isLoading) return;
    reset({
      name: customer.name,
      document: customer.document || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zipCode: customer.zipCode || '',
      active: customer.active,
    });
  }, [customer, isLoading, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCustomerDto) => customerApi.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toastSuccess('Cliente atualizado com sucesso');
      router.push('/customers');
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate({
      ...data,
      companyId: DEFAULT_COMPANY_ID,
      branchId: customer!.branchId,
      email: data.email || undefined,
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
  if (!customer) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cliente não encontrado" />
        <SectionCard><p className="text-sm text-muted-foreground text-center py-8">Cliente não encontrado.</p></SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Cliente" subtitle="Atualize os dados do cliente" />
      <SectionCard title="Dados do Cliente">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...register('name')} className={errors.name ? 'border-destructive' : 'rounded-xl'} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document">CNPJ/CPF</Label>
              <Controller
                name="document"
                control={control}
                render={({ field }) => (
                  <MaskedInput
                    id="document"
                    mask="cnpj-cpf"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="rounded-xl"
                  />
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-destructive' : 'rounded-xl'} />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <MaskedInput
                    id="phone"
                    mask="phone"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="rounded-xl"
                  />
                )}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" {...register('address')} className="rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" {...register('city')} className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="state">Estado (UF)</Label>
              <Input id="state" maxLength={2} {...register('state')} className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="zipCode">CEP</Label>
              <Input id="zipCode" {...register('zipCode')} className="rounded-xl" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" {...register('active')} className="rounded border-border" />
            <Label htmlFor="active" className="cursor-pointer">Cliente ativo</Label>
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
