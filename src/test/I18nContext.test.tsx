import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { I18nProvider, useI18n } from '@/contexts/I18nContext';

const TestConsumer = () => {
  const { locale, setLocale, t } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="sample-text">{t.dashboard.welcome}</span>
      <button onClick={() => setLocale('pt')}>PT</button>
      <button onClick={() => setLocale('es')}>ES</button>
      <button onClick={() => setLocale('en')}>EN</button>
    </div>
  );
};

describe('I18nContext', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to "en" locale', () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('restores locale from localStorage', () => {
    localStorage.setItem('aureum-locale', 'pt');
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    expect(screen.getByTestId('locale').textContent).toBe('pt');
  });

  it('setLocale updates locale and persists to localStorage', () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    act(() => screen.getByText('PT').click());
    expect(screen.getByTestId('locale').textContent).toBe('pt');
    expect(localStorage.getItem('aureum-locale')).toBe('pt');
  });

  it('provides translated strings for each locale', () => {
    render(<I18nProvider><TestConsumer /></I18nProvider>);
    const initial = screen.getByTestId('sample-text').textContent;

    act(() => screen.getByText('PT').click());
    const ptText = screen.getByTestId('sample-text').textContent;
    expect(ptText).not.toBe(initial);

    act(() => screen.getByText('ES').click());
    const esText = screen.getByTestId('sample-text').textContent;
    expect(esText).not.toBe(initial);
  });

  it('throws when useI18n is used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow('useI18n must be used within I18nProvider');
  });
});
