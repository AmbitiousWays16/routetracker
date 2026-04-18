import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendVoucherNotification, VoucherEmailPayload } from '@/lib/emailService';

// Mock firebase auth
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

// Get reference to the mocked module so we can mutate it per test
import { auth } from '@/lib/firebase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mutableAuth = auth as Record<string, any>;

describe('sendVoucherNotification', () => {
  const basePayload: VoucherEmailPayload = {
    action: 'submit',
    recipientEmail: 'supervisor@example.com',
    employeeName: 'John Doe',
    month: 'January 2026',
    totalMiles: 150,
    voucherId: 'voucher-123',
  };

  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip email when no user is authenticated', async () => {
    mutableAuth.currentUser = null;

    await sendVoucherNotification(basePayload);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('No authenticated user')
    );
  });

  it('should call cloud function with correct payload when user is authenticated', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('mock-token-123');
    mutableAuth.currentUser = { getIdToken: mockGetIdToken };

    // Set VITE_WORKER_URL for test
    const originalEnv = import.meta.env.VITE_WORKER_URL;
    import.meta.env.VITE_WORKER_URL = 'https://us-central1-test.cloudfunctions.net';

    await sendVoucherNotification(basePayload);

    expect(mockGetIdToken).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://us-central1-test.cloudfunctions.net/sendVoucherEmail',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token-123',
        }),
        body: JSON.stringify(basePayload),
      })
    );

    import.meta.env.VITE_WORKER_URL = originalEnv;
  });

  it('should not throw on network failure', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
    mutableAuth.currentUser = { getIdToken: mockGetIdToken };
    fetchSpy.mockRejectedValue(new Error('Network error'));

    import.meta.env.VITE_WORKER_URL = 'https://test.cloudfunctions.net';

    // Should not throw
    await expect(sendVoucherNotification(basePayload)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send email notification'),
      expect.any(Error)
    );
  });

  it('should log error on non-OK response but not throw', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
    mutableAuth.currentUser = { getIdToken: mockGetIdToken };
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Server error' }), { status: 502 })
    );

    import.meta.env.VITE_WORKER_URL = 'https://test.cloudfunctions.net';

    await expect(sendVoucherNotification(basePayload)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Cloud Function returned error'),
      502,
      expect.any(Object)
    );
  });

  it('should send correct payload for reject action with rejection reason', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
    mutableAuth.currentUser = { getIdToken: mockGetIdToken };

    import.meta.env.VITE_WORKER_URL = 'https://test.cloudfunctions.net';

    const rejectPayload: VoucherEmailPayload = {
      ...basePayload,
      action: 'reject',
      rejectionReason: 'Missing receipts',
    };

    await sendVoucherNotification(rejectPayload);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(rejectPayload),
      })
    );
  });
});
