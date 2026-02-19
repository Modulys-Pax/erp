'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  /** Chamado ao selecionar uma opção */
  onChange?: (value: string) => void;
  /** Alias de onChange (ex.: react-hook-form Controller usa onValueChange) */
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  name?: string;
  id?: string;
}

export const SearchableSelect = React.forwardRef<
  HTMLButtonElement,
  SearchableSelectProps
>(
  (
    {
      options,
      value,
      onChange,
      onValueChange,
      placeholder = 'Selecione...',
      searchPlaceholder = 'Buscar...',
      emptyMessage = 'Nenhuma opção encontrada',
      disabled = false,
      className,
      error = false,
      name,
      id,
    },
    ref,
  ) => {
    const handleChange = (optionValue: string) => {
      onChange?.(optionValue);
      onValueChange?.(optionValue);
    };
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = React.useMemo(() => {
      if (!searchTerm.trim()) {
        return options;
      }
      const term = searchTerm.toLowerCase();
      return options.filter(
        (opt) =>
          !opt.disabled &&
          opt.label.toLowerCase().includes(term),
      );
    }, [options, searchTerm]);

    React.useEffect(() => {
      if (open && searchInputRef.current) {
        // Pequeno delay para garantir que o popover está renderizado
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      } else {
        setSearchTerm('');
      }
    }, [open]);

    const handleSelect = (optionValue: string) => {
      handleChange(optionValue);
      setOpen(false);
      setSearchTerm('');
    };

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={ref}
            type="button"
            id={id}
            name={name}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive',
              !error && 'border-border',
              className,
            )}
          >
            <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-180',
              )}
            />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className={cn(
              'z-50 w-[var(--radix-popover-trigger-width)] rounded-xl border border-border bg-background p-1 shadow-md',
            )}
          >
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    'flex h-9 w-full rounded-md border border-border bg-background py-1 pl-8 pr-3 text-sm',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setOpen(false);
                    }
                  }}
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className="p-1">
                  {filteredOptions.map((option) => {
                    const isSelected = value === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                          'relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm',
                          'outline-none transition-colors',
                          'hover:bg-accent hover:text-accent-foreground',
                          'focus:bg-accent focus:text-accent-foreground',
                          'disabled:pointer-events-none disabled:opacity-50',
                          isSelected && 'bg-accent text-accent-foreground',
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate">{option.label}</span>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  },
);

SearchableSelect.displayName = 'SearchableSelect';
