import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const renderEditor = () =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <TooltipProvider>
          <BaselineEditor />
        </TooltipProvider>
      </I18nProvider>
    </MemoryRouter>
  );

describe('BaselineEditor', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders page title', () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByText(/Baseline Editor/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders approve all button', () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByText(/Approve All/i)).toBeInTheDocument();
  });

  it('renders controls grouped by category after loading', () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByText('Identity & Access')).toBeInTheDocument();
    expect(screen.getByText('Encryption & Data Protection')).toBeInTheDocument();
  });

  it('renders control IDs in the list', () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByText('S3-SEC-001')).toBeInTheDocument();
    expect(screen.getByText('S3-SEC-002')).toBeInTheDocument();
  });

  it('shows items count', () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByText(/items/i)).toBeInTheDocument();
  });

  it('renders list and mindmap view toggle buttons', () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByTitle('List View')).toBeInTheDocument();
    expect(screen.getByTitle('Mind Map')).toBeInTheDocument();
  });

  it('renders expand all and collapse all buttons in list mode', () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByText(/Expand All/i)).toBeInTheDocument();
    expect(screen.getByText(/Collapse All/i)).toBeInTheDocument();
  });

  it('clicking a control card expands it showing details', () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));

    const controlBtn = screen.getByText('S3-SEC-001').closest('button');
    expect(controlBtn).toBeTruthy();
    act(() => controlBtn!.click());

    // Expanded card shows action buttons
    expect(screen.getByText(/^Approve$/)).toBeInTheDocument();
    expect(screen.getByText(/^Reject$/)).toBeInTheDocument();
    expect(screen.getByText(/^Adjust$/)).toBeInTheDocument();
  });

  it('shows no controls message when search has no results', async () => {
    renderEditor();
    act(() => vi.advanceTimersByTime(1400));
    vi.useRealTimers();

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'nonexistent_xyz_12345');

    expect(screen.getByText(/no controls/i)).toBeInTheDocument();
  });
});
