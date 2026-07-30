import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    profile: { upsert: vi.fn() },
  },
}))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn(() => true) }))

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { PATCH } from "@/app/api/profile/route"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/profile", { method: "PATCH", body: JSON.stringify(body) })
}

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(db.user.findUnique).mockReset()
    vi.mocked(db.profile.upsert).mockReset()
  })

  it("returns 401 without a session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await PATCH(makeRequest({ accentColor: "#ffffff" }))
    expect(res.status).toBe(401)
  })

  it("returns 403 when a premium field is set on a non-premium account", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({ isPremium: false } as never)
    const res = await PATCH(makeRequest({ seoTitle: "My profile" }))
    expect(res.status).toBe(403)
  })

  it("returns 400 for an invalid accent color", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    const res = await PATCH(makeRequest({ accentColor: "not-a-color" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when seoTitle exceeds the length limit", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    const res = await PATCH(makeRequest({ seoTitle: "a".repeat(61) }))
    expect(res.status).toBe(400)
  })

  it("updates the profile on the happy path", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    vi.mocked(db.profile.upsert).mockResolvedValue({ accentColor: "#ffffff" } as never)
    const res = await PATCH(makeRequest({ accentColor: "#ffffff" }))
    expect(res.status).toBe(200)
    expect(db.profile.upsert).toHaveBeenCalled()
  })
})
