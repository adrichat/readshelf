import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { rateLimit, clientIp } from "@/lib/rate-limit"

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows up to `limit` calls then blocks", () => {
    const key = "test:limit"
    expect(rateLimit(key, 3, 1000)).toBe(true)
    expect(rateLimit(key, 3, 1000)).toBe(true)
    expect(rateLimit(key, 3, 1000)).toBe(true)
    expect(rateLimit(key, 3, 1000)).toBe(false)
  })

  it("resets once the window has elapsed", () => {
    const key = "test:reset"
    expect(rateLimit(key, 1, 1000)).toBe(true)
    expect(rateLimit(key, 1, 1000)).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(rateLimit(key, 1, 1000)).toBe(true)
  })

  it("isolates counts between distinct keys", () => {
    expect(rateLimit("test:a", 1, 1000)).toBe(true)
    expect(rateLimit("test:b", 1, 1000)).toBe(true)
    expect(rateLimit("test:a", 1, 1000)).toBe(false)
    expect(rateLimit("test:b", 1, 1000)).toBe(false)
  })
})

describe("clientIp", () => {
  it("reads the first entry of x-forwarded-for", () => {
    const req = new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } })
    expect(clientIp(req)).toBe("1.2.3.4")
  })

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost", { headers: { "x-real-ip": "9.9.9.9" } })
    expect(clientIp(req)).toBe("9.9.9.9")
  })

  it('falls back to "unknown" when no proxy header is present', () => {
    const req = new Request("http://localhost")
    expect(clientIp(req)).toBe("unknown")
  })
})
