'use client';

import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { maintenanceLabelApi } from '@/lib/api/maintenance-label';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';

export default function MaintenanceLabelViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isPrintMode = searchParams.get('print') === 'true';

  const { data: label, isLoading } = useQuery({
    queryKey: ['maintenanceLabels', id],
    queryFn: () => maintenanceLabelApi.getById(id),
  });

  const hasAutoPrinted = useRef(false);
  useEffect(() => {
    if (isPrintMode && label && !hasAutoPrinted.current) {
      hasAutoPrinted.current = true;
      window.print();
    }
  }, [isPrintMode, label]);

  const handlePrint = () => {
    window.print();
  };

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

  if (!label) {
    return (
      <div className="space-y-6">
        <PageHeader title="Etiqueta não encontrada" />
      </div>
    );
  }

  const printStyles = isPrintMode
    ? {
        container: 'print:max-w-full print:p-0',
        hideOnPrint: 'print:hidden',
        showOnPrint: 'hidden print:block',
      }
    : {
        container: '',
        hideOnPrint: '',
        showOnPrint: '',
      };

  return (
    <>
      <div className={`space-y-6 ${printStyles.container}`}>
        <div className="no-print">
          <PageHeader
            title="Etiqueta de Manutenção"
            subtitle={`Veículo: ${label.vehiclePlate}`}
            actions={
              <>
                <Button variant="outline" asChild>
                  <Link href="/maintenance-labels">Voltar</Link>
                </Button>
                <Button onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </>
            }
          />
        </div>

        {/* Bloco da etiqueta: único conteúdo exibido na impressão */}
        <div
          className={`maintenance-label-print-area rounded-lg border border-border shadow-sm ${isPrintMode ? 'p-8' : 'p-4'} bg-white text-black`}
        >
        {/* Cabeçalho da Etiqueta */}
        <div className="border-2 border-black mb-4 p-4 bg-white text-black">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold mb-2 text-black">ÚLTIMA TROCA DE ÓLEO</h2>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold mb-2 text-black">PRÓXIMA TROCA</h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4 text-sm text-black">
            <div>
              <span className="font-semibold">PLACA:</span>{' '}
              <span>{label.vehiclePlate}</span>
            </div>
            <div>
              <span className="font-semibold">DATA:</span>{' '}
              <span>
                {formatDate(label.createdAt)}
              </span>
            </div>
            <div className="text-right">
              <span className="font-semibold">TIPO:</span> SEMISSINTÉTICO
            </div>
          </div>

          {/* Tabela de Produtos */}
          <table className="w-full border-collapse border border-black text-sm text-black">
            <thead>
              <tr className="bg-gray-100 text-black">
                <th className="border border-black p-2 text-left font-semibold text-black">
                  Produto / Intervalo
                </th>
                <th className="border border-black p-2 text-center font-semibold text-black">
                  TROCA (KM)
                </th>
                <th className="border border-black p-2 text-center font-semibold text-black">
                  PRÓXIMA TROCA (KM)
                </th>
              </tr>
            </thead>
            <tbody>
              {label.products.map((product, index) => (
                <tr
                  key={product.id}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-black`}
                >
                  <td className="border border-black p-2 text-black">
                    {product.productName}
                    {product.replaceEveryKm && (
                      <span className="text-xs ml-2 text-gray-700">
                        ({product.replaceEveryKm.toLocaleString('pt-BR')} KM)
                      </span>
                    )}
                  </td>
                  <td className="border border-black p-2 text-center text-black">
                    {product.lastChangeKm.toLocaleString('pt-BR')}
                  </td>
                  <td className="border border-black p-2 text-center font-semibold text-black">
                    {product.nextChangeKm.toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Estilos para impressão: só a etiqueta aparece */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          /* Esconde cabeçalho da página (Voltar, Imprimir) */
          .no-print {
            display: none !important;
          }
          /* Esconde tudo (layout, header, sidebar) */
          body * {
            visibility: hidden;
          }
          /* Mostra só o bloco da etiqueta e o que está dentro */
          body .maintenance-label-print-area,
          body .maintenance-label-print-area * {
            visibility: visible;
          }
          body .maintenance-label-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 1rem !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          body .maintenance-label-print-area .border-border {
            border-color: #000 !important;
          }
        }
      `}</style>
    </>
  );
}
