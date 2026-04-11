import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "test-user",
      email: "admin",
      username: "admin",
      app_metadata: { role: "admin" },
      user_metadata: { full_name: "Test User" },
    },
    session: {},
    loading: false,
    signIn: vi.fn(),
    completeFirstLoginPasswordChange: vi.fn(),
    changePassword: vi.fn(),
    listUsers: vi.fn(async () => ({ data: [], error: null })),
    createUser: vi.fn(async () => ({ data: null, error: null })),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
