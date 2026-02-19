'use client';

type PeriodPreset = 'current_month' | 'last_30' | 'custom';

export function getPeriodFromPreset(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string,
): { startDate: string; endDate: string } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (preset === 'current_month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  if (preset === 'last_30') {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: today.toISOString().slice(0, 10),
    };
  }

  return {
    startDate: customStart || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10),
    endDate: customEnd || today.toISOString().slice(0, 10),
  };
}

export interface ReportPeriodFilterProps {
  preset: PeriodPreset;
  onPresetChange: (preset: PeriodPreset) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export function ReportPeriodFilter({
  preset,
  onPresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: ReportPeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        <div className="flex rounded-lg border border-input bg-background p-0.5">
          <button
            type="button"
            onClick={() => onPresetChange('current_month')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === 'current_month'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mês atual
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('last_30')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === 'last_30'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('custom')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === 'custom'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Intervalo livre
          </button>
        </div>
      </div>
      {preset === 'custom' && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Data inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Data final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}
