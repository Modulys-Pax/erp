'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costCenterApi, CostCenter } from '@/lib/api/cost-center';
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
import { MoreHorizontal, Edit, Trash2, LayoutGrid } from 'lucide-react';

export default function CostCentersPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: response, isLoading } = useQuery({
    queryKey: ['cost-centers', effectiveBranchId, page, limit],
    queryFn: () => costCenterApi.getAll(effectiveBranchId ?? undefined, page, limit),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => costCenterApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      toastSuccess('Centro de custo excluído com sucesso');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao excluir centro de custo'),
  });

  const handleDelete = (id: string) => {
    if (confirm('Excluir este centro de custo?')) deleteMutation.mutate(id);
  };

  const columns = [
    {
      key: 'code',
      header: 'Código',
      render: (row: CostCenter) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          <span className="font-medium">{row.code}</span>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Nome',
      render: (row: CostCenter) => <span className="text-foreground">{row.name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: CostCenter) => (
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
      render: (row: CostCenter) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/cost-centers/${row.id}`} className="flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
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
        title="Centros de Custo"
        subtitle="Cadastro de centros de custo para relatórios gerenciais"
        actions={
          <Link href="/cost-centers/new">
            <Button>Novo Centro de Custo</Button>
          </Link>
        }
      />
      <SectionCard title="Centros de Custo" description={response?.total ? `${response.total} centro(s)` : undefined}>
        {!isLoading && response?.data.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="Nenhum centro de custo cadastrado"
            description="Cadastre centros de custo para usar em transações, contas a pagar/receber e despesas."
            action={{ label: 'Novo Centro de Custo', href: '/cost-centers/new' }}
          />
        ) : (
          <DataTable
            data={response?.data || []}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhum centro de custo cadastrado"
            pagination={pagination}
            onPageChange={setPage}
            rowClassName={(row: CostCenter) => (!row.active ? 'opacity-60 bg-muted/30' : undefined)}
          />
        )}
      </SectionCard>
    </div>
  );
}
