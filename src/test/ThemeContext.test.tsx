import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

const TestConsumer = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('auto')}>Auto</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  it('defaults to "dark" theme', () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });

  it('restores theme from localStorage', () => {
    localStorage.setItem('aureum-theme', 'light');
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });

  it('setTheme updates theme and persists to localStorage', () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    act(() => screen.getByText('Light').click());
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(localStorage.getItem('aureum-theme')).toBe('light');
  });

  it('applies theme class to document root', () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => screen.getByText('Light').click());
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('auto theme resolves based on system preference', () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>);
    act(() => screen.getByText('Auto').click());
    expect(screen.getByTestId('theme').textContent).toBe('auto');
    // matchMedia mock returns matches: false → light
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });

  it('throws when useTheme is used outside provider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useTheme must be used within ThemeProvider');
    consoleErrorSpy.mockRestore();
  });
});
