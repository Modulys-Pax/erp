'use client';

import React from 'react';
import { Input } from './input';
import { useQuantityInput } from '@/lib/hooks/use-quantity-input';
import { normalizeQuantityByUnit } from '@/lib/utils/quantity';
import { cn } from '@/lib/utils';

interface QuantityInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> {
  unitCode?: string | null;
  value?: number | string;
  onChange?: (value: number | undefined) => void;
  onBlur?: (value: number | undefined) => void;
  error?: boolean;
}

/**
 * Input de quantidade com máscara conforme unidade de medida.
 * UN/PC/CX → só inteiros (ex: 1.000); L/KG → decimais com vírgula (ex: 2,50).
 */
export const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(
  ({ value, onChange, onBlur, unitCode, error, className, ...props }, ref) => {
    const { displayValue, inputProps, setValue } = useQuantityInput({
      unitCode,
      initialValue: value,
      onChange,
      onBlur,
    });

    React.useEffect(() => {
      if (value !== undefined && value !== null && value !== '') {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (!Number.isNaN(num) && num >= 0) {
          setValue(normalizeQuantityByUnit(num, unitCode));
        } else {
          setValue(undefined);
        }
      } else {
        setValue(undefined);
      }
    }, [value, unitCode, setValue]);

    return (
      <Input
        ref={ref}
        type="text"
        autoComplete="off"
        {...props}
        {...inputProps}
        className={cn(error && 'border-destructive', className)}
      />
    );
  }
);

QuantityInput.displayName = 'QuantityInput';
