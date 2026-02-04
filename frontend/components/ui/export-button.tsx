'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toastSuccess, toastError } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  getValue?: (item: T) => string | number;
}

interface ExportButtonProps<T> {
  data: T[];
  columns: Column<T>[];
  filename: string;
  title?: string;
}

export function ExportButton<T>({
  data,
  columns,
  filename,
  title,
}: ExportButtonProps<T>) {
  const [exporting, setExporting] = useState(false);

  const getValue = (item: T, col: Column<T>): string => {
    if (col.getValue) {
      const val = col.getValue(item);
      return val?.toString() || '';
    }
    const keys = col.key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = item;
    for (const k of keys) {
      value = value?.[k];
    }
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleDateString('pt-BR');
    return String(value);
  };

  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = columns.map((col) => col.header);
      const rows = data.map((item) => columns.map((col) => getValue(item, col)));

      const csvContent = [
        headers.join(';'),
        ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';')),
      ].join('\n');

      // Add BOM for Excel to recognize UTF-8
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toastSuccess('Arquivo exportado com sucesso');
    } catch {
      toastError('Erro ao exportar arquivo');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Dynamically import jspdf and jspdf-autotable
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF({ orientation: 'landscape' });

      if (title) {
        doc.setFontSize(16);
        doc.text(title, 14, 15);
      }

      const headers = columns.map((col) => col.header);
      const rows = data.map((item) => columns.map((col) => getValue(item, col)));

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: title ? 22 : 10,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Usar blob com MIME type explícito para garantir download como PDF (evita Notepad no Windows)
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toastSuccess('PDF exportado com sucesso');
    } catch {
      toastError('Erro ao exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar Excel (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
