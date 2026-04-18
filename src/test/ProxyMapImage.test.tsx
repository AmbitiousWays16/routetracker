import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { ProxyMapImage } from "@/components/ProxyMapImage";
import { RouteMapData } from "@/types/mileage";

// Mock firebase auth
vi.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("mock-token"),
    },
  },
}));

// Track created and revoked object URLs
const createdUrls: string[] = [];
const revokedUrls: string[] = [];

beforeEach(() => {
  createdUrls.length = 0;
  revokedUrls.length = 0;

  // Mock URL.createObjectURL / revokeObjectURL
  let urlCounter = 0;
  vi.stubGlobal(
    "URL",
    new Proxy(globalThis.URL, {
      construct(target, args) {
        return new target(...(args as [string | URL, string?]));
      },
      get(target, prop) {
        if (prop === "createObjectURL") {
          return (_blob: Blob) => {
            const url = `blob:mock-${++urlCounter}`;
            createdUrls.push(url);
            return url;
          };
        }
        if (prop === "revokeObjectURL") {
          return (url: string) => {
            revokedUrls.push(url);
          };
        }
        return Reflect.get(target, prop);
      },
    })
  );

  // Mock VITE_STATIC_MAP_PROXY_URL
  vi.stubEnv("VITE_STATIC_MAP_PROXY_URL", "https://example.com/static-map-proxy");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const mockRouteMapData: RouteMapData = {
  encodedPolyline: "abc123polyline",
  startLat: 36.1,
  startLng: -115.1,
  endLat: 36.2,
  endLng: -115.2,
};

function mockFetchSuccess() {
  const mockBlob = new Blob(["fake-image"], { type: "image/png" });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    })
  );
}

function mockFetchFailure() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })
  );
}

describe("ProxyMapImage", () => {
  it("renders loading state initially", () => {
    mockFetchSuccess();
    render(<ProxyMapImage routeMapData={mockRouteMapData} />);
    // Should show loading spinner (Loader2 icon is rendered)
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders map image after successful fetch", async () => {
    mockFetchSuccess();
    render(<ProxyMapImage routeMapData={mockRouteMapData} />);

    await waitFor(() => {
      const img = screen.getByRole("img");
      expect(img).toBeInTheDocument();
      expect(img.getAttribute("src")).toMatch(/^blob:mock-/);
    });
  });

  it("renders error state when fetch fails", async () => {
    mockFetchFailure();
    render(<ProxyMapImage routeMapData={mockRouteMapData} />);

    await waitFor(() => {
      expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    });
  });

  it("does not re-fetch when a new object with the same encodedPolyline is passed", async () => {
    mockFetchSuccess();
    const fetchSpy = vi.mocked(globalThis.fetch);

    const { rerender } = render(
      <ProxyMapImage routeMapData={mockRouteMapData} />
    );

    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Re-render with a new object that has the same encodedPolyline
    const newObjectSamePolyline: RouteMapData = {
      ...mockRouteMapData,
    };
    rerender(<ProxyMapImage routeMapData={newObjectSamePolyline} />);

    // Should NOT trigger another fetch
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("re-fetches when encodedPolyline changes", async () => {
    mockFetchSuccess();
    const fetchSpy = vi.mocked(globalThis.fetch);

    const { rerender } = render(
      <ProxyMapImage routeMapData={mockRouteMapData} />
    );

    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Re-render with a different encodedPolyline
    const differentPolyline: RouteMapData = {
      ...mockRouteMapData,
      encodedPolyline: "different-polyline-xyz",
    };
    rerender(<ProxyMapImage routeMapData={differentPolyline} />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("revokes old object URL when new image is fetched", async () => {
    mockFetchSuccess();

    const { rerender } = render(
      <ProxyMapImage routeMapData={mockRouteMapData} />
    );

    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    const firstUrl = createdUrls[0];
    expect(firstUrl).toBeDefined();

    // Change polyline to trigger re-fetch
    const differentPolyline: RouteMapData = {
      ...mockRouteMapData,
      encodedPolyline: "new-polyline",
    };
    rerender(<ProxyMapImage routeMapData={differentPolyline} />);

    await waitFor(() => {
      expect(createdUrls.length).toBe(2);
    });

    // The first URL should have been revoked when the second was set
    expect(revokedUrls).toContain(firstUrl);
  });

  it("revokes object URL on unmount", async () => {
    mockFetchSuccess();

    const { unmount } = render(
      <ProxyMapImage routeMapData={mockRouteMapData} />
    );

    await waitFor(() => {
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    const createdUrl = createdUrls[0];
    expect(createdUrl).toBeDefined();

    unmount();

    // The URL should be revoked on unmount
    expect(revokedUrls).toContain(createdUrl);
  });

  it("does not fetch when routeMapData has no encodedPolyline", async () => {
    mockFetchSuccess();
    const fetchSpy = vi.mocked(globalThis.fetch);

    // Pass an object missing encodedPolyline to test the guard check
    const incompleteData = { startLat: 36.1, startLng: -115.1, endLat: 36.2, endLng: -115.2 } as RouteMapData;
    render(
      <ProxyMapImage routeMapData={incompleteData} />
    );

    // Should show "Map unavailable" without fetching
    await waitFor(() => {
      expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows Google Maps link when routeUrl is provided and in error state", async () => {
    mockFetchFailure();
    render(
      <ProxyMapImage
        routeMapData={mockRouteMapData}
        routeUrl="https://maps.google.com/test"
      />
    );

    await waitFor(() => {
      const link = screen.getByText("View on Google Maps");
      expect(link).toBeInTheDocument();
      expect(link.getAttribute("href")).toBe("https://maps.google.com/test");
    });
  });
});
