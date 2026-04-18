import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockUser, createMockRouteMapData } from './fixtures/mockData';

// Mock Firebase auth module
const mockAuth = {
  currentUser: null as ReturnType<typeof createMockUser> | null,
};

vi.mock('@/lib/firebase', () => ({
  auth: mockAuth,
}));

const { fetchMapImageAsBase64 } = await import('@/lib/mapUtils');

describe('mapUtils', () => {
  let mockUser: ReturnType<typeof createMockUser>;
  let originalFetch: typeof global.fetch;
  let originalFileReader: typeof global.FileReader;

  beforeEach(() => {
    mockUser = createMockUser();
    originalFetch = global.fetch;
    originalFileReader = global.FileReader;

    // Mock environment variable
    vi.stubEnv('VITE_WORKER_URL', 'https://worker.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    global.fetch = originalFetch;
    global.FileReader = originalFileReader;
    mockAuth.currentUser = null;
  });

  describe('fetchMapImageAsBase64', () => {
    it('should return null when no user is authenticated', async () => {
      mockAuth.currentUser = null;

      const routeMapData = createMockRouteMapData();
      const result = await fetchMapImageAsBase64(routeMapData);

      expect(result).toBeNull();
    });

    it('should successfully fetch and convert map image to base64', async () => {
      mockAuth.currentUser = mockUser;

      // Mock the blob data
      const mockBlob = new Blob(['test-image-data'], { type: 'image/png' });

      // Mock fetch response
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => mockBlob,
        } as Response)
      );

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(function(this: { result: string | ArrayBuffer | null; onloadend: ((ev: ProgressEvent<FileReader>) => void) | null }) {
          // Simulate async FileReader behavior
          setTimeout(() => {
            this.result = 'data:image/png;base64,dGVzdC1pbWFnZS1kYXRh';
            if (this.onloadend) this.onloadend({} as ProgressEvent<FileReader>);
          }, 0);
        }),
        onloadend: null as ((ev: ProgressEvent<FileReader>) => void) | null,
        result: null as string | ArrayBuffer | null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = vi.fn(() => mockFileReader) as any;

      const routeMapData = createMockRouteMapData();
      const result = await fetchMapImageAsBase64(routeMapData);

      expect(global.fetch).toHaveBeenCalled();
      expect(result).toBe('data:image/png;base64,dGVzdC1pbWFnZS1kYXRh');
    });

    it('should build correct URL with route map parameters', async () => {
      mockAuth.currentUser = mockUser;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob([]),
        } as Response)
      );

      const mockFileReader = {
        readAsDataURL: vi.fn(function(this: { result: string | ArrayBuffer | null; onloadend: ((ev: ProgressEvent<FileReader>) => void) | null }) {
          setTimeout(() => {
            this.result = 'data:image/png;base64,test';
            if (this.onloadend) this.onloadend({} as ProgressEvent<FileReader>);
          }, 0);
        }),
        onloadend: null as ((ev: ProgressEvent<FileReader>) => void) | null,
        result: null as string | ArrayBuffer | null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = vi.fn(() => mockFileReader) as any;

      const routeMapData = createMockRouteMapData({
        encodedPolyline: 'testPolyline',
        startLat: 10.5,
        startLng: 20.5,
        endLat: 30.5,
        endLng: 40.5,
      });

      await fetchMapImageAsBase64(routeMapData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('polyline=testPolyline'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-id-token',
          }),
        })
      );
    });

    it('should return null when fetch fails', async () => {
      mockAuth.currentUser = mockUser;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response)
      );

      const routeMapData = createMockRouteMapData();
      const result = await fetchMapImageAsBase64(routeMapData);

      expect(result).toBeNull();
    });

    it('should return null when an exception occurs', async () => {
      mockAuth.currentUser = mockUser;

      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const routeMapData = createMockRouteMapData();
      const result = await fetchMapImageAsBase64(routeMapData);

      expect(result).toBeNull();
    });

    it('should include authorization header with user token', async () => {
      mockAuth.currentUser = mockUser;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob([]),
        } as Response)
      );

      const mockFileReader = {
        readAsDataURL: vi.fn(function(this: { result: string | ArrayBuffer | null; onloadend: ((ev: ProgressEvent<FileReader>) => void) | null }) {
          setTimeout(() => {
            this.result = 'data:image/png;base64,test';
            if (this.onloadend) this.onloadend({} as ProgressEvent<FileReader>);
          }, 0);
        }),
        onloadend: null as ((ev: ProgressEvent<FileReader>) => void) | null,
        result: null as string | ArrayBuffer | null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      global.FileReader = vi.fn(() => mockFileReader) as any;

      const routeMapData = createMockRouteMapData();
      await fetchMapImageAsBase64(routeMapData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer mock-id-token',
          },
        })
      );
    });
  });
});
