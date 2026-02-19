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

export default function OperationalCostReportPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [preset, setPreset] = useState<PeriodPreset>('current_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { startDate, endDate } = useMemo(
    () => getPeriodFromPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const { data: rows, isLoading } = useQuery({
    queryKey: ['report-operational-cost', effectiveBranchId, startDate, endDate],
    queryFn: () =>
      reportsApi.getOperationalCost({
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
        Placa: r.vehiclePlate ?? '-',
        'Despesas viagem': r.tripExpenses,
        'Custo manutenção': r.maintenanceCosts,
        'Custo total': r.totalCost,
      })),
    [rows],
  );

  return (
    <Can permission="reports.view" fallback={<p className="p-6 text-muted-foreground">Sem permissão para ver relatórios.</p>}>
      <div className="space-y-6">
        <PageHeader
          title="Custo Operacional"
          subtitle="Despesas de viagem e manutenção por veículo"
          actions={
            exportData.length > 0 ? (
              <ExportButton
                data={exportData}
                columns={[
                  { key: 'Placa', header: 'Placa' },
                  { key: 'Despesas viagem', header: 'Desp. viagem', getValue: (r) => formatCurrency(r['Despesas viagem']) },
                  { key: 'Custo manutenção', header: 'Manutenção', getValue: (r) => formatCurrency(r['Custo manutenção']) },
                  { key: 'Custo total', header: 'Custo total', getValue: (r) => formatCurrency(r['Custo total']) },
                ]}
                filename="custo-operacional"
                title="Custo Operacional"
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
                      <th className="text-left py-2 font-medium">Placa</th>
                      <th className="text-right py-2 font-medium">Desp. viagem</th>
                      <th className="text-right py-2 font-medium">Manutenção</th>
                      <th className="text-right py-2 font-medium">Custo total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.vehicleId} className="border-b">
                        <td className="py-2 font-medium">{r.vehiclePlate ?? '-'}</td>
                        <td className="text-right py-2">{formatCurrency(r.tripExpenses)}</td>
                        <td className="text-right py-2">{formatCurrency(r.maintenanceCosts)}</td>
                        <td className="text-right py-2">{formatCurrency(r.totalCost)}</td>
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
