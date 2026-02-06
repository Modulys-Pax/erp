'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import { walletApi, CashFlowProjectionMonth } from '@/lib/api/wallet';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(m, 10) - 1]}/${y}`;
}

export default function CashFlowPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const [months, setMonths] = useState(6);

  const { data: projection, isLoading } = useQuery({
    queryKey: ['cash-flow-projection', effectiveBranchId, months],
    queryFn: () => walletApi.getCashFlowProjection(effectiveBranchId ?? undefined, months),
    enabled: !!effectiveBranchId,
  });

  const chartData = projection?.months?.map((row: CashFlowProjectionMonth) => ({
    ...row,
    monthLabel: formatYearMonth(row.yearMonth),
  })) ?? [];

  const exportData = projection?.months?.map((row: CashFlowProjectionMonth) => ({
    Mês: formatYearMonth(row.yearMonth),
    'Saldo inicial': row.initialBalance,
    'Receb. previstos': row.totalExpectedReceipts,
    'Pag. previstos': row.totalExpectedPayments,
    'Saldo projetado': row.projectedEndBalance,
  })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo de Caixa Projetado"
        subtitle="Projeção dos próximos meses com base em CR e CP pendentes"
        actions={
          exportData.length > 0 ? (
            <ExportButton
              data={exportData}
              columns={[
                { key: 'Mês', header: 'Mês' },
                { key: 'Saldo inicial', header: 'Saldo inicial', getValue: (r) => formatCurrency(r['Saldo inicial']) },
                { key: 'Receb. previstos', header: 'Receb. previstos', getValue: (r) => formatCurrency(r['Receb. previstos']) },
                { key: 'Pag. previstos', header: 'Pag. previstos', getValue: (r) => formatCurrency(r['Pag. previstos']) },
                { key: 'Saldo projetado', header: 'Saldo projetado', getValue: (r) => formatCurrency(r['Saldo projetado']) },
              ]}
              filename="fluxo-caixa-projetado"
              title="Fluxo de Caixa Projetado"
            />
          ) : null
        }
      />
      <SectionCard title="Projeção">
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm text-muted-foreground">Meses:</label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {[3, 6, 12, 24].map((n) => (
              <option key={n} value={n}>
                {n} meses
              </option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : projection?.months?.length ? (
          <>
            <div className="h-80 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.monthLabel}
                  />
                  <Legend />
                  <Bar dataKey="totalExpectedReceipts" name="Receb. previstos" fill="rgb(34, 197, 94)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalExpectedPayments" name="Pag. previstos" fill="rgb(239, 68, 68)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="projectedEndBalance" name="Saldo projetado" stroke="rgb(59, 130, 246)" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Mês</th>
                    <th className="text-right py-2 font-medium">Saldo inicial</th>
                    <th className="text-right py-2 font-medium">Receb. previstos</th>
                    <th className="text-right py-2 font-medium">Pag. previstos</th>
                    <th className="text-right py-2 font-medium">Saldo projetado</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.months.map((row: CashFlowProjectionMonth) => (
                    <tr key={row.yearMonth} className="border-b">
                      <td className="py-2">{formatYearMonth(row.yearMonth)}</td>
                      <td className="text-right py-2">{formatCurrency(row.initialBalance)}</td>
                      <td className="text-right py-2 text-green-600">{formatCurrency(row.totalExpectedReceipts)}</td>
                      <td className="text-right py-2 text-red-600">{formatCurrency(row.totalExpectedPayments)}</td>
                      <td className="text-right py-2 font-medium">{formatCurrency(row.projectedEndBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum dado de projeção. Verifique se há CR e CP pendentes.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
