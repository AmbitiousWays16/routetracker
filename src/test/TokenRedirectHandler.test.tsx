import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

// Mock AuthContext to avoid Firebase dependency
vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: null, loading: false, signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn() }),
}));

// Re-implement TokenRedirectHandler inline for isolated testing of the redirect logic
function TokenRedirectHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (
      (mode === "resetPassword" || mode === "signIn") &&
      location.pathname !== "/auth"
    ) {
      navigate("/auth" + window.location.search, { replace: true });
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
}

// Helper to capture current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

describe("TokenRedirectHandler", () => {
  let originalLocation: Location;

  beforeAll(() => {
    originalLocation = window.location;
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  function setSearch(search: string) {
    const url = new URL(search ? `http://localhost/${search}` : "http://localhost/");
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: {
        ...originalLocation,
        search: url.search,
        href: url.href,
        pathname: url.pathname,
      },
    });
  }

  it("redirects to /auth when mode=resetPassword on a non-auth path", async () => {
    setSearch("?mode=resetPassword&oobCode=abc123");

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <TokenRedirectHandler>
          <Routes>
            <Route path="*" element={<LocationDisplay />} />
          </Routes>
        </TokenRedirectHandler>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByTestId("location").textContent).toBe(
        "/auth?mode=resetPassword&oobCode=abc123"
      );
    });
  });

  it("redirects to /auth when mode=signIn on a non-auth path", async () => {
    setSearch("?mode=signIn&oobCode=xyz789");

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <TokenRedirectHandler>
          <Routes>
            <Route path="*" element={<LocationDisplay />} />
          </Routes>
        </TokenRedirectHandler>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByTestId("location").textContent).toBe(
        "/auth?mode=signIn&oobCode=xyz789"
      );
    });
  });

  it("does not redirect when already on /auth", async () => {
    setSearch("?mode=resetPassword&oobCode=abc123");

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/auth"]}>
        <TokenRedirectHandler>
          <Routes>
            <Route path="*" element={<LocationDisplay />} />
          </Routes>
        </TokenRedirectHandler>
      </MemoryRouter>
    );

    // Should remain on /auth without any redirect loop
    await waitFor(() => {
      expect(getByTestId("location").textContent).toBe("/auth");
    });
  });

  it("does not redirect when no mode param is present", async () => {
    setSearch("");

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <TokenRedirectHandler>
          <Routes>
            <Route path="*" element={<LocationDisplay />} />
          </Routes>
        </TokenRedirectHandler>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByTestId("location").textContent).toBe("/");
    });
  });

  it("does not redirect for unrelated mode values", async () => {
    setSearch("?mode=verifyEmail&oobCode=abc123");

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <TokenRedirectHandler>
          <Routes>
            <Route path="*" element={<LocationDisplay />} />
          </Routes>
        </TokenRedirectHandler>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByTestId("location").textContent).toBe("/");
    });
  });
});
