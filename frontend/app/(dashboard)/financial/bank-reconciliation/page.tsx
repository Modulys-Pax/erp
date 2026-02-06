'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankReconciliationApi, BankStatement } from '@/lib/api/bank-reconciliation';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { toastSuccess, toastErrorFromException } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function BankReconciliationListPage() {
  const queryClient = useQueryClient();
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const now = new Date();
  const [refMonth, setRefMonth] = useState(now.getMonth() + 1);
  const [refYear, setRefYear] = useState(now.getFullYear());

  const { data: statements, isLoading } = useQuery({
    queryKey: ['bank-statements', effectiveBranchId, refMonth, refYear],
    queryFn: () =>
      bankReconciliationApi.getStatements(
        effectiveBranchId ?? undefined,
        refMonth,
        refYear,
      ),
    enabled: !!effectiveBranchId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conciliação Bancária"
        subtitle="Extratos e conciliação com transações"
        actions={
          <Link href="/financial/bank-reconciliation/new">
            <Button>Novo Extrato</Button>
          </Link>
        }
      />
      <SectionCard title="Extratos">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">Referência:</span>
          <select
            value={refMonth}
            onChange={(e) => setRefMonth(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {MONTHS.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={refYear}
            onChange={(e) => setRefYear(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : !statements?.length ? (
          <EmptyState
            icon={RefreshCw}
            title="Nenhum extrato"
            description="Crie um extrato e adicione itens manualmente para conciliar com as transações do sistema."
            action={{ label: 'Novo Extrato', href: '/financial/bank-reconciliation/new' }}
          />
        ) : (
          <ul className="space-y-2">
            {statements.map((s: BankStatement) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">
                    {MONTHS[s.referenceMonth - 1]}/{s.referenceYear}
                    {s.description && ` - ${s.description}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {s.itemCount} itens · {s.reconciledCount} conciliados
                  </p>
                </div>
                <Link href={`/financial/bank-reconciliation/${s.id}`}>
                  <Button variant="outline" size="sm">Abrir</Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
