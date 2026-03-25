import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import StatusBadge from '@/components/StatusBadge';
import { I18nProvider } from '@/contexts/I18nContext';

const renderBadge = (props: { status: string; type?: 'criticality' | 'source' | 'review' | 'project' }) =>
  render(<I18nProvider><StatusBadge {...props} /></I18nProvider>);

describe('StatusBadge', () => {
  it('renders source statuses', () => {
    ['pending', 'validated', 'extracting', 'normalized', 'processed', 'failed'].forEach((status) => {
      const { container, unmount } = renderBadge({ status });
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span?.className).toContain('rounded-full');
      unmount();
    });
  });

  it('renders criticality statuses', () => {
    ['critical', 'high', 'medium', 'low', 'informational'].forEach((status) => {
      const { container, unmount } = renderBadge({ status, type: 'criticality' });
      expect(container.querySelector('span')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders review statuses', () => {
    ['pending', 'reviewed', 'approved', 'rejected', 'adjusted'].forEach((status) => {
      const { container, unmount } = renderBadge({ status, type: 'review' });
      expect(container.querySelector('span')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders project statuses', () => {
    ['draft', 'in_progress', 'review', 'approved', 'archived'].forEach((status) => {
      const { container, unmount } = renderBadge({ status, type: 'project' });
      expect(container.querySelector('span')).toBeInTheDocument();
      unmount();
    });
  });

  it('falls back gracefully for unknown status', () => {
    const { container } = renderBadge({ status: 'unknown_status', type: 'criticality' });
    expect(container.querySelector('span')?.textContent).toBe('unknown_status');
  });

  it('applies destructive colors for critical criticality', () => {
    const { container } = renderBadge({ status: 'critical', type: 'criticality' });
    expect(container.querySelector('span')?.className).toContain('destructive');
  });

  it('applies success colors for approved review', () => {
    const { container } = renderBadge({ status: 'approved', type: 'review' });
    expect(container.querySelector('span')?.className).toContain('success');
  });

  it('applies warning colors for high criticality', () => {
    const { container } = renderBadge({ status: 'high', type: 'criticality' });
    expect(container.querySelector('span')?.className).toContain('warning');
  });

  it('applies failed/destructive colors for source failed', () => {
    const { container } = renderBadge({ status: 'failed' });
    expect(container.querySelector('span')?.className).toContain('destructive');
  });
});
