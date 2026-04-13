import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '@/components/NotificationBell';

const mocks = vi.hoisted(() => ({
  notifications: [] as Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>,
  unreadCount: 0,
  markAsReadMutate: vi.fn(),
  markAllAsReadMutate: vi.fn(),
  deleteNotificationMutate: vi.fn(),
  clearAllMutate: vi.fn(),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mocks.notifications,
    unreadCount: mocks.unreadCount,
    isLoading: false,
    markAsRead: { mutate: mocks.markAsReadMutate },
    markAllAsRead: { mutate: mocks.markAllAsReadMutate },
    deleteNotification: { mutate: mocks.deleteNotificationMutate },
    clearAll: { mutate: mocks.clearAllMutate },
  }),
}));

vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({
    t: {
      notifications: {
        title: 'Notifications',
        readAll: 'Read all',
        clear: 'Clear',
        empty: 'No notifications yet',
        clearAllTitle: 'Clear all notifications?',
        clearAllDescription: 'Clear description',
        clearAllConfirm: 'Clear all',
        cancel: 'Cancel',
      },
    },
  }),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ConfirmationModal', () => ({
  default: ({
    open,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  }) => open ? (
    <div>
      <button onClick={onConfirm}>confirm-clear</button>
      <button onClick={() => onOpenChange(false)}>close-clear</button>
    </div>
  ) : null,
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    mocks.notifications = [];
    mocks.unreadCount = 0;
    mocks.markAsReadMutate.mockReset();
    mocks.markAllAsReadMutate.mockReset();
    mocks.deleteNotificationMutate.mockReset();
    mocks.clearAllMutate.mockReset();
  });

  it('renders empty state when there are no notifications', () => {
    render(<NotificationBell />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    expect(screen.queryByText('Read all')).not.toBeInTheDocument();
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('shows unread badge with 9+ and allows marking all as read', async () => {
    const user = userEvent.setup();
    mocks.notifications = [
      {
        id: 'n1',
        type: 'control_status_change',
        title: 'approved control',
        message: 'Control approved',
        is_read: false,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    mocks.unreadCount = 12;

    render(<NotificationBell />);

    expect(screen.getByText('9+')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Read all' }));
    expect(mocks.markAllAsReadMutate).toHaveBeenCalledTimes(1);
  });

  it('marks unread notifications as read when clicked and does not mark read ones', async () => {
    const user = userEvent.setup();
    mocks.notifications = [
      {
        id: 'n-unread',
        type: 'source_processed',
        title: 'source processed',
        message: 'source ok',
        is_read: false,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'n-read',
        type: 'source_processed',
        title: 'already read',
        message: 'already read message',
        is_read: true,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    mocks.unreadCount = 1;

    render(<NotificationBell />);

    await user.click(screen.getByText('source processed'));
    expect(mocks.markAsReadMutate).toHaveBeenCalledWith('n-unread');

    await user.click(screen.getByText('already read'));
    expect(mocks.markAsReadMutate).toHaveBeenCalledTimes(1);
  });

  it('deletes a notification without triggering markAsRead', async () => {
    const user = userEvent.setup();
    mocks.notifications = [
      {
        id: 'n-delete',
        type: 'control_status_change',
        title: 'pending review',
        message: 'needs review',
        is_read: false,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    mocks.unreadCount = 1;

    render(<NotificationBell />);

    const deleteButton = screen.getAllByRole('button').find((button) =>
      button.className.includes('hover:text-destructive')
    );
    expect(deleteButton).toBeDefined();

    await user.click(deleteButton!);
    expect(mocks.deleteNotificationMutate).toHaveBeenCalledWith('n-delete');
    expect(mocks.markAsReadMutate).not.toHaveBeenCalled();
  });

  it('clears all notifications after confirmation', async () => {
    const user = userEvent.setup();
    mocks.notifications = [
      {
        id: 'n1',
        type: 'control_status_change',
        title: 'approved',
        message: 'approved message',
        is_read: true,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ];
    mocks.unreadCount = 0;

    render(<NotificationBell />);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.click(screen.getByRole('button', { name: 'confirm-clear' }));
    expect(mocks.clearAllMutate).toHaveBeenCalledTimes(1);
  });
});
