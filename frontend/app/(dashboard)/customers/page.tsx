'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi, Customer } from '@/lib/api/customer';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { DataTable, PaginationMeta } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, UserCircle, Mail, Phone } from 'lucide-react';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: response, isLoading } = useQuery({
    queryKey: ['customers', effectiveBranchId, showDeleted, page, limit],
    queryFn: () => customerApi.getAll(effectiveBranchId ?? undefined, showDeleted, page, limit),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toastSuccess('Cliente excluído com sucesso');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao excluir cliente'),
  });

  const handleDelete = (id: string) => {
    if (confirm('Excluir este cliente?')) deleteMutation.mutate(id);
  };

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      render: (row: Customer) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            {row.document && <p className="text-xs text-muted-foreground">Doc: {row.document}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contato',
      render: (row: Customer) => (
        <div className="space-y-1 text-sm">
          {row.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-muted-foreground" />
              {row.email}
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              {row.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Customer) => (
        <Badge
          className={
            row.active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }
        >
          {row.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (row: Customer) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/customers/${row.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              {!row.deletedAt && (
                <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const pagination: PaginationMeta | undefined = response
    ? { page: response.page, limit: response.limit, total: response.total, totalPages: response.totalPages }
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Cadastro de clientes"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowDeleted(!showDeleted); setPage(1); }}>
              {showDeleted ? 'Ocultar Excluídos' : 'Mostrar Excluídos'}
            </Button>
            <Link href="/customers/new">
              <Button>Novo Cliente</Button>
            </Link>
          </div>
        }
      />
      <SectionCard title="Clientes" description={response?.total ? `${response.total} cliente(s)` : undefined}>
        {!isLoading && response?.data.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="Nenhum cliente cadastrado"
            description="Cadastre clientes para vincular em contas a receber e pedidos de venda."
            action={{ label: 'Novo Cliente', href: '/customers/new' }}
          />
        ) : (
          <DataTable
            data={response?.data || []}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhum cliente cadastrado"
            pagination={pagination}
            onPageChange={setPage}
            rowClassName={(row: Customer) => (!row.active ? 'opacity-60 bg-muted/30' : undefined)}
          />
        )}
      </SectionCard>
    </div>
  );
}
