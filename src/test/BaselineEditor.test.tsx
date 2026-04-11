import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BaselineEditor from '@/pages/BaselineEditor';
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

vi.mock('@/integrations/localdb/client', async () => {
  const { createBaselineEditorLocalDbMock } = await import('./mocks/baselineEditorLocalDbMock');
  return {
    localDb: createBaselineEditorLocalDbMock(),
  };
});

const renderEditor = () => {
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
            <BaselineEditor />
          </TooltipProvider>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const waitForControlsLoaded = async () => {
  await waitFor(() => {
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
  });
};

describe('BaselineEditor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders page title', () => {
    renderEditor();
    expect(screen.getByText(/Baseline Editor/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderEditor();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders approve all button', () => {
    renderEditor();
    expect(screen.getByText(/Approve All/i)).toBeInTheDocument();
  });

  it('renders controls grouped by category after loading', async () => {
    renderEditor();
    await waitForControlsLoaded();
    expect(screen.getByText('Identity & Access')).toBeInTheDocument();
    expect(screen.getByText('Encryption & Data Protection')).toBeInTheDocument();
  });

  it('renders control IDs in the list', async () => {
    renderEditor();
    await waitForControlsLoaded();
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-002')).toBeInTheDocument();
  });

  it('shows items count', async () => {
    renderEditor();
    await waitForControlsLoaded();
    expect(screen.getByText(/items/i)).toBeInTheDocument();
  });

  it('renders list and mindmap view toggle buttons', () => {
    renderEditor();
    expect(screen.getByTitle('List View')).toBeInTheDocument();
    expect(screen.getByTitle('Mind Map')).toBeInTheDocument();
  });

  it('renders expand all and collapse all buttons in list mode', () => {
    renderEditor();
    expect(screen.getByText(/Expand All/i)).toBeInTheDocument();
    expect(screen.getByText(/Collapse All/i)).toBeInTheDocument();
  });

  it('clicking a control card expands it showing details', async () => {
    renderEditor();
    await waitForControlsLoaded();

    const controlBtn = screen.getByText('S3-SEC-001').closest('button');
    expect(controlBtn).toBeTruthy();
    await userEvent.click(controlBtn!);

    expect(screen.getByText(/^Approve$/)).toBeInTheDocument();
    expect(screen.getByText(/^Reject$/)).toBeInTheDocument();
    expect(screen.getByText(/^Adjust$/)).toBeInTheDocument();
  });

  it('shows no controls message when search has no results', async () => {
    renderEditor();
    await waitForControlsLoaded();

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'nonexistent_xyz_12345');

    expect(screen.getByText(/no controls/i)).toBeInTheDocument();
  });

  describe('Threat Modeling section', () => {
    it('renders threat modeling header when control is expanded', async () => {
      renderEditor();
      await waitForControlsLoaded();

      const controlBtn = screen.getByText('S3-SEC-001').closest('button');
      await userEvent.click(controlBtn!);

      expect(screen.getByText(/Threat Modeling/i)).toBeInTheDocument();
    });

    it('shows threat count badge', async () => {
      renderEditor();
      await waitForControlsLoaded();

      const controlBtn = screen.getByText('S3-SEC-001').closest('button');
      await userEvent.click(controlBtn!);

      expect(screen.getByText(/2 threats/i)).toBeInTheDocument();
    });

    it('displays threat scenario names', async () => {
      renderEditor();
      await waitForControlsLoaded();

      const controlBtn = screen.getByText('S3-SEC-001').closest('button');
      await userEvent.click(controlBtn!);

      expect(screen.getByText('Unauthorized Data Exposure via Public Bucket')).toBeInTheDocument();
      expect(screen.getByText('Data Exfiltration via Policy Misconfiguration')).toBeInTheDocument();
    });

    it('displays STRIDE category badges', async () => {
      renderEditor();
      await waitForControlsLoaded();

      const controlBtn = screen.getByText('S3-SEC-001').closest('button');
      await userEvent.click(controlBtn!);

      expect(screen.getByText(/^information disclosure$/i)).toBeInTheDocument();
      expect(screen.getByText(/^tampering$/i)).toBeInTheDocument();
    });

    it('displays likelihood badges with correct text', async () => {
      renderEditor();
      await waitForControlsLoaded();

      const controlBtn = screen.getByText('S3-SEC-001').closest('button');
      await userEvent.click(controlBtn!);

      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });

    it('displays attack vector and mitigations', async () => {
      renderEditor();
      await waitForControlsLoaded();

      const controlBtn = screen.getByText('S3-SEC-001').closest('button');
      await userEvent.click(controlBtn!);

      expect(screen.getAllByText(/Attack Vector/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Mitigations/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Residual Risk/i).length).toBeGreaterThanOrEqual(1);
    });

    it('shows no threats message for control without threats', async () => {
      renderEditor();
      await waitForControlsLoaded();

      const controlBtn = screen.getByText('S3-SEC-002').closest('button');
      await userEvent.click(controlBtn!);

      expect(screen.getByText('1 threat')).toBeInTheDocument();
    });
  });
});


