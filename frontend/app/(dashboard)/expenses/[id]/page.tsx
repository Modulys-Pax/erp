'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { expenseApi } from '@/lib/api/expense';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { EXPENSE_TYPE_LABELS, EXPENSE_TYPE_COLORS } from '@/lib/constants/status.constants';
import type { ExpenseTypeEnum } from '@/lib/constants/status.constants';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';

export default function ExpenseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: expense, isLoading } = useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expenseApi.getById(id),
  });

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

  if (!expense) {
    return (
      <div className="space-y-6">
        <PageHeader title="Despesa não encontrada" />
        <Button variant="outline" asChild>
          <Link href="/financial/expenses">Voltar para Despesas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalhe da Despesa"
        subtitle={expense.description}
        actions={
          <Button variant="outline" asChild>
            <Link href="/financial/expenses">Voltar para Despesas</Link>
          </Button>
        }
      />

      <SectionCard title="Dados da Despesa">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Tipo</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center rounded-full border border-border px-2 py-1 text-xs font-medium ${EXPENSE_TYPE_COLORS[expense.type as ExpenseTypeEnum]}`}
              >
                {EXPENSE_TYPE_LABELS[expense.type as ExpenseTypeEnum]}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Valor</dt>
            <dd className="mt-1 font-semibold text-foreground">{formatCurrency(expense.amount)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Data</dt>
            <dd className="mt-1 text-foreground">{formatDate(expense.expenseDate)}</dd>
          </div>
          {expense.employeeName && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Funcionário</dt>
              <dd className="mt-1 text-foreground">{expense.employeeName}</dd>
            </div>
          )}
          {expense.documentNumber && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Nº Documento</dt>
              <dd className="mt-1 text-foreground">{expense.documentNumber}</dd>
            </div>
          )}
        </dl>
        {expense.description && (
          <div className="mt-4 pt-4 border-t border-border">
            <dt className="text-sm font-medium text-muted-foreground">Descrição</dt>
            <dd className="mt-1 text-foreground">{expense.description}</dd>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
