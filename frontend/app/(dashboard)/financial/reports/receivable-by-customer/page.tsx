'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountReceivableApi } from '@/lib/api/account-receivable';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { ACCOUNT_RECEIVABLE_STATUS_LABELS } from '@/lib/constants/status.constants';

type ExportRow = {
  Cliente: string;
  Descrição: string;
  Valor: number;
  Vencimento: string;
  Status: string;
};

export default function ReceivableByCustomerReportPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: [
      'report-receivable-by-customer',
      effectiveBranchId ?? undefined,
      startDate || undefined,
      endDate || undefined,
    ],
    queryFn: () =>
      accountReceivableApi.getReportByCustomer(
        effectiveBranchId ?? undefined,
        startDate || undefined,
        endDate || undefined,
      ),
  });

  const exportData = useMemo((): ExportRow[] => {
    if (!report?.groups) return [];
    return report.groups.flatMap((g) =>
      g.items.map((item) => ({
        Cliente: g.customerName,
        Descrição: item.description,
        Valor: item.amount,
        Vencimento: formatDate(item.dueDate),
        Status: ACCOUNT_RECEIVABLE_STATUS_LABELS[item.status as keyof typeof ACCOUNT_RECEIVABLE_STATUS_LABELS] ?? item.status,
      })),
    );
  }, [report]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Receber por Cliente"
        subtitle="Relatório agrupado por cliente (período e filial)"
        actions={
          exportData.length > 0 ? (
            <ExportButton<ExportRow>
              data={exportData}
              columns={[
                { key: 'Cliente', header: 'Cliente' },
                { key: 'Descrição', header: 'Descrição' },
                { key: 'Valor', header: 'Valor', getValue: (r) => formatCurrency(r.Valor) },
                { key: 'Vencimento', header: 'Vencimento' },
                { key: 'Status', header: 'Status' },
              ]}
              filename="contas-a-receber-por-cliente"
              title="Contas a Receber por Cliente"
            />
          ) : null
        }
      />
      <SectionCard title="Filtros">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Data inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Data final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : report?.groups?.length ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Total geral: <strong>{formatCurrency(report.totalAmount)}</strong>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Cliente</th>
                    <th className="text-right py-2 font-medium">Qtd</th>
                    <th className="text-right py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.groups.map((g) => (
                    <tr key={g.customerId ?? 'sem-cliente'} className="border-b">
                      <td className="py-2 font-medium">{g.customerName}</td>
                      <td className="text-right py-2">{g.count}</td>
                      <td className="text-right py-2">{formatCurrency(g.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 space-y-6">
              {report.groups.map((g) => (
                <div key={g.customerId ?? 'sem-cliente'}>
                  <h3 className="font-medium text-foreground mb-2">
                    {g.customerName} — {formatCurrency(g.total)} ({g.count} conta(s))
                  </h3>
                  <table className="w-full text-sm border rounded-md overflow-hidden">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-2 px-2 font-medium">Descrição</th>
                        <th className="text-right py-2 px-2 font-medium">Valor</th>
                        <th className="text-left py-2 px-2 font-medium">Vencimento</th>
                        <th className="text-left py-2 px-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="py-2 px-2">{item.description}</td>
                          <td className="text-right py-2 px-2">{formatCurrency(item.amount)}</td>
                          <td className="py-2 px-2">{formatDate(item.dueDate)}</td>
                          <td className="py-2 px-2">
                            {ACCOUNT_RECEIVABLE_STATUS_LABELS[item.status as keyof typeof ACCOUNT_RECEIVABLE_STATUS_LABELS] ?? item.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma conta a receber no período. Ajuste os filtros ou o período.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
