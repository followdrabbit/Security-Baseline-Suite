import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

const renderEditorWithUrl = (url: string) => {
  window.history.pushState({}, 'Test', url);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[url]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <I18nProvider>
          <TooltipProvider>
            <BaselineEditor />
          </TooltipProvider>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('BaselineEditor STRIDE URL filter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('applies tampering filter from URL and shows filtered controls', async () => {
    renderEditorWithUrl('/editor?stride=tampering');

    await waitFor(() => {
      expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    });

    expect(screen.getByText('S3-SEC-004')).toBeInTheDocument();
    expect(screen.getByText('GH-SEC-002')).toBeInTheDocument();
    expect(screen.queryByText('S3-SEC-002')).not.toBeInTheDocument();
  });

  it('applies information_disclosure filter from URL', async () => {
    renderEditorWithUrl('/editor?stride=information_disclosure');

    await waitFor(() => {
      expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    });

    expect(screen.getByText('S3-SEC-002')).toBeInTheDocument();
  });

  it('shows all controls when no stride param', async () => {
    renderEditorWithUrl('/editor');

    await waitFor(() => {
      expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    });

    expect(screen.getByText('S3-SEC-002')).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-003')).toBeInTheDocument();
  });

  it('applies denial_of_service filter from URL', async () => {
    renderEditorWithUrl('/editor?stride=denial_of_service');

    await waitFor(() => {
      expect(screen.getByText('S3-SEC-005')).toBeInTheDocument();
    });

    expect(screen.queryByText('S3-SEC-001')).not.toBeInTheDocument();
  });
});


