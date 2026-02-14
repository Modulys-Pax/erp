import { useState, useCallback, useEffect } from 'react';
import {
  isIntegerUnit,
  formatQuantityMaskDisplay,
  parseQuantityMaskInput,
  normalizeQuantityByUnit,
} from '@/lib/utils/quantity';

interface UseQuantityInputOptions {
  unitCode?: string | null;
  initialValue?: number | string;
  onChange?: (value: number | undefined) => void;
  onBlur?: (value: number | undefined) => void;
}

/**
 * Hook para input de quantidade com máscara conforme unidade de medida.
 * UN/PC/CX → só inteiros, máscara "1.000"; L/KG → decimais com vírgula, máscara "1.234,56".
 */
export function useQuantityInput(options: UseQuantityInputOptions = {}) {
  const { unitCode, initialValue, onChange, onBlur } = options;
  const integerUnit = isIntegerUnit(unitCode);

  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (initialValue === undefined || initialValue === null || initialValue === '') return '';
    const num = typeof initialValue === 'string' ? parseFloat(initialValue) : initialValue;
    if (Number.isNaN(num) || num < 0) return '';
    return formatQuantityMaskDisplay(num, unitCode);
  });

  const [numericValue, setNumericValue] = useState<number | undefined>(() => {
    if (initialValue === undefined || initialValue === null || initialValue === '') return undefined;
    const num = typeof initialValue === 'string' ? parseFloat(initialValue) : initialValue;
    if (Number.isNaN(num) || num < 0) return undefined;
    return integerUnit ? Math.round(num) : normalizeQuantityByUnit(num, unitCode);
  });

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
      const num = typeof initialValue === 'string' ? parseFloat(initialValue) : initialValue;
      if (!Number.isNaN(num) && num >= 0) {
        const normalized = integerUnit ? Math.round(num) : normalizeQuantityByUnit(num, unitCode);
        const formatted = formatQuantityMaskDisplay(normalized, unitCode);
        if (formatted !== displayValue) {
          setNumericValue(normalized);
          setDisplayValue(formatted);
        }
      }
    } else if ((initialValue === undefined || initialValue === null || initialValue === '') && displayValue !== '') {
      setDisplayValue('');
      setNumericValue(undefined);
    }
  }, [initialValue, unitCode]);

  // Reformatar exibição quando a unidade mudar (ex.: troca de produto)
  useEffect(() => {
    if (numericValue !== undefined && numericValue >= 0) {
      const normalized = integerUnit ? Math.round(numericValue) : normalizeQuantityByUnit(numericValue, unitCode);
      setDisplayValue(formatQuantityMaskDisplay(normalized, unitCode));
      if (normalized !== numericValue) {
        setNumericValue(normalized);
        onChange?.(normalized);
      }
    }
  }, [unitCode]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      if (!inputValue || inputValue.trim() === '') {
        setDisplayValue('');
        setNumericValue(undefined);
        onChange?.(undefined);
        return;
      }

      const num = parseQuantityMaskInput(inputValue, unitCode);
      if (num === undefined) {
        setDisplayValue('');
        setNumericValue(undefined);
        onChange?.(undefined);
        return;
      }

      const formatted = formatQuantityMaskDisplay(num, unitCode);
      setDisplayValue(formatted);
      setNumericValue(num);
      onChange?.(num);
    },
    [unitCode, onChange],
  );

  const handleBlur = useCallback(() => {
    if (numericValue !== undefined && numericValue >= 0) {
      setDisplayValue(formatQuantityMaskDisplay(numericValue, unitCode));
    }
    onBlur?.(numericValue);
  }, [numericValue, unitCode, onBlur]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End',
    ];
    if (e.ctrlKey || e.metaKey) {
      if (['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
    }
    if (e.key >= '0' && e.key <= '9') return;
    if (!allowedKeys.includes(e.key)) e.preventDefault();
  }, [integerUnit]);

  const setValue = useCallback(
    (value: number | undefined) => {
      if (value === undefined || value === null || Number.isNaN(value) || value < 0) {
        setDisplayValue('');
        setNumericValue(undefined);
      } else {
        const normalized = integerUnit ? Math.round(value) : normalizeQuantityByUnit(value, unitCode);
        setNumericValue(normalized);
        setDisplayValue(formatQuantityMaskDisplay(normalized, unitCode));
      }
    },
    [unitCode, integerUnit],
  );

  return {
    displayValue,
    numericValue,
    inputProps: {
      value: displayValue,
      onChange: handleChange,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      placeholder: integerUnit ? '0' : '0,00',
      inputMode: integerUnit ? ('numeric' as const) : ('decimal' as const),
    },
    setValue,
  };
}
