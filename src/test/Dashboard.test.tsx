import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Mock recharts to avoid SVG rendering issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
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

  it('shows loading skeletons initially', () => {
    renderDashboard();
    // KPI skeletons should be present (skeleton elements)
    const skeletons = document.querySelectorAll('[class*="skeleton"], [class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows welcome message and KPIs after loading', () => {
    renderDashboard();
    act(() => vi.advanceTimersByTime(1600));

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByText('Helena')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Total Projects
    expect(screen.getByText('3')).toBeInTheDocument(); // Active Baselines
    expect(screen.getByText('181')).toBeInTheDocument(); // Controls Generated
    expect(screen.getByText('91%')).toBeInTheDocument(); // Avg Confidence
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
    // Should show project names from mockData
    expect(screen.getByText('AWS S3')).toBeInTheDocument();
  });

  it('renders activity timeline after loading', () => {
    renderDashboard();
    act(() => vi.advanceTimersByTime(1600));

    expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument();
    expect(screen.getByText('Helena Vasquez')).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
  });

  it('renders trend chart period selectors', () => {
    renderDashboard();
    act(() => vi.advanceTimersByTime(1600));

    // Should have period buttons (7D, 30D, 90D appear twice - controls + confidence)
    const buttons7d = screen.getAllByText('7D');
    expect(buttons7d.length).toBe(2);
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
