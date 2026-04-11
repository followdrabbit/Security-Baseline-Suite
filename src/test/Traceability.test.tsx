import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const mockControls = [
  {
    id: 'ctrl-001',
    user_id: 'test-user',
    project_id: 'proj-1',
    control_id: 'S3-SEC-001',
    title: 'Block Public Access',
    description: 'Prevent public bucket policies',
    applicability: 'All buckets',
    security_risk: 'High risk of data exposure',
    criticality: 'high',
    default_behavior_limitations: '',
    automation: '',
    references: [],
    framework_mappings: ['CIS AWS 3.0 - 2.1.4', 'NIST 800-53 - AC-3', 'SOC 2 - CC6.1'],
    threat_scenarios: [],
    source_traceability: [
      {
        sourceId: 'src-001',
        sourceName: 'AWS S3 Docs',
        sourceType: 'url',
        excerpt: 'Enable Block Public Access at account level.',
        confidence: 0.95,
      },
    ],
    confidence_score: 0.93,
    review_status: 'pending',
    reviewer_notes: '',
    version: 1,
    category: 'identity',
  },
  {
    id: 'ctrl-002',
    user_id: 'test-user',
    project_id: 'proj-1',
    control_id: 'S3-SEC-002',
    title: 'Enable Default Encryption',
    description: 'Encrypt objects at rest',
    applicability: 'All buckets',
    security_risk: 'Unencrypted data storage',
    criticality: 'high',
    default_behavior_limitations: '',
    automation: '',
    references: [],
    framework_mappings: ['NIST 800-53 - SC-13', 'ISO 27001 - A.10.1.1'],
    threat_scenarios: [],
    source_traceability: [
      {
        sourceId: 'src-002',
        sourceName: 'CIS Benchmark',
        sourceType: 'document',
        excerpt: 'S3 bucket encryption should be enabled.',
        confidence: 0.9,
      },
    ],
    confidence_score: 0.88,
    review_status: 'pending',
    reviewer_notes: '',
    version: 1,
    category: 'encryption',
  },
  {
    id: 'ctrl-003',
    user_id: 'test-user',
    project_id: 'proj-1',
    control_id: 'S3-SEC-003',
    title: 'Audit Access Logs',
    description: 'Log access events',
    applicability: 'All buckets',
    security_risk: 'Undetected misuse',
    criticality: 'medium',
    default_behavior_limitations: '',
    automation: '',
    references: [],
    framework_mappings: ['PCI DSS 4.0 - 10.2.1', 'SOC 2 - CC7.2'],
    threat_scenarios: [],
    source_traceability: [
      {
        sourceId: 'src-003',
        sourceName: 'SOC Guidance',
        sourceType: 'document',
        excerpt: 'Security monitoring is required.',
        confidence: 0.86,
      },
    ],
    confidence_score: 0.84,
    review_status: 'pending',
    reviewer_notes: '',
    version: 1,
    category: 'logging',
  },
  ...Array.from({ length: 20 }, (_, i) => {
    const idx = i + 4;
    const mappings = [
      'NIST 800-53 - AC-2',
      'CIS AWS 3.0 - 3.1.1',
      'ISO 27001 - A.8.2.3',
      'PCI DSS 4.0 - 7.2.1',
    ];
    return {
      id: `ctrl-${idx.toString().padStart(3, '0')}`,
      user_id: 'test-user',
      project_id: 'proj-1',
      control_id: `S3-SEC-${idx.toString().padStart(3, '0')}`,
      title: `Mock Control ${idx}`,
      description: 'Generated for test coverage',
      applicability: 'Project scope',
      security_risk: 'Medium',
      criticality: 'medium',
      default_behavior_limitations: '',
      automation: '',
      references: [],
      framework_mappings: [mappings[i % mappings.length]],
      threat_scenarios: [],
      source_traceability: [
        {
          sourceId: `src-${idx.toString().padStart(3, '0')}`,
          sourceName: 'Mock Source',
          sourceType: 'document',
          excerpt: 'Supporting evidence',
          confidence: 0.8,
        },
      ],
      confidence_score: 0.8,
      review_status: 'pending',
      reviewer_notes: '',
      version: 1,
      category: 'identity',
    };
  }),
];

