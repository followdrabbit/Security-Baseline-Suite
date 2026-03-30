import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RulesTemplates from '@/pages/RulesTemplates';
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

// Mock useRuleValues to avoid needing AuthProvider/Supabase
vi.mock('@/hooks/useRuleValues', () => ({
  useRuleValues: ({ defaults }: { defaults: Record<string, string> }) => ({
    values: defaults,
    loading: false,
    saving: false,
    updateValue: vi.fn(),
    restoreOne: vi.fn(),
    restoreAll: vi.fn(),
  }),
}));

const renderRules = () =>
  render(
    <MemoryRouter>
      <I18nProvider>
        <TooltipProvider>
          <RulesTemplates />
        </TooltipProvider>
      </I18nProvider>
    </MemoryRouter>
  );

describe('RulesTemplates', () => {
  it('renders page title', () => {
    renderRules();
    expect(screen.getByText(/Rules & Templates/i)).toBeInTheDocument();
  });

  it('renders save and load template buttons', () => {
    renderRules();
    expect(screen.getByText(/Save Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Load Template/i)).toBeInTheDocument();
  });

  it('renders sidebar navigation items', () => {
    renderRules();
    expect(screen.getAllByText('Baseline Template').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Writing Standards/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Deduplication/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Criticality/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Framework Mappings/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Threat Modeling/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders AI Strictness section with options by default', () => {
    renderRules();
    expect(screen.getByText(/Conservative/i)).toBeInTheDocument();
    expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
    expect(screen.getByText(/Aggressive/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderRules();
    expect(screen.getByPlaceholderText(/Search rules/i)).toBeInTheDocument();
  });

  it('shows Edit button for active section content', () => {
    renderRules();
    const templateBtn = screen.getAllByText('Baseline Template')[0];
    act(() => templateBtn.click());
    expect(screen.getByText(/Edit/i)).toBeInTheDocument();
  });
});
