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
  document: z.string().min(1, 'CPF/CNPJ é obrigatório'),
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  address: z.string().min(1, 'Endereço é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  zipCode: z.string().min(1, 'CEP é obrigatório'),
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
      name: data.name,
      document: data.document,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      companyId: DEFAULT_COMPANY_ID,
      active: data.active,
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
            <Label htmlFor="name" className="text-sm text-muted-foreground mb-2">Nome *</Label>
            <Input id="name" {...register('name')} className={errors.name ? 'border-destructive rounded-xl' : 'rounded-xl'} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="document" className="text-sm text-muted-foreground mb-2">CPF/CNPJ *</Label>
              <Controller
                name="document"
                control={control}
                render={({ field }) => (
                  <MaskedInput
                    id="document"
                    mask="cnpj-cpf"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className={errors.document ? 'border-destructive rounded-xl' : 'rounded-xl'}
                  />
                )}
              />
              {errors.document && <p className="text-sm text-destructive mt-1">{errors.document.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-sm text-muted-foreground mb-2">Email *</Label>
              <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-destructive rounded-xl' : 'rounded-xl'} />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm text-muted-foreground mb-2">Telefone *</Label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <MaskedInput
                    id="phone"
                    mask="phone"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className={errors.phone ? 'border-destructive rounded-xl' : 'rounded-xl'}
                  />
                )}
              />
              {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="address" className="text-sm text-muted-foreground mb-2">Endereço *</Label>
            <Input id="address" {...register('address')} className={errors.address ? 'border-destructive rounded-xl' : 'rounded-xl'} />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city" className="text-sm text-muted-foreground mb-2">Cidade *</Label>
              <Input id="city" {...register('city')} className={errors.city ? 'border-destructive rounded-xl' : 'rounded-xl'} />
              {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <Label htmlFor="state" className="text-sm text-muted-foreground mb-2">Estado (UF) *</Label>
              <Input id="state" maxLength={2} {...register('state')} className={errors.state ? 'border-destructive rounded-xl' : 'rounded-xl'} />
              {errors.state && <p className="text-sm text-destructive mt-1">{errors.state.message}</p>}
            </div>
            <div>
              <Label htmlFor="zipCode" className="text-sm text-muted-foreground mb-2">CEP *</Label>
              <Input id="zipCode" {...register('zipCode')} className={errors.zipCode ? 'border-destructive rounded-xl' : 'rounded-xl'} />
              {errors.zipCode && <p className="text-sm text-destructive mt-1">{errors.zipCode.message}</p>}
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
