import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiConfigService } from '@/services/aiService';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/integrations/localdb/client', () => ({
  localDb: {
    auth: {
      getUser: (...args: unknown[]) => mocks.getUser(...args),
    },
    from: (...args: unknown[]) => mocks.from(...args),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('aiConfigService', () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.from.mockReset();

    mocks.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    });
  });

  it('treats provider as configured even when enabled is false if model and key are configured', async () => {
    const rows = [
      {
        id: 'cfg-google',
        provider_id: 'google',
        enabled: false,
        selected_model: 'gemini-2.5-pro',
        is_default: true,
        api_key_encrypted: '__stored__',
        has_api_key: true,
        connection_status: 'idle',
        extra_config: {
          credential_scope: 'provider',
          endpoint_scope: 'none',
        },
      },
    ];

    mocks.from.mockImplementation((table: string) => {
      expect(table).toBe('ai_provider_configs');
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(async () => ({ data: rows, error: null })),
      };
      return query;
    });

    await expect(aiConfigService.hasConfiguredProvider()).resolves.toBe(true);
  });
});

