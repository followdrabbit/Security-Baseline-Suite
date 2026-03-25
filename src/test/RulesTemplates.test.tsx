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

  it('renders AI strictness options', () => {
    renderRules();
    expect(screen.getByText(/Conservative/i)).toBeInTheDocument();
    expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
    expect(screen.getByText(/Aggressive/i)).toBeInTheDocument();
  });

  it('renders save and load template buttons', () => {
    renderRules();
    expect(screen.getByText(/Save Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Load Template/i)).toBeInTheDocument();
  });

  describe('Threat Modeling rule block', () => {
    it('renders the Threat Modeling rule block', () => {
      renderRules();
      expect(screen.getByText(/Threat Modeling/i)).toBeInTheDocument();
    });

    it('expands Threat Modeling block on click to show STRIDE content', () => {
      renderRules();
      const threatBlock = screen.getByText(/Threat Modeling/i).closest('button');
      expect(threatBlock).toBeTruthy();
      act(() => threatBlock!.click());

      expect(screen.getByText(/STRIDE/i)).toBeInTheDocument();
    });

    it('shows Edit button when Threat Modeling block is expanded', () => {
      renderRules();
      const threatBlock = screen.getByText(/Threat Modeling/i).closest('button');
      act(() => threatBlock!.click());

      expect(screen.getByText(/Edit/i)).toBeInTheDocument();
    });

    it('renders all expected rule blocks', () => {
      renderRules();
      expect(screen.getByText(/Template/i)).toBeInTheDocument();
      expect(screen.getByText(/Writing Standards/i)).toBeInTheDocument();
      expect(screen.getByText(/Deduplication/i)).toBeInTheDocument();
      expect(screen.getByText(/Criticality/i)).toBeInTheDocument();
      expect(screen.getByText(/Frameworks/i)).toBeInTheDocument();
      expect(screen.getByText(/Threat Modeling/i)).toBeInTheDocument();
    });
  });
});
