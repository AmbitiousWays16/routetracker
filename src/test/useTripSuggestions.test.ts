import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock firebase auth
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

import { auth } from '@/lib/firebase';

type MutableAuth = { currentUser: { getIdToken: () => Promise<string> } | null };

describe('useTripSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as unknown as MutableAuth).currentUser = null;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty suggestions when user is not logged in', async () => {
    (auth as unknown as MutableAuth).currentUser = null;

    const { useTripSuggestions } = await import('@/hooks/useTripSuggestions');
    const { result } = renderHook(() => useTripSuggestions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.suggestions).toEqual([]);
  });

  it('returns empty suggestions when VITE_TRIP_SUGGESTIONS_URL is not set', async () => {
    (auth as unknown as MutableAuth).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    };

    // No URL configured
    const originalEnv = import.meta.env.VITE_TRIP_SUGGESTIONS_URL;
    // @ts-expect-error setting env for test
    import.meta.env.VITE_TRIP_SUGGESTIONS_URL = undefined;

    const { useTripSuggestions } = await import('@/hooks/useTripSuggestions');
    const { result } = renderHook(() => useTripSuggestions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.suggestions).toEqual([]);

    // @ts-expect-error restoring env
    import.meta.env.VITE_TRIP_SUGGESTIONS_URL = originalEnv;
  });

  it('returns parsed suggestions on successful API response', async () => {
    (auth as unknown as MutableAuth).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    };

    const mockSuggestions = [
      { fromAddress: 'Home', toAddress: 'Office', businessPurpose: 'Work' },
      { fromAddress: 'Office', toAddress: 'Client Site', businessPurpose: 'Client meeting' },
    ];

    // @ts-expect-error setting env for test
    import.meta.env.VITE_TRIP_SUGGESTIONS_URL = 'https://example.com/getTripSuggestions';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ suggestions: mockSuggestions }),
    });

    const { useTripSuggestions } = await import('@/hooks/useTripSuggestions');
    const { result } = renderHook(() => useTripSuggestions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.suggestions).toEqual(mockSuggestions);
  });

  it('limits suggestions to 3', async () => {
    (auth as unknown as MutableAuth).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    };

    const mockSuggestions = [
      { fromAddress: 'A', toAddress: 'B', businessPurpose: 'P1' },
      { fromAddress: 'C', toAddress: 'D', businessPurpose: 'P2' },
      { fromAddress: 'E', toAddress: 'F', businessPurpose: 'P3' },
      { fromAddress: 'G', toAddress: 'H', businessPurpose: 'P4' },
    ];

    // @ts-expect-error setting env for test
    import.meta.env.VITE_TRIP_SUGGESTIONS_URL = 'https://example.com/getTripSuggestions';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ suggestions: mockSuggestions }),
    });

    const { useTripSuggestions } = await import('@/hooks/useTripSuggestions');
    const { result } = renderHook(() => useTripSuggestions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.suggestions).toHaveLength(3);
  });

  it('returns empty suggestions when API returns non-OK response', async () => {
    (auth as unknown as MutableAuth).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    };

    // @ts-expect-error setting env for test
    import.meta.env.VITE_TRIP_SUGGESTIONS_URL = 'https://example.com/getTripSuggestions';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { useTripSuggestions } = await import('@/hooks/useTripSuggestions');
    const { result } = renderHook(() => useTripSuggestions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.suggestions).toEqual([]);
  });

  it('returns empty suggestions when fetch throws', async () => {
    (auth as unknown as MutableAuth).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    };

    // @ts-expect-error setting env for test
    import.meta.env.VITE_TRIP_SUGGESTIONS_URL = 'https://example.com/getTripSuggestions';

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { useTripSuggestions } = await import('@/hooks/useTripSuggestions');
    const { result } = renderHook(() => useTripSuggestions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.suggestions).toEqual([]);
  });

  it('filters out malformed suggestion items', async () => {
    (auth as unknown as MutableAuth).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    };

    // @ts-expect-error setting env for test
    import.meta.env.VITE_TRIP_SUGGESTIONS_URL = 'https://example.com/getTripSuggestions';

    const mixedSuggestions = [
      { fromAddress: 'Home', toAddress: 'Office', businessPurpose: 'Work' },
      { fromAddress: 'Home' }, // missing fields
      null,
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ suggestions: mixedSuggestions }),
    });

    const { useTripSuggestions } = await import('@/hooks/useTripSuggestions');
    const { result } = renderHook(() => useTripSuggestions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions[0]).toEqual({ fromAddress: 'Home', toAddress: 'Office', businessPurpose: 'Work' });
  });

  it('refetch function can be called to refresh suggestions', async () => {
    (auth as unknown as MutableAuth).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    };

    // @ts-expect-error setting env for test
    import.meta.env.VITE_TRIP_SUGGESTIONS_URL = 'https://example.com/getTripSuggestions';

    const firstSuggestions = [{ fromAddress: 'Home', toAddress: 'Office', businessPurpose: 'Work' }];
    const secondSuggestions = [{ fromAddress: 'Office', toAddress: 'Client', businessPurpose: 'Meeting' }];

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ suggestions: firstSuggestions }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ suggestions: secondSuggestions }) });

    const { useTripSuggestions } = await import('@/hooks/useTripSuggestions');
    const { result } = renderHook(() => useTripSuggestions());

    await waitFor(() => expect(result.current.suggestions).toEqual(firstSuggestions));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.suggestions).toEqual(secondSuggestions);
  });
});
