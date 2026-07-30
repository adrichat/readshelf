import { NextResponse } from "next/server"
import type { ZodType } from "zod"

type ParseResult<T> = { data: T; error?: undefined } | { data?: undefined; error: NextResponse }

// Centralise le point qui plantait en 500 partout : un `await req.json()` sans
// try/catch sur un body malformé, plus l'absence de validation de forme/longueur.
export async function parseJsonBody<T>(req: Request, schema: ZodType<T>): Promise<ParseResult<T>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { error: NextResponse.json({ error: "invalid_json" }, { status: 400 }) }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return { error: NextResponse.json({ error: "invalid_body" }, { status: 400 }) }
  }

  return { data: result.data }
}
