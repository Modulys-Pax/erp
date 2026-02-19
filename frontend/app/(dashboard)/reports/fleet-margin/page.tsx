'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportPeriodFilter, getPeriodFromPreset } from '@/components/reports/report-period-filter';
import { formatCurrency } from '@/lib/utils/currency';
import { Can } from '@/components/auth/permission-gate';

type PeriodPreset = 'current_month' | 'last_30' | 'custom';

export default function FleetMarginReportPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [preset, setPreset] = useState<PeriodPreset>('current_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { startDate, endDate } = useMemo(
    () => getPeriodFromPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const { data: summary, isLoading } = useQuery({
    queryKey: ['report-fleet-margin', effectiveBranchId, startDate, endDate],
    queryFn: () =>
      reportsApi.getFleetMargin({
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

  return (
    <Can permission="reports.view" fallback={<p className="p-6 text-muted-foreground">Sem permissão para ver relatórios.</p>}>
      <div className="space-y-6">
        <PageHeader
          title="Margem da Frota"
          subtitle="Resumo agregado: receita, custos e margem média da frota"
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
          <div className="mt-6">
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : summary ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Receita total</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(summary.totalRevenue)}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Despesas viagem</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(summary.totalTripExpenses)}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Custo manutenção</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(summary.totalMaintenanceCosts)}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Custo total</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(summary.totalCost)}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Lucro</p>
                  <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(summary.profit)}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Margem média da frota</p>
                  <p className="text-xl font-bold text-foreground mt-1">{summary.fleetAverageMarginPercent.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">{summary.vehicleCount} veículo(s)</p>
                </div>
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
