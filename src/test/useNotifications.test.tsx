import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useNotifications';

const mocks = vi.hoisted(() => {
  const notificationsData = [
    {
      id: 'n1',
      user_id: 'test-user',
      team_id: null,
      project_id: null,
      control_id: null,
      type: 'source_processed',
      title: 'source processed',
      message: 'source done',
      is_read: false,
      actor_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'n2',
      user_id: 'test-user',
      team_id: null,
      project_id: null,
      control_id: null,
      type: 'control_status_change',
      title: 'approved',
      message: 'approved message',
      is_read: true,
      actor_id: null,
      created_at: '2026-01-02T00:00:00.000Z',
    },
  ];

  const selectLimit = vi.fn(async () => ({ data: notificationsData, error: null }));
  const selectOrder = vi.fn(() => ({ limit: selectLimit }));
  const selectEq = vi.fn(() => ({ order: selectOrder }));
  const select = vi.fn(() => ({ eq: selectEq }));

  const updateEq = vi.fn((column: string) => {
    if (column === 'user_id') return { eq: updateEq };
    return Promise.resolve({ error: null });
  });
  const update = vi.fn(() => ({ eq: updateEq }));

  const deleteEq = vi.fn(async () => ({ error: null }));
  const deleteFn = vi.fn(() => ({ eq: deleteEq }));

  const channel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> } = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockImplementation(() => channel);
  channel.subscribe.mockImplementation(() => channel);

  return {
    authUser: { id: 'test-user' } as { id: string } | null,
    notificationsData,
    from: vi.fn(() => ({ select, update, delete: deleteFn })),
    select,
    selectEq,
    selectOrder,
    selectLimit,
    update,
    updateEq,
    deleteFn,
    deleteEq,
    channel: vi.fn(() => channel),
    channelInstance: channel,
    removeChannel: vi.fn(() => Promise.resolve('ok')),
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.authUser,
  }),
}));

vi.mock('@/integrations/localdb/client', () => ({
  localDb: {
    from: (...args: unknown[]) => mocks.from(...args),
    channel: (...args: unknown[]) => mocks.channel(...args),
    removeChannel: (...args: unknown[]) => mocks.removeChannel(...args),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useNotifications', () => {
  beforeEach(() => {
    mocks.authUser = { id: 'test-user' };
    mocks.from.mockClear();
    mocks.select.mockClear();
    mocks.selectEq.mockClear();
    mocks.selectOrder.mockClear();
    mocks.selectLimit.mockClear();
    mocks.update.mockClear();
    mocks.updateEq.mockClear();
    mocks.deleteFn.mockClear();
    mocks.deleteEq.mockClear();
    mocks.channel.mockClear();
    mocks.channelInstance.on.mockClear();
    mocks.channelInstance.subscribe.mockClear();
    mocks.removeChannel.mockClear();
  });

  it('loads notifications, computes unread count, and subscribes to realtime updates', async () => {
    const { result, unmount } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadCount).toBe(1);
    });

    expect(mocks.from).toHaveBeenCalledWith('notifications');
    expect(mocks.select).toHaveBeenCalledWith('*');
    expect(mocks.selectEq).toHaveBeenCalledWith('user_id', 'test-user');
    expect(mocks.selectOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mocks.selectLimit).toHaveBeenCalledWith(50);

    expect(mocks.channel).toHaveBeenCalledWith('notifications-realtime');
    expect(mocks.channelInstance.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'user_id=eq.test-user',
      },
      expect.any(Function)
    );
    expect(mocks.channelInstance.subscribe).toHaveBeenCalled();

    unmount();
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.channelInstance);
  });

  it('executes markAsRead, markAllAsRead, deleteNotification and clearAll mutations', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.notifications.length).toBeGreaterThan(0);
    });

    await act(async () => {
      await result.current.markAsRead.mutateAsync('n1');
    });
    expect(mocks.update).toHaveBeenCalledWith({ is_read: true });
    expect(mocks.updateEq).toHaveBeenCalledWith('id', 'n1');

    await act(async () => {
      await result.current.markAllAsRead.mutateAsync();
    });
    expect(mocks.updateEq).toHaveBeenCalledWith('user_id', 'test-user');
    expect(mocks.updateEq).toHaveBeenCalledWith('is_read', false);

    await act(async () => {
      await result.current.deleteNotification.mutateAsync('n2');
    });
    expect(mocks.deleteFn).toHaveBeenCalled();
    expect(mocks.deleteEq).toHaveBeenCalledWith('id', 'n2');

    await act(async () => {
      await result.current.clearAll.mutateAsync();
    });
    expect(mocks.deleteEq).toHaveBeenCalledWith('user_id', 'test-user');
  });

  it('stays disabled when there is no authenticated user', async () => {
    mocks.authUser = null;

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.channel).not.toHaveBeenCalled();
  });
});
