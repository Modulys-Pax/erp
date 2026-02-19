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

export default function ByCostCenterReportPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [preset, setPreset] = useState<PeriodPreset>('current_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { startDate, endDate } = useMemo(
    () => getPeriodFromPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const { data: rows, isLoading } = useQuery({
    queryKey: ['report-by-cost-center', effectiveBranchId, startDate, endDate],
    queryFn: () =>
      reportsApi.getByCostCenter({
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
        Código: r.costCenterCode,
        'Centro de custo': r.costCenterName,
        Receita: r.revenue,
        Despesa: r.expense,
        Saldo: r.balance,
      })),
    [rows],
  );

  return (
    <Can permission="reports.view" fallback={<p className="p-6 text-muted-foreground">Sem permissão para ver relatórios.</p>}>
      <div className="space-y-6">
        <PageHeader
          title="Por Centro de Custo"
          subtitle="Receita (CR recebidas) e despesa (CP pagas) no período, agrupadas por centro de custo"
          actions={
            exportData.length > 0 ? (
              <ExportButton
                data={exportData}
                columns={[
                  { key: 'Código', header: 'Código' },
                  { key: 'Centro de custo', header: 'Centro de custo' },
                  { key: 'Receita', header: 'Receita', getValue: (r) => formatCurrency(r.Receita) },
                  { key: 'Despesa', header: 'Despesa', getValue: (r) => formatCurrency(r.Despesa) },
                  { key: 'Saldo', header: 'Saldo', getValue: (r) => formatCurrency(r.Saldo) },
                ]}
                filename="relatorio-por-centro-de-custo"
                title="Por Centro de Custo"
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
                      <th className="text-left py-2 font-medium">Código</th>
                      <th className="text-left py-2 font-medium">Centro de custo</th>
                      <th className="text-right py-2 font-medium">Receita</th>
                      <th className="text-right py-2 font-medium">Despesa</th>
                      <th className="text-right py-2 font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.costCenterId ?? 'sem-cc'} className="border-b">
                        <td className="py-2 font-medium">{r.costCenterCode}</td>
                        <td className="py-2">{r.costCenterName}</td>
                        <td className="text-right py-2">{formatCurrency(r.revenue)}</td>
                        <td className="text-right py-2">{formatCurrency(r.expense)}</td>
                        <td className="text-right py-2">{formatCurrency(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhum dado no período. Ajuste os filtros ou cadastre centros de custo e movimentações com centro de custo.
              </p>
            )}
          </div>
        </SectionCard>
      </div>
    </Can>
  );
}
