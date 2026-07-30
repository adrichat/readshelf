import { describe, it, expect } from "vitest"
import { z } from "zod"
import { parseJsonBody } from "@/lib/api/parse-body"

const schema = z.object({ name: z.string().max(5) })

describe("parseJsonBody", () => {
  it("returns 400 invalid_json on malformed JSON", async () => {
    const req = new Request("http://localhost", { method: "POST", body: "{not json" })
    const result = await parseJsonBody(req, schema)
    expect(result.data).toBeUndefined()
    expect(result.error?.status).toBe(400)
    expect(await result.error!.json()).toEqual({ error: "invalid_json" })
  })

  it("returns 400 invalid_body when the schema fails", async () => {
    const req = new Request("http://localhost", { method: "POST", body: JSON.stringify({ name: "too long" }) })
    const result = await parseJsonBody(req, schema)
    expect(result.error?.status).toBe(400)
    expect(await result.error!.json()).toEqual({ error: "invalid_body" })
  })

  it("returns typed data when the body is valid", async () => {
    const req = new Request("http://localhost", { method: "POST", body: JSON.stringify({ name: "ok" }) })
    const result = await parseJsonBody(req, schema)
    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({ name: "ok" })
  })
})
