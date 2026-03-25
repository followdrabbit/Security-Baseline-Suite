import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '@/components/StatusBadge';
import { I18nProvider } from '@/contexts/I18nContext';

const renderBadge = (props: { status: string; type?: 'criticality' | 'source' | 'review' | 'project' }) =>
  render(<I18nProvider><StatusBadge {...props} /></I18nProvider>);

describe('StatusBadge', () => {
  it('renders source statuses with correct classes', () => {
    const statuses = ['pending', 'validated', 'extracting', 'normalized', 'processed', 'failed'];
    statuses.forEach((status) => {
      const { unmount } = renderBadge({ status });
      const el = screen.getByText((_, node) => node?.textContent?.toLowerCase() === status || node?.textContent === status);
      expect(el).toBeInTheDocument();
      expect(el.className).toContain('rounded-full');
      unmount();
    });
  });

  it('renders criticality statuses', () => {
    ['critical', 'high', 'medium', 'low', 'informational'].forEach((status) => {
      const { unmount } = renderBadge({ status, type: 'criticality' });
      expect(screen.getByText((_, n) => n?.textContent?.toLowerCase() === status || n?.textContent === status)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders review statuses', () => {
    ['pending', 'reviewed', 'approved', 'rejected', 'adjusted'].forEach((status) => {
      const { unmount } = renderBadge({ status, type: 'review' });
      expect(screen.getByText((_, n) => n?.textContent?.toLowerCase() === status || n?.textContent === status)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders project statuses', () => {
    ['draft', 'in_progress', 'review', 'approved', 'archived'].forEach((status) => {
      const { unmount } = renderBadge({ status, type: 'project' });
      expect(screen.getByRole('generic', { hidden: false })).toBeDefined();
      unmount();
    });
  });

  it('falls back gracefully for unknown status', () => {
    renderBadge({ status: 'unknown_status', type: 'criticality' });
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('applies destructive colors for critical criticality', () => {
    renderBadge({ status: 'critical', type: 'criticality' });
    const el = screen.getByText((_, n) => n?.textContent?.toLowerCase() === 'critical');
    expect(el.className).toContain('destructive');
  });

  it('applies success colors for approved review', () => {
    renderBadge({ status: 'approved', type: 'review' });
    const el = screen.getByText((_, n) => n?.textContent?.toLowerCase() === 'approved');
    expect(el.className).toContain('success');
  });
});
