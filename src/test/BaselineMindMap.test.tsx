import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BaselineMindMap from '@/components/BaselineMindMap';
import type { ControlItem } from '@/types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy(actual.motion, {
      get: (_target, prop: string) => {
        // Return a simple forwardRef component for any HTML/SVG element
        const Component = ({ children, initial, animate, exit, transition, whileHover, whileTap, ...rest }: any) => {
          const Tag = prop as any;
          return <Tag {...rest}>{children}</Tag>;
        };
        Component.displayName = `motion.${prop}`;
        return Component;
      },
    }),
  };
});

const makeControl = (overrides: Partial<ControlItem> & { id: string; controlId: string; title: string; category: string }): ControlItem => ({
  projectId: 'proj-1',
  description: 'Test description',
  applicability: '',
  securityRisk: '',
  criticality: 'medium',
  defaultBehaviorLimitations: '',
  automation: '',
  references: [],
  frameworkMappings: ['NIST-1', 'ISO-2'],
  threatScenarios: [],
  sourceTraceability: [],
  confidenceScore: 0.9,
  reviewStatus: 'pending',
  reviewerNotes: '',
  version: 1,
  ...overrides,
});

const controls: ControlItem[] = [
  makeControl({ id: '1', controlId: 'S3-SEC-001', title: 'Block Public Access', criticality: 'critical', reviewStatus: 'approved', category: 'identity' }),
  makeControl({ id: '2', controlId: 'S3-SEC-002', title: 'Enable Encryption', criticality: 'high', reviewStatus: 'reviewed', category: 'encryption' }),
  makeControl({ id: '3', controlId: 'K8S-SEC-001', title: 'Enable RBAC', criticality: 'critical', reviewStatus: 'pending', category: 'identity' }),
];

const categoryLabels: Record<string, string> = {
  identity: 'Identity & Access',
  encryption: 'Encryption & Data Protection',
};

const renderMindMap = () =>
  render(<BaselineMindMap technologyName="AWS S3" controls={controls} categoryLabels={categoryLabels} />);

describe('BaselineMindMap integration', () => {
  it('renders the toolbar with zoom controls', () => {
    renderMindMap();
    expect(screen.getByRole('toolbar', { name: /mind map controls/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset view')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders the SVG with correct aria-label', () => {
    renderMindMap();
    const svgs = screen.getAllByRole('img');
    const mainSvg = svgs.find(el => el.tagName.toLowerCase() === 'svg');
    expect(mainSvg).toBeDefined();
    expect(mainSvg).toHaveAttribute('aria-label', expect.stringContaining('AWS S3'));
    expect(mainSvg).toHaveAttribute('aria-label', expect.stringContaining('3 security controls'));
    expect(mainSvg).toHaveAttribute('aria-label', expect.stringContaining('2 categories'));
  });

  it('renders all control nodes with accessible labels', () => {
    renderMindMap();
    expect(screen.getByLabelText(/Control S3-SEC-001/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Control S3-SEC-002/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Control K8S-SEC-001/)).toBeInTheDocument();
  });

  it('renders category nodes with accessible labels', () => {
    renderMindMap();
    expect(screen.getByLabelText(/Category Identity & Access/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category Encryption & Data Protection/)).toBeInTheDocument();
  });

  it('renders the search input and filter dropdowns', () => {
    renderMindMap();
    expect(screen.getByPlaceholderText('Search controls...')).toBeInTheDocument();
  });

  it('zoom in button updates the zoom percentage', () => {
    renderMindMap();
    const zoomInBtn = screen.getByLabelText('Zoom in');
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('120%')).toBeInTheDocument();
  });

  it('zoom out button updates the zoom percentage', () => {
    renderMindMap();
    const zoomOutBtn = screen.getByLabelText('Zoom out');
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('reset view returns zoom to 100%', () => {
    renderMindMap();
    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(screen.getByText('140%')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Reset view'));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('collapse all hides control nodes and changes button text', () => {
    renderMindMap();
    const collapseBtn = screen.getByLabelText('Collapse all categories');
    fireEvent.click(collapseBtn);

    // Button should now say "Expand All"
    expect(screen.getByText('Expand All')).toBeInTheDocument();
    // Control nodes should be removed from the DOM
    expect(screen.queryByLabelText(/Control S3-SEC-001/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Control S3-SEC-002/)).not.toBeInTheDocument();
  });

  it('expand all restores control nodes', () => {
    renderMindMap();
    fireEvent.click(screen.getByLabelText('Collapse all categories'));
    expect(screen.queryByLabelText(/Control S3-SEC-001/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Expand all categories'));
    expect(screen.getByLabelText(/Control S3-SEC-001/)).toBeInTheDocument();
  });

  it('clicking a control node opens the detail panel', () => {
    renderMindMap();
    const ctrlNode = screen.getByLabelText(/Control S3-SEC-001/);
    fireEvent.click(ctrlNode);

    // Detail panel should show the control title
    expect(screen.getByText('Block Public Access')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    // Framework mappings
    expect(screen.getByText('NIST-1')).toBeInTheDocument();
  });

  it('clicking the close button dismisses the detail panel', () => {
    renderMindMap();
    const ctrlNode = screen.getByLabelText(/Control S3-SEC-001/);
    fireEvent.click(ctrlNode);
    expect(screen.getByText('Test description')).toBeInTheDocument();

    // Close via the ✕ button
    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('clicking close button in detail panel closes it', () => {
    renderMindMap();
    fireEvent.click(screen.getByLabelText(/Control S3-SEC-001/));
    expect(screen.getByText('Test description')).toBeInTheDocument();

    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('search filters dim non-matching controls', async () => {
    renderMindMap();
    const searchInput = screen.getByPlaceholderText('Search controls...');
    await userEvent.type(searchInput, 'RBAC');

    // Should show filter count
    expect(screen.getByText(/1 of 3 controls/)).toBeInTheDocument();
  });

  it('clear filters button resets search', async () => {
    renderMindMap();
    const searchInput = screen.getByPlaceholderText('Search controls...');
    await userEvent.type(searchInput, 'RBAC');
    expect(screen.getByText(/1 of 3 controls/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear'));
    expect(screen.queryByText(/of 3 controls/)).not.toBeInTheDocument();
  });

  it('renders export PNG button', () => {
    renderMindMap();
    expect(screen.getByLabelText('Export mind map as PNG')).toBeInTheDocument();
  });
});
