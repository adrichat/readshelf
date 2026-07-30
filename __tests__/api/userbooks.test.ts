import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: {
    userBook: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}))

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { PATCH, DELETE } from "@/app/api/userbooks/route"

function makeRequest(method: string, body: unknown) {
  return new NextRequest("http://localhost/api/userbooks", { method, body: JSON.stringify(body) })
}

describe("PATCH /api/userbooks", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(db.userBook.findUnique).mockReset()
    vi.mocked(db.userBook.update).mockReset()
  })

  it("returns 401 without a session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await PATCH(makeRequest("PATCH", { userBookId: "ub1", status: "READ" }))
    expect(res.status).toBe(401)
  })

  it("returns 404 instead of a Prisma error when the book isn't the user's", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    vi.mocked(db.userBook.findUnique).mockResolvedValue(null)
    const res = await PATCH(makeRequest("PATCH", { userBookId: "someone-elses-book", status: "READ" }))
    expect(res.status).toBe(404)
    expect(db.userBook.update).not.toHaveBeenCalled()
  })

  it("returns 400 for an invalid status value", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    const res = await PATCH(makeRequest("PATCH", { userBookId: "ub1", status: "NOT_A_STATUS" }))
    expect(res.status).toBe(400)
  })

  it("updates the status on the happy path", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    vi.mocked(db.userBook.findUnique).mockResolvedValue({ isFavorite: false } as never)
    vi.mocked(db.userBook.update).mockResolvedValue({ id: "ub1", status: "READ" } as never)
    const res = await PATCH(makeRequest("PATCH", { userBookId: "ub1", status: "READ" }))
    expect(res.status).toBe(200)
    expect(db.userBook.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ub1", userId: "u1" } })
    )
  })
})

describe("DELETE /api/userbooks", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(db.userBook.findUnique).mockReset()
    vi.mocked(db.userBook.delete).mockReset()
  })

  it("returns 401 without a session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await DELETE(makeRequest("DELETE", { userBookId: "ub1" }))
    expect(res.status).toBe(401)
  })

  it("returns 404 instead of a Prisma error when the book isn't the user's", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    vi.mocked(db.userBook.findUnique).mockResolvedValue(null)
    const res = await DELETE(makeRequest("DELETE", { userBookId: "someone-elses-book" }))
    expect(res.status).toBe(404)
    expect(db.userBook.delete).not.toHaveBeenCalled()
  })

  it("deletes on the happy path", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never)
    vi.mocked(db.userBook.findUnique).mockResolvedValue({ id: "ub1" } as never)
    vi.mocked(db.userBook.delete).mockResolvedValue({} as never)
    const res = await DELETE(makeRequest("DELETE", { userBookId: "ub1" }))
    expect(res.status).toBe(200)
    expect(db.userBook.delete).toHaveBeenCalledWith({ where: { id: "ub1", userId: "u1" } })
  })
})
