'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financialReportApi } from '@/lib/api/financial-report';
import { costCenterApi } from '@/lib/api/cost-center';
import { useEffectiveBranch } from '@/lib/hooks/use-effective-branch';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/ui/export-button';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type ExportRow = { Descrição: string; Valor: number; Categoria: string };

export default function ResultByPeriodPage() {
  const { branchId: effectiveBranchId } = useEffectiveBranch();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [costCenterId, setCostCenterId] = useState<string>('');

  const { data: costCentersResponse } = useQuery({
    queryKey: ['cost-centers', effectiveBranchId],
    queryFn: () => costCenterApi.getAll(effectiveBranchId ?? undefined, 1, 500),
    enabled: !!effectiveBranchId,
  });
  const costCenters = costCentersResponse?.data ?? [];

  const { data: result, isLoading } = useQuery({
    queryKey: ['result-by-period', effectiveBranchId, month, year, costCenterId || undefined],
    queryFn: () =>
      financialReportApi.getResultByPeriod(
        month,
        year,
        effectiveBranchId ?? undefined,
        costCenterId || undefined,
      ),
    enabled: !!effectiveBranchId,
  });

  const exportData = useMemo((): ExportRow[] => {
    if (!result) return [];
    const rows: ExportRow[] = [
      { Descrição: 'Receitas', Valor: result.totalIncome, Categoria: 'Resumo' },
      { Descrição: 'Despesas', Valor: result.totalExpense, Categoria: 'Resumo' },
      { Descrição: 'Resultado', Valor: result.result, Categoria: 'Resumo' },
    ];
    result.incomeByOrigin?.forEach((x) => {
      rows.push({ Descrição: x.label, Valor: x.amount, Categoria: 'Receita por origem' });
    });
    result.expenseByOrigin?.forEach((x) => {
      rows.push({ Descrição: x.label, Valor: x.amount, Categoria: 'Despesa por origem' });
    });
    result.byCostCenter?.forEach((x) => {
      rows.push({ Descrição: x.label, Valor: x.amount, Categoria: 'Por centro de custo' });
    });
    return rows;
  }, [result]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resultado por Período (DRE)"
        subtitle="Receitas e despesas realizadas no período"
        actions={
          exportData.length > 0 ? (
            <ExportButton<ExportRow>
              data={exportData}
              columns={[
                { key: 'Categoria', header: 'Categoria' },
                { key: 'Descrição', header: 'Descrição' },
                { key: 'Valor', header: 'Valor', getValue: (r) => formatCurrency(r.Valor) },
              ]}
              filename={`dre-${month}-${year}`}
              title={`Resultado por Período (DRE) - ${MONTHS[month - 1]}/${year}`}
            />
          ) : null
        }
      />
      <SectionCard title="Filtros">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <label className="text-sm text-muted-foreground mr-2">Mês</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {MONTHS.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mr-2">Ano</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {[year - 2, year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mr-2">Centro de custo</label>
            <select
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="">Todos</option>
              {costCenters.filter((c) => c.active).map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Resultado">
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Receitas</p>
                <p className="text-lg font-medium text-green-600">{formatCurrency(result.totalIncome)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Despesas</p>
                <p className="text-lg font-medium text-red-600">{formatCurrency(result.totalExpense)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Resultado</p>
                <p className={`text-lg font-medium ${result.result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(result.result)}
                </p>
              </div>
            </div>
            {(result.incomeByOrigin?.length || result.expenseByOrigin?.length) && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {result.incomeByOrigin && result.incomeByOrigin.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Receitas por origem</p>
                    <ul className="space-y-1 text-sm">
                      {result.incomeByOrigin.map((x) => (
                        <li key={x.key} className="flex justify-between">
                          <span>{x.label}</span>
                          <span>{formatCurrency(x.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.expenseByOrigin && result.expenseByOrigin.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Despesas por origem</p>
                    <ul className="space-y-1 text-sm">
                      {result.expenseByOrigin.map((x) => (
                        <li key={x.key} className="flex justify-between">
                          <span>{x.label}</span>
                          <span>{formatCurrency(x.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {result.byCostCenter && result.byCostCenter.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">Por centro de custo (resultado)</p>
                <ul className="space-y-1 text-sm">
                  {result.byCostCenter.map((x) => (
                    <li key={x.key} className="flex justify-between">
                      <span>{x.label}</span>
                      <span className={x.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(x.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Selecione período e filial.</p>
        )}
      </SectionCard>
    </div>
  );
}
