import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { I18nProvider } from '@/contexts/I18nContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Area: () => null,
  Line: () => null,
  Bar: ({ children }: any) => <>{children}</>,
  Radar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@aureum.com', user_metadata: { full_name: 'Test User' } },
    session: {},
    loading: false,
  }),
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        order: () => Promise.resolve({
          data: table === 'projects' ? [
            { id: '1', name: 'Demo Project', technology: 'AWS S3', status: 'in_progress', control_count: 7, avg_confidence: 85, updated_at: new Date().toISOString(), vendor: 'AWS', tags: [] },
          ] : [
            { id: 'c1', control_id: 'S3-001', title: 'Test', confidence_score: 85, threat_scenarios: [{ strideCategory: 'spoofing' }], review_status: 'pending' },
          ],
          error: null,
        }),
      }),
    }),
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }), getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

const renderDashboard = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <I18nProvider>
          <Dashboard />
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows welcome message with user name after loading', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('renders quick action buttons with links', async () => {
    renderDashboard();
    await waitFor(() => {
      const createLink = screen.getByRole('link', { name: /Create New Baseline/i });
      expect(createLink).toHaveAttribute('href', '/new-project');
    });
  });

  it('renders real project data after loading', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Demo Project')).toBeInTheDocument();
    });
  });

  it('renders STRIDE threat distribution chart section', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Threat Distribution by STRIDE')).toBeInTheDocument();
    });
  });
});
