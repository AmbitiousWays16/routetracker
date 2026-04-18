import { vi } from 'vitest';
import { Trip, RouteMapData } from '@/types/mileage';
import { MileageVoucherRecord, VoucherStatus } from '@/types/voucher';
import { User } from 'firebase/auth';

/**
 * Mock user factory for testing
 */
export const createMockUser = (overrides?: Partial<User>): User => {
  return {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    refreshToken: 'mock-refresh-token',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'mock-id-token',
    getIdTokenResult: async () => ({
      token: 'mock-id-token',
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: 'password',
      signInSecondFactor: null,
      claims: {},
    }),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    providerId: 'firebase',
    ...overrides,
  } as User;
};

/**
 * Mock route map data factory
 */
export const createMockRouteMapData = (overrides?: Partial<RouteMapData>): RouteMapData => {
  return {
    encodedPolyline: 'mockEncodedPolyline123',
    startLat: 37.7749,
    startLng: -122.4194,
    endLat: 37.8044,
    endLng: -122.2712,
    ...overrides,
  };
};

/**
 * Mock trip factory
 */
export const createMockTrip = (overrides?: Partial<Trip>): Trip => {
  return {
    id: 'trip-123',
    date: '2024-01-15',
    fromAddress: '123 Start St, San Francisco, CA',
    toAddress: '456 End Ave, Oakland, CA',
    program: 'Health Services',
    businessPurpose: 'Client visit',
    miles: 25.5,
    routeUrl: 'https://maps.google.com/example',
    routeMapData: createMockRouteMapData(),
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
};

/**
 * Mock voucher factory
 */
export const createMockVoucher = (overrides?: Partial<MileageVoucherRecord>): MileageVoucherRecord => {
  return {
    id: 'voucher-123',
    user_id: 'test-user-id',
    month: '2024-01-01',
    total_miles: 150.5,
    status: 'draft' as VoucherStatus,
    ...overrides,
  };
};

/**
 * Mock fetch response factory
 */
export const createMockFetchResponse = (data: unknown, status = 200, ok = true) => {
  return Promise.resolve({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
    type: 'basic' as ResponseType,
    url: '',
    clone: function() { return this; },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
  } as Response);
};

/**
 * Mock Firebase Timestamp
 */
export const createMockTimestamp = (date: Date = new Date()) => ({
  toDate: () => date,
  toMillis: () => date.getTime(),
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: (date.getTime() % 1000) * 1000000,
});

/**
 * Mock Firebase auth instance
 */
export const createMockAuth = (currentUser: User | null = null) => ({
  currentUser,
  onAuthStateChanged: vi.fn((callback) => {
    callback(currentUser);
    return vi.fn(); // unsubscribe function
  }),
});
