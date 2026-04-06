import { vi, describe, it, expect, beforeEach } from "vitest";
import { isRateLimited, rateLimitMap } from "@/lib/rateLimit";

beforeEach(() => {
  rateLimitMap.clear();
  vi.restoreAllMocks();
});

describe("isRateLimited", () => {
  it("allows the first request from an IP", () => {
    expect(isRateLimited("1.2.3.4")).toBe(false);
  });

  it("allows up to 10 requests within the window", () => {
    for (let i = 0; i < 10; i++) {
      expect(isRateLimited("1.2.3.4")).toBe(false);
    }
  });

  it("blocks the 11th request", () => {
    for (let i = 0; i < 10; i++) isRateLimited("1.2.3.4");
    expect(isRateLimited("1.2.3.4")).toBe(true);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 10; i++) isRateLimited("1.2.3.4");
    expect(isRateLimited("1.2.3.4")).toBe(true);
    expect(isRateLimited("5.6.7.8")).toBe(false); // different IP, not limited
  });

  it("resets after the window expires", () => {
    for (let i = 0; i < 11; i++) isRateLimited("1.2.3.4");
    expect(isRateLimited("1.2.3.4")).toBe(true);

    // Advance time past the 15-minute window
    const future = Date.now() + 16 * 60 * 1000;
    vi.spyOn(Date, "now").mockReturnValue(future);

    // Next call will purge the expired entry and start fresh
    expect(isRateLimited("1.2.3.4")).toBe(false);
  });

  it("purges expired entries on each call", () => {
    isRateLimited("1.2.3.4");
    isRateLimited("5.6.7.8");
    expect(rateLimitMap.size).toBe(2);

    // Advance time past the window
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 16 * 60 * 1000);

    isRateLimited("9.9.9.9"); // triggers purge

    // Old entries cleared, only new one remains
    expect(rateLimitMap.has("1.2.3.4")).toBe(false);
    expect(rateLimitMap.has("5.6.7.8")).toBe(false);
    expect(rateLimitMap.has("9.9.9.9")).toBe(true);
  });
});
