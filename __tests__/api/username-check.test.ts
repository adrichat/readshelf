import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: vi.fn() } },
}))

import { db } from "@/lib/db"
import { GET } from "@/app/api/username/check/route"

function makeRequest(username: string, ip: string) {
  return new NextRequest(`http://localhost/api/username/check?username=${encodeURIComponent(username)}`, {
    headers: { "x-forwarded-for": ip },
  })
}

describe("GET /api/username/check", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique).mockReset()
  })

  it("rejects reserved usernames without querying the DB", async () => {
    const res = await GET(makeRequest("admin", "10.0.0.1"))
    expect(await res.json()).toEqual({ available: false })
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })

  it("returns available: true when no user has the username", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    const res = await GET(makeRequest("newuser", "10.0.0.2"))
    expect(await res.json()).toEqual({ available: true })
  })

  it("returns available: false when the username is taken", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "u1" } as never)
    const res = await GET(makeRequest("taken", "10.0.0.3"))
    expect(await res.json()).toEqual({ available: false })
  })

  it("rate limits after 20 requests from the same IP", async () => {
    const ip = "10.0.0.4"
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
    for (let i = 0; i < 20; i++) {
      const res = await GET(makeRequest(`user${i}`, ip))
      expect(res.status).toBe(200)
    }
    const res = await GET(makeRequest("user20", ip))
    expect(res.status).toBe(429)
  })
})
