import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { I18nProvider } from '@/contexts/I18nContext';

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

// Mock recharts completely
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  AreaChart: () => <div data-testid="area-chart" />,
  LineChart: () => <div data-testid="line-chart" />,
  BarChart: () => <div data-testid="bar-chart" />,
  Area: () => null,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <Dashboard />
      </I18nProvider>
    </MemoryRouter>
  );

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows welcome message and KPIs after loading', () => {
    renderDashboard();
    act(() => vi.advanceTimersByTime(1600));

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByText('Helena')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('181')).toBeInTheDocument();
  });

  it('renders quick action buttons with links', () => {
    renderDashboard();
    act(() => vi.advanceTimersByTime(1600));

    const createLink = screen.getByRole('link', { name: /Create New Baseline/i });
    expect(createLink).toHaveAttribute('href', '/new-project');

    const importLink = screen.getByRole('link', { name: /Import Project/i });
    expect(importLink).toHaveAttribute('href', '/export-import');
  });

  it('renders recent projects table after loading', () => {
    renderDashboard();
    act(() => vi.advanceTimersByTime(1600));

    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
    expect(screen.getByText('Amazon S3')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
  });

  it('renders activity timeline after loading', () => {
    renderDashboard();
    act(() => vi.advanceTimersByTime(1600));

    expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
    // Helena Vasquez appears multiple times in the timeline
    const helenas = screen.getAllByText('Helena Vasquez');
    expect(helenas.length).toBeGreaterThanOrEqual(1);
  });

  it('renders trend charts after loading', () => {
    renderDashboard();
    act(() => vi.advanceTimersByTime(1600));

    // Trend chart containers should be present
    const chartContainers = screen.getAllByTestId('chart-container');
    expect(chartContainers.length).toBeGreaterThan(0);
  });

  it('renders KPI change indicators', () => {
    renderDashboard();
    act(() => vi.advanceTimersByTime(1600));

    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('+47')).toBeInTheDocument();
    expect(screen.getByText('+3%')).toBeInTheDocument();
  });
});
