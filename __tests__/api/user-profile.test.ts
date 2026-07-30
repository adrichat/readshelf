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
import { PATCH } from "@/app/api/user/profile/route"

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/user/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

function makeRawRequest(rawBody: string) {
  return new NextRequest("http://localhost/api/user/profile", { method: "PATCH", body: rawBody })
}

describe("PATCH /api/user/profile", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(db.user.update).mockReset()
  })

  it("returns 401 without a session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await PATCH(makeRequest({ displayName: "Bob" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 on malformed JSON", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    const res = await PATCH(makeRawRequest("{not json"))
    expect(res.status).toBe(400)
  })

  it("returns 400 when bio exceeds the length limit", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    const res = await PATCH(makeRequest({ bio: "a".repeat(201) }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for an invalid avatar image", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    const res = await PATCH(makeRequest({ image: "not-a-data-url" }))
    expect(res.status).toBe(400)
  })

  it("updates displayName/bio on the happy path", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    vi.mocked(db.user.update).mockResolvedValue({ displayName: "Bob", bio: "hi", image: null } as never)
    const res = await PATCH(makeRequest({ displayName: "Bob", bio: "hi" }))
    expect(res.status).toBe(200)
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({ displayName: "Bob", bio: "hi" }),
      })
    )
  })
})