vi.mock('@/integrations/localdb/client', () => ({
  localDb: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: async () => ({
            data: table === 'controls' ? mockControls : [],
            error: null,
          }),
        }),
      }),
    }),
  },
}));

const renderTraceability = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <I18nProvider>
          <TooltipProvider>
            <Traceability />
          </TooltipProvider>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const waitForDataLoaded = async () => {
  await waitFor(() => {
    expect(screen.getByText('Framework Coverage')).toBeInTheDocument();
    expect(screen.getByText(/Total Controls: 23/)).toBeInTheDocument();
  });
};

describe('Traceability', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders page title and subtitle', async () => {
    renderTraceability();
    await waitFor(() => {
      expect(screen.getByText('Traceability')).toBeInTheDocument();
      expect(screen.getByText(/framework coverage analysis/i)).toBeInTheDocument();
    });
  });

  it('renders framework coverage section with radar chart', async () => {
    renderTraceability();
    await waitForDataLoaded();
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('renders all framework names in the legend', async () => {
    renderTraceability();
    await waitForDataLoaded();
    expect(screen.getByText('NIST')).toBeInTheDocument();
    expect(screen.getByText('CIS')).toBeInTheDocument();
    expect(screen.getByText('ISO')).toBeInTheDocument();
    expect(screen.getByText('SOC')).toBeInTheDocument();
    expect(screen.getByText('PCI')).toBeInTheDocument();
  });

  it('renders total controls count', async () => {
    renderTraceability();
    await waitForDataLoaded();
    expect(screen.getByText(/Total Controls: 23/)).toBeInTheDocument();
  });

  it('renders control cards with framework badges', async () => {
    renderTraceability();
    await waitForDataLoaded();
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    expect(screen.getByText('CIS AWS 3.0 - 2.1.4')).toBeInTheDocument();
    expect(screen.getAllByText('NIST 800-53 - AC-3').length).toBeGreaterThanOrEqual(1);
  });

  it('filters controls when clicking a framework button', async () => {
    renderTraceability();
    await waitForDataLoaded();

    const socButton = screen.getByText('SOC').closest('button')!;
    await userEvent.click(socButton);

    expect(screen.getByText(/Filtering by/i)).toBeInTheDocument();
    expect(screen.getByText(/2 controls mapped/i)).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    expect(screen.queryByText('S3-SEC-002')).not.toBeInTheDocument();
  });

  it('clears filter when clicking Clear button', async () => {
    renderTraceability();
    await waitForDataLoaded();

    const socButton = screen.getByText('SOC').closest('button')!;
    await userEvent.click(socButton);
    expect(screen.getByText(/Filtering by/i)).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await userEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText(/Filtering by/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-002')).toBeInTheDocument();
  });

  it('toggles filter off when clicking same framework again', async () => {
    renderTraceability();
    await waitForDataLoaded();

    const allSoc = screen.getAllByText('SOC');
    await userEvent.click(allSoc[0].closest('button')!);
    expect(screen.getByText(/Filtering by/i)).toBeInTheDocument();

    const socButtons = screen.getAllByText('SOC');
    const legendBtn = socButtons.find(el => el.closest('button')?.classList.contains('rounded-lg'));
    await userEvent.click(legendBtn!.closest('button')!);

    await waitFor(() => {
      expect(screen.queryByText(/Filtering by/i)).not.toBeInTheDocument();
    });
  });

  it('renders click-to-filter hint text', async () => {
    renderTraceability();
    await waitForDataLoaded();
    expect(screen.getByText(/Click a framework to filter/i)).toBeInTheDocument();
  });

  it('renders correlated sources count per control', async () => {
    renderTraceability();
    await waitForDataLoaded();
    const sourceLabels = screen.getAllByText(/correlated sources/i);
    expect(sourceLabels.length).toBeGreaterThan(0);
  });
});


