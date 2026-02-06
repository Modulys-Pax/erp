'use client';

import { Input } from '@/components/ui/input';
import { formatCnpjCpf, formatPhone } from '@/lib/utils/masks';
import { ComponentProps, useCallback, useEffect, useState } from 'react';

type MaskType = 'cnpj-cpf' | 'phone';

interface MaskedInputProps extends Omit<ComponentProps<typeof Input>, 'onChange' | 'value'> {
  mask: MaskType;
  value?: string;
  onChange?: (value: string) => void;
}

const formatters: Record<MaskType, (v: string) => string> = {
  'cnpj-cpf': formatCnpjCpf,
  phone: formatPhone,
};

export function MaskedInput({ mask, value = '', onChange, ...rest }: MaskedInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatters[mask](value));

  useEffect(() => {
    setDisplayValue(formatters[mask](value ?? ''));
  }, [mask, value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatters[mask](raw);
      setDisplayValue(formatted);
      onChange?.(formatted);
    },
    [mask, onChange]
  );

  return (
    <Input
      {...rest}
      value={displayValue}
      onChange={handleChange}
      inputMode={mask === 'phone' ? 'tel' : 'numeric'}
    />
  );
}
