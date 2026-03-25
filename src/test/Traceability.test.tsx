import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Traceability from '@/pages/Traceability';
import { I18nProvider } from '@/contexts/I18nContext';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy(actual.motion, {
      get: (_target, prop: string) => {
        const Component = ({ children, initial, animate, exit, transition, whileHover, whileTap, variants, layout, ...rest }: any) => {
          const Tag = prop as any;
          return <Tag {...rest}>{children}</Tag>;
        };
        Component.displayName = `motion.${prop}`;
        return Component;
      },
    }),
  };
});

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  Tooltip: () => null,
}));

const renderTraceability = () =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <TooltipProvider>
          <Traceability />
        </TooltipProvider>
      </I18nProvider>
    </MemoryRouter>
  );

describe('Traceability', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders page title and subtitle', () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText('Traceability')).toBeInTheDocument();
    expect(screen.getByText(/framework coverage analysis/i)).toBeInTheDocument();
  });

  it('renders framework coverage section with radar chart', () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText('Framework Coverage')).toBeInTheDocument();
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('renders all framework names in the legend', () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText('NIST')).toBeInTheDocument();
    expect(screen.getByText('CIS')).toBeInTheDocument();
    expect(screen.getByText('ISO')).toBeInTheDocument();
    expect(screen.getByText('SOC')).toBeInTheDocument();
    expect(screen.getByText('PCI')).toBeInTheDocument();
  });

  it('renders total controls count', () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText(/Total Controls: 23/)).toBeInTheDocument();
  });

  it('renders control cards with framework badges', () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    expect(screen.getByText('CIS AWS 3.0 - 2.1.4')).toBeInTheDocument();
    expect(screen.getByText('NIST 800-53 - AC-3')).toBeInTheDocument();
  });

  it('filters controls when clicking a framework button', async () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    vi.useRealTimers();

    // Click SOC framework (only 2 controls mapped)
    const socButton = screen.getByText('SOC').closest('button')!;
    await userEvent.click(socButton);

    // Should show filter indicator
    expect(screen.getByText(/Filtering by/i)).toBeInTheDocument();
    expect(screen.getByText('2 controls mapped')).toBeInTheDocument();

    // S3-SEC-001 has SOC mapping, should be visible
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();

    // S3-SEC-002 has no SOC mapping, should not be visible
    expect(screen.queryByText('S3-SEC-002')).not.toBeInTheDocument();
  });

  it('clears filter when clicking Clear button', async () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    vi.useRealTimers();

    // Apply SOC filter
    const socButton = screen.getByText('SOC').closest('button')!;
    await userEvent.click(socButton);
    expect(screen.getByText(/Filtering by/i)).toBeInTheDocument();

    // Click Clear
    const clearButton = screen.getByText('Clear');
    await userEvent.click(clearButton);

    // Filter indicator should be gone, all controls visible
    expect(screen.queryByText(/Filtering by/i)).not.toBeInTheDocument();
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-002')).toBeInTheDocument();
  });

  it('toggles filter off when clicking same framework again', async () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    vi.useRealTimers();

    const socButton = screen.getByText('SOC').closest('button')!;
    await userEvent.click(socButton);
    expect(screen.getByText(/Filtering by/i)).toBeInTheDocument();

    // Click SOC again to deselect
    await userEvent.click(socButton);
    expect(screen.queryByText(/Filtering by/i)).not.toBeInTheDocument();
  });

  it('renders click-to-filter hint text', () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText(/Click a framework to filter/i)).toBeInTheDocument();
  });

  it('renders correlated sources count per control', () => {
    renderTraceability();
    act(() => vi.advanceTimersByTime(1500));
    const sourceLabels = screen.getAllByText(/correlated sources/i);
    expect(sourceLabels.length).toBeGreaterThan(0);
  });
});
