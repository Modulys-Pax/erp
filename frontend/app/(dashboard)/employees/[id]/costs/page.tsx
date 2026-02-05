'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '@/lib/api/employee';
import { formatCurrency } from '@/lib/utils/currency';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Package, Receipt } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeDetailCostsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: employee } = useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeeApi.getById(id),
  });

  const { data: costsData, isLoading } = useQuery({
    queryKey: ['employee-detail-costs', id],
    queryFn: () => employeeApi.getDetailCosts(id),
    enabled: !!id,
  });

  const getBenefitTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      TRANSPORT_VOUCHER: 'Vale Transporte',
      MEAL_VOUCHER: 'Vale Refeição',
      HEALTH_INSURANCE: 'Plano de Saúde',
      DENTAL_INSURANCE: 'Plano Odontológico',
      LIFE_INSURANCE: 'Seguro de Vida',
      OTHER: 'Outros',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
        <SectionCard>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!costsData || !employee) {
    return (
      <div className="space-y-6">
        <PageHeader title="Funcionário não encontrado" />
        <SectionCard>
          <p className="text-sm text-muted-foreground text-center py-8">
            O funcionário solicitado não foi encontrado.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => router.push('/employees')}>
              Voltar para Funcionários
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Gastos - ${costsData.employeeName}`}
        subtitle="Detalhamento completo de custos mensais e anuais"
      />

      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Salário Mensal"
          value={formatCurrency(costsData.monthlySalary ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Benefícios Mensais"
          value={formatCurrency(costsData.totalBenefits ?? 0)}
          icon={Package}
        />
        <StatCard
          title="Impostos Mensais"
          value={formatCurrency(costsData.totalTaxes ?? 0)}
          icon={Receipt}
        />
        <StatCard
          title="Custo Total Mensal"
          value={formatCurrency(costsData.totalMonthlyCost ?? 0)}
          icon={TrendingUp}
        />
      </div>

      {/* Custo Anual */}
      <SectionCard title="Custo Anual">
        <div className="text-3xl font-bold text-foreground">
          {formatCurrency(costsData.totalAnnualCost ?? 0)}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Baseado no custo mensal de {formatCurrency(costsData.totalMonthlyCost ?? 0)}
        </p>
      </SectionCard>

      {/* Breakdown Detalhado */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Benefícios */}
        <SectionCard title="Benefícios">
          {costsData.benefits.length > 0 ? (
            <DataTable
              data={costsData.benefits}
              columns={[
                {
                  key: 'name',
                  header: 'Benefício',
                  render: (benefit: any) => (
                    <div>
                      <span className="font-medium text-foreground">
                        {benefit.benefit?.name || benefit.name || 'N/A'}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {getBenefitTypeLabel(benefit.benefit?.type || benefit.type || '')}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'monthlyCost',
                  header: 'Custo Mensal',
                  render: (benefit: any) => (
                    <span className="text-foreground">
                      {formatCurrency(benefit.monthlyCost ?? 0)}
                    </span>
                  ),
                  className: 'text-right',
                },
              ]}
              isLoading={false}
              emptyMessage="Nenhum benefício cadastrado"
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum benefício cadastrado
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">Total de Benefícios:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(costsData.totalBenefits ?? 0)}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Impostos */}
        <SectionCard title="Impostos Trabalhistas">
          {costsData.taxes.length > 0 ? (
            <DataTable
              data={costsData.taxes}
              columns={[
                {
                  key: 'name',
                  header: 'Imposto',
                  render: (tax) => (
                    <div>
                      <span className="font-medium text-foreground">
                        {tax.name}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Alíquota: {(tax.rate ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Valor Mensal',
                  render: (tax) => (
                    <span className="text-foreground">
                      {formatCurrency(tax.amount ?? 0)}
                    </span>
                  ),
                  className: 'text-right',
                },
              ]}
              isLoading={false}
              emptyMessage="Nenhum imposto configurado"
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum imposto trabalhista configurado
            </p>
          )}
          {costsData.employeeINSS !== undefined && costsData.employeeINSSRate !== undefined && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-medium text-foreground">
                    INSS Descontado do Funcionário:
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {costsData.employeeINSSBracketRate != null && (
                      <>Alíquota da faixa usada no cálculo: {costsData.employeeINSSBracketRate === 7.5 ? '7,5' : costsData.employeeINSSBracketRate}%</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(costsData.employeeINSS ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">Total de Impostos (Patronais):</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(costsData.totalTaxes ?? 0)}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Resumo Final */}
      <SectionCard title="Resumo de Custos">
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Salário Base:</span>
            <span className="font-medium text-foreground">
              {formatCurrency(costsData.monthlySalary ?? 0)}
            </span>
          </div>
          {costsData.employeeINSS !== undefined && costsData.employeeINSSRate !== undefined && (
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">
                INSS Descontado do Funcionário (sobre salário bruto):
              </span>
              <div className="text-right">
                <span className="font-medium text-foreground">
                  {formatCurrency(costsData.employeeINSS ?? 0)}
                </span>
              </div>
            </div>
          )}
          {costsData.netSalary !== undefined && (
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Salário Líquido:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(costsData.netSalary ?? 0)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Benefícios:</span>
            <span className="font-medium text-foreground">
              {formatCurrency(costsData.totalBenefits ?? 0)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">Impostos (Patronais):</span>
            <span className="font-medium text-foreground">
              {formatCurrency(costsData.totalTaxes ?? 0)}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Ações */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => router.push('/employees')}>
          Voltar para Funcionários
        </Button>
        <Button variant="outline" onClick={() => router.push(`/employees/${id}`)}>
          Ver Dados do Funcionário
        </Button>
      </div>
    </div>
  );
}
