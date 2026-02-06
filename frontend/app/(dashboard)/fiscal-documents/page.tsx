'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fiscalDocumentApi,
  FiscalDocument,
  FiscalDocumentType,
  FiscalDocumentStatus,
} from '@/lib/api/fiscal-document';
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
import { ExportButton } from '@/components/ui/export-button';
import { MoreHorizontal, Edit, Trash2, FileText, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function FiscalDocumentsPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<FiscalDocumentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<FiscalDocumentStatus | ''>('');
  const [showDeleted, setShowDeleted] = useState(false);
  const limit = 10;

  const { data: response, isLoading } = useQuery({
    queryKey: [
      'fiscal-documents',
      effectiveBranchId,
      page,
      limit,
      startDate || undefined,
      endDate || undefined,
      typeFilter || undefined,
      statusFilter || undefined,
      showDeleted,
    ],
    queryFn: () =>
      fiscalDocumentApi.getAll({
        branchId: effectiveBranchId ?? undefined,
        page,
        limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        includeDeleted: showDeleted,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fiscalDocumentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documents'] });
      toastSuccess('Documento fiscal excluído com sucesso');
    },
    onError: (error) => toastErrorFromException(error, 'Erro ao excluir documento fiscal'),
  });

  const handleDelete = (id: string) => {
    if (confirm('Excluir este documento fiscal?')) deleteMutation.mutate(id);
  };

  const columns = [
    {
      key: 'number',
      header: 'Número / Série',
      render: (row: FiscalDocument) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{row.number}</p>
            {row.series && (
              <p className="text-xs text-muted-foreground">Série: {row.series}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (row: FiscalDocument) => (
        <div className="flex items-center gap-2">
          {row.type === 'ENTRY' ? (
            <ArrowDownCircle className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowUpCircle className="h-4 w-4 text-blue-600" />
          )}
          <span>{row.type === 'ENTRY' ? 'Entrada' : 'Saída'}</span>
        </div>
      ),
    },
    {
      key: 'issueDate',
      header: 'Emissão',
      render: (row: FiscalDocument) => (
        <span className="text-foreground">
          {new Date(row.issueDate).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Valor',
      render: (row: FiscalDocument) => (
        <span className="font-medium">
          {Number(row.totalAmount).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: FiscalDocument) => (
        <Badge
          className={
            row.status === 'REGISTERED'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }
        >
          {row.status === 'REGISTERED' ? 'Registrado' : 'Cancelado'}
        </Badge>
      ),
    },
    {
      key: 'link',
      header: 'Vinculado a',
      render: (row: FiscalDocument) => (
        <div className="flex flex-col gap-1 text-sm">
          {row.accountPayableId && (
            <Link
              href={`/accounts-payable/${row.accountPayableId}`}
              className="text-primary hover:underline"
            >
              Conta a pagar
            </Link>
          )}
          {row.accountReceivableId && (
            <Link
              href={`/accounts-receivable/${row.accountReceivableId}`}
              className="text-primary hover:underline"
            >
              Conta a receber
            </Link>
          )}
          {row.financialTransactionId && !row.accountPayableId && !row.accountReceivableId && (
            <Link
              href={`/financial/wallet`}
              className="text-primary hover:underline"
            >
              Transação
            </Link>
          )}
          {!row.accountPayableId && !row.accountReceivableId && !row.financialTransactionId && (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (row: FiscalDocument) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/fiscal-documents/${row.id}`} className="flex items-center">
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
    ? {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      }
    : undefined;

  type FiscalExportRow = {
    Número: string;
    Série: string;
    Tipo: string;
    Emissão: string;
    Valor: number;
    Status: string;
    Vinculado: string;
  };
  const fiscalExportData: FiscalExportRow[] = (response?.data ?? []).map((row) => ({
    Número: row.number,
    Série: row.series ?? '',
    Tipo: row.type === 'ENTRY' ? 'Entrada' : 'Saída',
    Emissão: new Date(row.issueDate).toLocaleDateString('pt-BR'),
    Valor: Number(row.totalAmount),
    Status: row.status === 'REGISTERED' ? 'Registrado' : 'Cancelado',
    Vinculado: row.accountPayableId
      ? 'Conta a pagar'
      : row.accountReceivableId
        ? 'Conta a receber'
        : row.financialTransactionId
          ? 'Transação'
          : '—',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos Fiscais"
        subtitle="Rastreabilidade de notas de entrada e saída"
        actions={
          <div className="flex items-center gap-2">
            {fiscalExportData.length > 0 && (
              <ExportButton<FiscalExportRow>
                data={fiscalExportData}
                columns={[
                  { key: 'Número', header: 'Número' },
                  { key: 'Série', header: 'Série' },
                  { key: 'Tipo', header: 'Tipo' },
                  { key: 'Emissão', header: 'Emissão' },
                  { key: 'Valor', header: 'Valor', getValue: (r) => Number(r.Valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
                  { key: 'Status', header: 'Status' },
                  { key: 'Vinculado', header: 'Vinculado a' },
                ]}
                filename="documentos-fiscais"
                title="Documentos Fiscais"
              />
            )}
            <Link href="/fiscal-documents/new">
              <Button>Novo Documento Fiscal</Button>
            </Link>
          </div>
        }
      />
      <SectionCard
        title="Documentos"
        description={response?.total != null ? `${response.total} documento(s)` : undefined}
      >
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">De</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter((e.target.value as FiscalDocumentType) || '')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos os tipos</option>
            <option value="ENTRY">Entrada</option>
            <option value="EXIT">Saída</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as FiscalDocumentStatus) || '')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="REGISTERED">Registrado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded border-border"
            />
            Mostrar excluídos
          </label>
        </div>
        {!isLoading && response?.data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento fiscal"
            description="Cadastre documentos fiscais para rastrear notas de entrada e saída e vincular a CP/CR ou transações."
            action={{ label: 'Novo Documento Fiscal', href: '/fiscal-documents/new' }}
          />
        ) : (
          <DataTable
            data={response?.data || []}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nenhum documento fiscal"
            pagination={pagination}
            onPageChange={setPage}
          />
        )}
      </SectionCard>
    </div>
  );
}
