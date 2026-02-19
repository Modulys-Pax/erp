'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';
import { ReportPeriodFilter, getPeriodFromPreset } from '@/components/reports/report-period-filter';
import { formatCurrency } from '@/lib/utils/currency';
import { Can } from '@/components/auth/permission-gate';

type PeriodPreset = 'current_month' | 'last_30' | 'custom';

export default function RevenueByCustomerReportPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [preset, setPreset] = useState<PeriodPreset>('current_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { startDate, endDate } = useMemo(
    () => getPeriodFromPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const { data: rows, isLoading } = useQuery({
    queryKey: ['report-revenue-by-customer', effectiveBranchId, startDate, endDate],
    queryFn: () =>
      reportsApi.getRevenueByCustomer({
        branchId: effectiveBranchId ?? undefined,
        startDate,
        endDate,
      }),
  });

  useEffect(() => {
    if (preset === 'custom' && !customStart) {
      const t = new Date();
      setCustomEnd(t.toISOString().slice(0, 10));
      const s = new Date(t);
      s.setDate(s.getDate() - 29);
      setCustomStart(s.toISOString().slice(0, 10));
    }
  }, [preset, customStart]);

  const exportData = useMemo(
    () =>
      (rows || []).map((r) => ({
        Cliente: r.customerName,
        Receita: r.revenue,
        'Qtd viagens': r.tripCount,
      })),
    [rows],
  );

  return (
    <Can permission="reports.view" fallback={<p className="p-6 text-muted-foreground">Sem permissão para ver relatórios.</p>}>
      <div className="space-y-6">
        <PageHeader
          title="Receita por Cliente"
          subtitle="Receita e quantidade de viagens concluídas por cliente no período"
          actions={
            exportData.length > 0 ? (
              <ExportButton
                data={exportData}
                columns={[
                  { key: 'Cliente', header: 'Cliente' },
                  { key: 'Receita', header: 'Receita', getValue: (r) => formatCurrency(r.Receita) },
                  { key: 'Qtd viagens', header: 'Viagens' },
                ]}
                filename="receita-por-cliente"
                title="Receita por Cliente"
              />
            ) : null
          }
        />
        <SectionCard title="Filtros">
          <ReportPeriodFilter
            preset={preset}
            onPresetChange={setPreset}
            startDate={preset === 'custom' ? customStart : startDate}
            endDate={preset === 'custom' ? customEnd : endDate}
            onStartDateChange={setCustomStart}
            onEndDateChange={setCustomEnd}
          />
          <div className="mt-4">
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : rows && rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Cliente</th>
                      <th className="text-right py-2 font-medium">Receita</th>
                      <th className="text-right py-2 font-medium">Viagens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.customerId} className="border-b">
                        <td className="py-2 font-medium">{r.customerName}</td>
                        <td className="text-right py-2">{formatCurrency(r.revenue)}</td>
                        <td className="text-right py-2">{r.tripCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhum dado no período. Ajuste os filtros.
              </p>
            )}
          </div>
        </SectionCard>
      </div>
    </Can>
  );
}
