import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationModal from '@/components/ConfirmationModal';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  variant: 'approve' as const,
  title: 'Approve Control',
  description: 'Are you sure?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  onConfirm: vi.fn(),
};

describe('ConfirmationModal', () => {
  it('renders title and description when open', () => {
    render(<ConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Approve Control')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<ConfirmationModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Approve Control')).not.toBeInTheDocument();
  });

  it('renders item label when provided', () => {
    render(<ConfirmationModal {...defaultProps} itemLabel="CTR-001" />);
    expect(screen.getByText('CTR-001')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('renders cancel button with correct label', () => {
    render(<ConfirmationModal {...defaultProps} cancelLabel="Abort" />);
    expect(screen.getByText('Abort')).toBeInTheDocument();
  });

  it('renders approve variant with emerald styling', () => {
    render(<ConfirmationModal {...defaultProps} variant="approve" />);
    const btn = screen.getByText('Confirm');
    expect(btn.className).toContain('emerald');
  });

  it('renders reject variant with destructive styling', () => {
    render(<ConfirmationModal {...defaultProps} variant="reject" />);
    const btn = screen.getByText('Confirm');
    expect(btn.className).toContain('destructive');
  });

  it('renders restore variant with amber styling', () => {
    render(<ConfirmationModal {...defaultProps} variant="restore" />);
    const btn = screen.getByText('Confirm');
    expect(btn.className).toContain('amber');
  });

  it('renders approveAll variant with gold-gradient styling', () => {
    render(<ConfirmationModal {...defaultProps} variant="approveAll" />);
    const btn = screen.getByText('Confirm');
    expect(btn.className).toContain('gold-gradient');
  });
});
