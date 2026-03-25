import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

const renderEditorWithUrl = (url: string) => {
  // Set window.location.search for the component to read
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, search: new URL(url, 'http://localhost').search },
  });

  return render(
    <MemoryRouter initialEntries={[url]}>
      <I18nProvider>
        <TooltipProvider>
          <BaselineEditor />
        </TooltipProvider>
      </I18nProvider>
    </MemoryRouter>
  );
};

describe('BaselineEditor STRIDE URL filter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies tampering filter from URL and shows filtered controls', () => {
    renderEditorWithUrl('/editor?stride=tampering');
    act(() => vi.advanceTimersByTime(1400));

    // Should show only controls with tampering threats (S3-SEC-001, S3-SEC-004, GH-SEC-002)
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-004')).toBeInTheDocument();
    expect(screen.getByText('GH-SEC-002')).toBeInTheDocument();
    // S3-SEC-002 has only information_disclosure, should not appear
    expect(screen.queryByText('S3-SEC-002')).not.toBeInTheDocument();
  });

  it('applies information_disclosure filter from URL', () => {
    renderEditorWithUrl('/editor?stride=information_disclosure');
    act(() => vi.advanceTimersByTime(1400));

    // S3-SEC-001 has information_disclosure threat
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    // S3-SEC-002 has information_disclosure threat
    expect(screen.getByText('S3-SEC-002')).toBeInTheDocument();
  });

  it('shows all controls when no stride param', () => {
    renderEditorWithUrl('/editor');
    act(() => vi.advanceTimersByTime(1400));

    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-002')).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-003')).toBeInTheDocument();
  });

  it('applies denial_of_service filter from URL', () => {
    renderEditorWithUrl('/editor?stride=denial_of_service');
    act(() => vi.advanceTimersByTime(1400));

    // S3-SEC-005 has denial_of_service threat (ransomware scenario)
    expect(screen.getByText('S3-SEC-005')).toBeInTheDocument();
    // S3-SEC-001 does NOT have denial_of_service
    expect(screen.queryByText('S3-SEC-001')).not.toBeInTheDocument();
  });
});
