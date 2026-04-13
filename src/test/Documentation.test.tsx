import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Documentation from '@/pages/Documentation';
import { I18nProvider } from '@/contexts/I18nContext';

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

const renderDocumentation = (initialEntry = '/docs') => render(
  <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <I18nProvider>
      <main>
        <Documentation />
      </main>
    </I18nProvider>
  </MemoryRouter>
);

describe('Documentation', () => {
  beforeEach(() => {
    localStorage.clear();
    if (!HTMLElement.prototype.scrollTo) {
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        configurable: true,
        value: vi.fn(),
      });
    }
  });

  it('renders page title and default overview content', () => {
    renderDocumentation();
    expect(screen.getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getAllByText('Aureum Overview').length).toBeGreaterThan(0);
    expect(screen.getByText(/React frontend \+ local API \+ SQLite database/i)).toBeInTheDocument();
  });

  it('selects section from URL hash', () => {
    renderDocumentation('/docs#settings');
    expect(screen.getByText('AI Strictness Levels')).toBeInTheDocument();
    expect(screen.getAllByText(/Conservative/i).length).toBeGreaterThan(0);
  });

  it('updates active section when search has a single match', async () => {
    const user = userEvent.setup();
    renderDocumentation();

    await user.type(
      screen.getByPlaceholderText('Search documentation...'),
      'nodes zoom pan filters toolbar interactive'
    );

    await waitFor(() => {
      expect(screen.getAllByText('Mind Map').length).toBeGreaterThan(0);
      expect(screen.getByText(/hierarchical visualization of controls by category/i)).toBeInTheDocument();
    });
  });

  it('shows no-results state and clears filters', async () => {
    const user = userEvent.setup();
    renderDocumentation();

    await user.type(screen.getByPlaceholderText('Search documentation...'), 'zzzz-not-found');
    expect(screen.getByText(/No results found for/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.queryByText(/No results found for/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Aureum Overview').length).toBeGreaterThan(0);
  });

  it('navigates through search result list and scrolls main content to top', async () => {
    const user = userEvent.setup();
    const scrollToSpy = vi.spyOn(HTMLElement.prototype, 'scrollTo');
    renderDocumentation();

    const tocNav = screen.getByRole('navigation');
    const tocGettingStarted = tocNav.querySelector('button');
    expect(tocGettingStarted).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Getting Started' }));

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(screen.getAllByText('Getting Started').length).toBeGreaterThan(0);
  });
});
