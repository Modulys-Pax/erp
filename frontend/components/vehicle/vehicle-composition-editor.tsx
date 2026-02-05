'use client';

import { useEffect, useState } from 'react';
import { VEHICLE_PLATE_TYPES, type VehiclePlateType, type VehiclePlateItem } from '@/lib/api/vehicle';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const PLATE_TYPE_LABELS: Record<VehiclePlateType, string> = {
  CAVALO: 'Cavalo',
  PRIMEIRA_CARRETA: 'Carreta 1',
  DOLLY: 'Dolly',
  SEGUNDA_CARRETA: 'Carreta 2',
};

export interface VehicleCompositionEditorProps {
  /** Composição atual (ex.: do veículo carregado) */
  value: VehiclePlateItem[];
  /** Callback quando a composição for alterada */
  onChange: (plates: VehiclePlateItem[]) => void;
  /** Desabilitar edição */
  disabled?: boolean;
  /** Texto de ajuda */
  helpText?: string;
}

/**
 * Editor da composição do veículo (Cavalo, Carreta 1, Dolly, Carreta 2).
 * Usado em manutenção, marcação e troca na estrada para definir/atualizar
 * quais placas formam o veículo naquela operação. Ao salvar, o veículo pode
 * ser atualizado com essa composição.
 */
export function VehicleCompositionEditor({
  value,
  onChange,
  disabled = false,
  helpText,
}: VehicleCompositionEditorProps) {
  const [localPlates, setLocalPlates] = useState<Record<VehiclePlateType, string>>({
    CAVALO: '',
    PRIMEIRA_CARRETA: '',
    DOLLY: '',
    SEGUNDA_CARRETA: '',
  });

  useEffect(() => {
    const next: Record<VehiclePlateType, string> = {
      CAVALO: '',
      PRIMEIRA_CARRETA: '',
      DOLLY: '',
      SEGUNDA_CARRETA: '',
    };
    (value || []).forEach((p) => {
      next[p.type] = p.plate;
    });
    setLocalPlates(next);
  }, [value]);

  const handleChange = (type: VehiclePlateType, plate: string) => {
    const next = { ...localPlates, [type]: plate.trim() };
    setLocalPlates(next);
    const plates: VehiclePlateItem[] = VEHICLE_PLATE_TYPES.filter((t) => next[t]).map((t) => ({
      type: t,
      plate: next[t],
    }));
    onChange(plates);
  };

  return (
    <div className="space-y-3">
      {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {VEHICLE_PLATE_TYPES.map((type) => (
          <div key={type} className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">{PLATE_TYPE_LABELS[type]}</Label>
            <Input
              value={localPlates[type]}
              onChange={(e) => handleChange(type, e.target.value)}
              placeholder={`Placa ${PLATE_TYPE_LABELS[type]}`}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
