import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../theme-provider';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.documentElement.classList.remove('light', 'dark');
  });

  it('deve renderizar children', () => {
    render(
      <ThemeProvider>
        <div>Child content</div>
      </ThemeProvider>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('deve usar tema padrão light (sistema usa light/dark, sem system)', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light');
  });

  it('deve usar tema do localStorage se existir', () => {
    localStorageMock.getItem.mockReturnValue('dark');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
  });

  it('deve usar defaultTheme quando especificado', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light');
  });

  it('deve atualizar tema e salvar no localStorage', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('ui-theme', 'dark');
    expect(result.current.theme).toBe('dark');
  });

  it('deve usar storageKey customizado', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider storageKey="my-theme">{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('light');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('my-theme', 'light');
  });

  it('deve aplicar classe ao document.documentElement', () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('deve migrar theme=system para light (opção system removida)', () => {
    localStorageMock.getItem.mockReturnValue('system');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Sistema migra 'system' para 'light'
    expect(result.current.theme).toBe('light');
  });
});

describe('useTheme', () => {
  it('deve retornar estado inicial quando usado fora do Provider', () => {
    // O hook retorna o initialState quando usado fora do provider
    // ao invés de lançar erro (context === undefined não é true porque
    // há um valor inicial definido)
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(typeof result.current.setTheme).toBe('function');
  });
});
